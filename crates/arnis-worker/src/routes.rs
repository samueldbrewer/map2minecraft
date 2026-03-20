use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{
        sse::{Event, Sse},
        IntoResponse, Json,
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

    let result = tokio::task::spawn_blocking(move || {
        run_generation(request, world_dir_clone)
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

            {
                let mut store = state_clone.jobs.write().await;
                store.update_job(&job_id_clone, |job| {
                    job.status = JobStatus::Completed;
                    job.progress = 100.0;
                    job.message = "World generation complete!".to_string();
                    job.world_path = Some(world_path.to_string_lossy().to_string());
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
) -> Result<std::path::PathBuf, String> {
    use arnis_core::*;

    let bbox_str = format!(
        "{},{},{},{}",
        request.bbox[0], request.bbox[1], request.bbox[2], request.bbox[3]
    );

    let bbox = coordinate_system::geographic::LLBBox::from_str(&bbox_str)
        .map_err(|e| format!("Invalid bbox: {}", e))?;

    let scale = request.scale.unwrap_or(1.0);
    let is_bedrock = request.bedrock.unwrap_or(false);

    // Fetch OSM data
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
        fillground: request.fillground.unwrap_or(true),
        city_boundaries: true,
        debug: false,
        timeout: None,
        spawn_lat: request.spawn_lat,
        spawn_lng: request.spawn_lng,
    };

    let ground = ground::generate_ground_data(&args)
        .map_err(|e| format!("Terrain error: {}", e))?;

    // Parse raw data
    let (mut parsed_elements, mut xzbbox) =
        osm_parser::parse_osm_data(raw_data, args.bbox, args.scale, args.debug);
    parsed_elements.sort_by_key(|element| osm_parser::get_priority(element));

    // Transform map
    map_transformation::transform_map(&mut parsed_elements, &mut xzbbox, &mut ground.clone());

    // Determine format and path
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

    data_processing::generate_world_with_options(
        parsed_elements,
        xzbbox,
        bbox,
        ground,
        &args,
        options,
    )
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
