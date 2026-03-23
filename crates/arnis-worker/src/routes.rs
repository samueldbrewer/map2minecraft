use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, StatusCode},
    response::{
        sse::{Event, Sse},
        IntoResponse, Json, Response,
    },
    routing::{get, post},
    Router,
};
use futures::stream::Stream;
use std::convert::Infallible;
use std::time::Duration;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::jobs::{GenerateRequest, JobStatus};
use crate::storage;
use crate::AppState;

pub fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health_check))
        .route("/api/generate", post(generate))
        .route("/api/status/{job_id}", get(job_status_sse))
        .route("/api/preview/{job_id}", get(get_preview))
        .route("/api/download/{job_id}", get(download))
        .route("/api/bluemap/{job_id}", get(bluemap_index))
        .route("/api/bluemap/{job_id}/{*path}", get(bluemap_file))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn health_check() -> &'static str {
    "OK"
}

async fn generate(
    State(state): State<AppState>,
    Json(request): Json<GenerateRequest>,
) -> impl IntoResponse {
    // Validate bbox
    if request.bbox.len() != 4 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid bbox: must be [min_lat, min_lng, max_lat, max_lng]"})),
        ).into_response();
    }

    // Create job
    let job = {
        let mut store = state.jobs.write().await;
        store.create_job(request.clone())
    };

    let job_id = job.id.clone();

    // Spawn background task to process the job
    let state_clone = state.clone();
    tokio::spawn(async move {
        process_job(state_clone, job_id).await;
    });

    (
        StatusCode::ACCEPTED,
        Json(serde_json::json!({
            "job_id": job.id,
            "status": "queued"
        })),
    ).into_response()
}

async fn process_job(state: AppState, job_id: String) {
    // Update status to processing
    {
        let mut store = state.jobs.write().await;
        store.update_job(&job_id, |job| {
            job.status = JobStatus::Processing;
            job.progress = 5.0;
            job.message = "Fetching map data...".to_string();
        });
    }

    let request = {
        let store = state.jobs.read().await;
        match store.get_job(&job_id) {
            Some(job) => job.request.clone(),
            None => return,
        }
    };

    // Create output directory
    let world_dir = state.config.data_dir.join(&job_id);
    if let Err(e) = std::fs::create_dir_all(&world_dir) {
        let mut store = state.jobs.write().await;
        store.update_job(&job_id, |job| {
            job.status = JobStatus::Failed;
            job.error = Some(format!("Failed to create world directory: {}", e));
        });
        return;
    }

    // Run the generation in a blocking task since arnis-core uses blocking I/O
    let world_dir_clone = world_dir.clone();
    let state_clone = state.clone();
    let job_id_clone = job_id.clone();

    // Progress channel: blocking task sends updates, async task writes to job store
    let (progress_tx, mut progress_rx) = tokio::sync::mpsc::channel::<(f64, String)>(32);
    let state_for_progress = state.clone();
    let job_id_for_progress = job_id.clone();
    tokio::spawn(async move {
        while let Some((progress, message)) = progress_rx.recv().await {
            let mut store = state_for_progress.jobs.write().await;
            store.update_job(&job_id_for_progress, |job| {
                job.progress = progress;
                job.message = message;
            });
        }
    });

    let result = tokio::task::spawn_blocking(move || {
        run_generation(request, world_dir_clone, progress_tx)
    }).await;

    match result {
        Ok(Ok(world_path)) => {
            // Generate preview data
            {
                let mut store = state_clone.jobs.write().await;
                store.update_job(&job_id_clone, |job| {
                    job.status = JobStatus::GeneratingPreview;
                    job.progress = 90.0;
                    job.message = "Generating preview...".to_string();
                });
            }

            // Create zip file for download
            let zip_path = world_dir.join("world.zip");
            if let Err(e) = storage::create_world_zip(&world_path, &zip_path) {
                tracing::warn!("Failed to create zip: {}", e);
            }

            // Run BlueMap render (Java Edition only; skip for Bedrock)
            let is_bedrock = {
                let store = state_clone.jobs.read().await;
                store.get_job(&job_id_clone)
                    .map(|j| j.request.bedrock.unwrap_or(false))
                    .unwrap_or(false)
            };

            let bluemap_webroot = if !is_bedrock {
                {
                    let mut store = state_clone.jobs.write().await;
                    store.update_job(&job_id_clone, |job| {
                        job.status = JobStatus::GeneratingPreview;
                        job.progress = 92.0;
                        job.message = "Rendering interactive map preview...".to_string();
                    });
                }

                let world_path_clone = world_path.clone();
                let cache_dir = state_clone.config.bluemap_cache_dir.clone();
                let job_id_bm = job_id_clone.clone();
                let bm_result = tokio::task::spawn_blocking(move || {
                    crate::bluemap::render_world(&world_path_clone, &job_id_bm, &cache_dir)
                }).await;

                match bm_result {
                    Ok(Ok(webroot)) => {
                        tracing::info!("BlueMap render complete: {}", webroot.display());
                        Some(webroot.to_string_lossy().to_string())
                    }
                    Ok(Err(e)) => {
                        tracing::warn!("BlueMap render failed (non-fatal): {}", e);
                        None
                    }
                    Err(e) => {
                        tracing::warn!("BlueMap task panicked (non-fatal): {}", e);
                        None
                    }
                }
            } else {
                None
            };

            {
                let mut store = state_clone.jobs.write().await;
                store.update_job(&job_id_clone, |job| {
                    job.status = JobStatus::Completed;
                    job.progress = 100.0;
                    job.message = "World generation complete!".to_string();
                    job.world_path = Some(world_path.to_string_lossy().to_string());
                    job.bluemap_webroot = bluemap_webroot.clone();
                });
            }
        }
        Ok(Err(e)) => {
            let mut store = state_clone.jobs.write().await;
            store.update_job(&job_id_clone, |job| {
                job.status = JobStatus::Failed;
                job.error = Some(e);
                job.message = "Generation failed".to_string();
            });
        }
        Err(e) => {
            let mut store = state_clone.jobs.write().await;
            store.update_job(&job_id_clone, |job| {
                job.status = JobStatus::Failed;
                job.error = Some(format!("Task panicked: {}", e));
                job.message = "Generation failed".to_string();
            });
        }
    }
}

fn run_generation(
    request: crate::jobs::GenerateRequest,
    world_dir: std::path::PathBuf,
    progress_tx: tokio::sync::mpsc::Sender<(f64, String)>,
) -> Result<std::path::PathBuf, String> {
    use arnis_core::*;

    let update = |p: f64, m: &str| {
        let _ = progress_tx.blocking_send((p, m.to_string()));
    };

    let bbox_str = format!(
        "{},{},{},{}",
        request.bbox[0], request.bbox[1], request.bbox[2], request.bbox[3]
    );

    let bbox = coordinate_system::geographic::LLBBox::from_str(&bbox_str)
        .map_err(|e| format!("Invalid bbox: {}", e))?;

    let scale = request.scale.unwrap_or(1.0);
    let is_bedrock = request.bedrock.unwrap_or(false);

    // [1/7] Fetch OSM data
    update(5.0, "[1/7] Fetching map data...");
    let raw_data = retrieve_data::fetch_data_from_overpass(bbox, false, "requests", None)
        .map_err(|e| format!("Failed to fetch data: {}", e))?;

    // Create Args-like config
    let args = args::Args {
        bbox,
        file: None,
        save_json_file: None,
        path: Some(world_dir.clone()),
        bedrock: is_bedrock,
        downloader: "requests".to_string(),
        scale,
        ground_level: -62,
        terrain: request.terrain.unwrap_or(true),
        interior: request.interior.unwrap_or(true),
        roof: request.roof.unwrap_or(true),
        fillground: request.fillground.unwrap_or(false),
        city_boundaries: request.city_boundaries.unwrap_or(true),
        debug: false,
        timeout: request.timeout.map(std::time::Duration::from_secs),
        spawn_lat: request.spawn_lat,
        spawn_lng: request.spawn_lng,
    };

    // [2/7] Parse OSM data
    update(12.0, "[2/7] Parsing map data...");
    let (mut parsed_elements, mut xzbbox) =
        osm_parser::parse_osm_data(raw_data, args.bbox, args.scale, args.debug);
    parsed_elements.sort_by_key(|element| osm_parser::get_priority(element));

    // [3/7] Fetch elevation / generate terrain
    update(18.0, "[3/7] Generating terrain...");
    let ground = ground::generate_ground_data(&args)
        .map_err(|e| format!("Terrain error: {}", e))?;

    // [4/7] Transform map
    update(25.0, "[4/7] Transforming map...");
    map_transformation::transform_map(&mut parsed_elements, &mut xzbbox, &mut ground.clone());

    // [5/7] Prepare world
    update(30.0, "[5/7] Preparing world...");
    let world_format = if is_bedrock {
        world_editor::WorldFormat::BedrockMcWorld
    } else {
        world_editor::WorldFormat::JavaAnvil
    };

    let generation_path = if is_bedrock {
        let (output_path, _) = world_utils::build_bedrock_output(&bbox, world_dir.clone());
        output_path
    } else {
        match world_utils::create_new_world(&world_dir) {
            Ok(path) => std::path::PathBuf::from(path),
            Err(e) => return Err(format!("Failed to create world: {}", e)),
        }
    };

    let spawn_point: Option<(i32, i32)> = match (request.spawn_lat, request.spawn_lng) {
        (Some(lat), Some(lng)) => {
            use arnis_core::coordinate_system::geographic::LLPoint;
            use arnis_core::coordinate_system::transformation::CoordTransformer;

            let llpoint = LLPoint::new(lat, lng).map_err(|e| format!("Invalid spawn: {}", e))?;
            let (transformer, _) = CoordTransformer::llbbox_to_xzbbox(&bbox, scale)
                .map_err(|e| format!("Transform error: {}", e))?;
            let xzpoint = transformer.transform_point(llpoint);
            Some((xzpoint.x, xzpoint.z))
        }
        _ => None,
    };

    let options = data_processing::GenerationOptions {
        path: generation_path.clone(),
        format: world_format,
        level_name: if is_bedrock { Some("Map2Minecraft World".to_string()) } else { None },
        spawn_point,
    };

    // [6/7] Generate world (buildings, roads, terrain fill, ground)
    update(35.0, "[6/7] Building world...");
    let result = data_processing::generate_world_with_options(
        parsed_elements,
        xzbbox,
        bbox,
        ground,
        &args,
        options,
    );

    // [7/7] Done
    update(88.0, "[7/7] Finalizing...");
    result
}

async fn job_status_sse(
    Path(job_id): Path<String>,
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = async_stream::stream! {
        let mut last_progress = -1.0f64;
        loop {
            let job = {
                let store = state.jobs.read().await;
                store.get_job(&job_id).cloned()
            };

            match job {
                Some(job) => {
                    if (job.progress - last_progress).abs() > 0.1 || job.status == JobStatus::Completed || job.status == JobStatus::Failed {
                        last_progress = job.progress;
                        let data = serde_json::json!({
                            "status": job.status,
                            "progress": job.progress,
                            "message": job.message,
                            "error": job.error,
                        });
                        yield Ok(Event::default().data(data.to_string()));
                    }

                    if job.status == JobStatus::Completed || job.status == JobStatus::Failed {
                        break;
                    }
                }
                None => {
                    yield Ok(Event::default().data(
                        serde_json::json!({"error": "Job not found"}).to_string()
                    ));
                    break;
                }
            }

            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    };

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("ping"),
    )
}

async fn get_preview(
    Path(job_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let job = {
        let store = state.jobs.read().await;
        store.get_job(&job_id).cloned()
    };

    match job {
        Some(job) if job.status == JobStatus::Completed || job.status == JobStatus::Paid => {
            match job.world_path {
                Some(ref world_path) => {
                    let path = std::path::PathBuf::from(world_path);
                    match crate::preview::extract_preview_data(&path) {
                        Ok(preview) => (StatusCode::OK, Json(serde_json::to_value(preview).unwrap())).into_response(),
                        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))).into_response(),
                    }
                }
                None => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "World path not set"}))).into_response(),
            }
        }
        Some(job) => {
            (StatusCode::ACCEPTED, Json(serde_json::json!({
                "status": job.status,
                "message": "World not yet ready for preview"
            }))).into_response()
        }
        None => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Job not found"}))).into_response()
        }
    }
}

async fn download(
    Path(job_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let job = {
        let store = state.jobs.read().await;
        store.get_job(&job_id).cloned()
    };

    match job {
        Some(job) if job.paid || job.status == JobStatus::Completed => {
            let zip_path = state.config.data_dir.join(&job_id).join("world.zip");
            if zip_path.exists() {
                match tokio::fs::read(&zip_path).await {
                    Ok(data) => {
                        let headers = [
                            (axum::http::header::CONTENT_TYPE, "application/zip"),
                            (axum::http::header::CONTENT_DISPOSITION, "attachment; filename=\"map2minecraft-world.zip\""),
                        ];
                        (headers, data).into_response()
                    }
                    Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": format!("Read error: {}", e)}))).into_response(),
                }
            } else {
                (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "World zip not found"}))).into_response()
            }
        }
        Some(_) => {
            (StatusCode::PAYMENT_REQUIRED, Json(serde_json::json!({"error": "Payment required"}))).into_response()
        }
        None => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Job not found"}))).into_response()
        }
    }
}

// Serve BlueMap static files (/api/bluemap/{job_id}/ and /api/bluemap/{job_id}/{*path})

async fn bluemap_index(
    Path(job_id): Path<String>,
    State(state): State<AppState>,
) -> Response {
    let webroot = {
        let store = state.jobs.read().await;
        store.get_job(&job_id).and_then(|j| j.bluemap_webroot.clone())
    };

    let webroot = match webroot {
        Some(w) => std::path::PathBuf::from(w),
        None => {
            return (StatusCode::NOT_FOUND, "BlueMap preview not available").into_response();
        }
    };

    let index_path = webroot.join("index.html");
    match tokio::fs::read_to_string(&index_path).await {
        Ok(html) => {
            // Inject <base> tag so relative asset paths resolve under /api/bluemap/{job_id}/
            let base_tag = format!("<base href=\"/api/bluemap/{}/\">", job_id);
            let patched = if html.contains("<head>") {
                html.replacen("<head>", &format!("<head>{}", base_tag), 1)
            } else if html.contains("<HEAD>") {
                html.replacen("<HEAD>", &format!("<HEAD>{}", base_tag), 1)
            } else {
                format!("{}{}", base_tag, html)
            };

            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                .body(Body::from(patched))
                .unwrap()
        }
        Err(_) => {
            // List what files ARE in the webroot for debugging
            let files = list_dir_recursive(&webroot, 3);
            let msg = format!("index.html not found in webroot.\nFiles in {}:\n{}", webroot.display(), files);
            tracing::warn!("{}", msg);
            (StatusCode::NOT_FOUND, msg).into_response()
        }
    }
}

fn list_dir_recursive(dir: &std::path::Path, depth: usize) -> String {
    let mut out = String::new();
    if depth == 0 { return out; }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            if path.is_dir() {
                out.push_str(&format!("  {}/\n", name));
                let sub = list_dir_recursive(&path, depth - 1);
                for line in sub.lines() {
                    out.push_str(&format!("    {}\n", line));
                }
            } else {
                let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                out.push_str(&format!("  {} ({}B)\n", name, size));
            }
        }
    }
    out
}

async fn bluemap_file(
    Path((job_id, file_path)): Path<(String, String)>,
    State(state): State<AppState>,
) -> Response {
    serve_bluemap_file(&state, &job_id, &file_path).await
}

async fn serve_bluemap_file(state: &AppState, job_id: &str, file_path: &str) -> Response {
    let webroot = {
        let store = state.jobs.read().await;
        store.get_job(job_id).and_then(|j| j.bluemap_webroot.clone())
    };

    let webroot = match webroot {
        Some(w) => std::path::PathBuf::from(w),
        None => {
            return (StatusCode::NOT_FOUND, "BlueMap preview not available").into_response();
        }
    };

    // Prevent path traversal
    let safe_path = file_path.trim_start_matches('/');
    let full_path = webroot.join(safe_path);

    // Ensure path stays within webroot
    let canonical_webroot = match webroot.canonicalize() {
        Ok(p) => p,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Webroot unavailable").into_response(),
    };
    let canonical_full = match full_path.canonicalize() {
        Ok(p) => p,
        Err(_) => return (StatusCode::NOT_FOUND, "File not found").into_response(),
    };
    if !canonical_full.starts_with(&canonical_webroot) {
        return (StatusCode::FORBIDDEN, "Access denied").into_response();
    }

    match tokio::fs::read(&canonical_full).await {
        Ok(bytes) => {
            let mime = mime_for_path(&canonical_full);
            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime)
                .body(Body::from(bytes))
                .unwrap()
        }
        Err(_) => (StatusCode::NOT_FOUND, "File not found").into_response(),
    }
}

fn mime_for_path(path: &std::path::Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("js") => "application/javascript",
        Some("mjs") => "application/javascript",
        Some("css") => "text/css",
        Some("json") => "application/json",
        Some("png") => "image/png",
        Some("svg") => "image/svg+xml",
        Some("gz") => "application/gzip",
        Some("wasm") => "application/wasm",
        _ => "application/octet-stream",
    }
}
