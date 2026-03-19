use std::sync::Arc;
use tokio::sync::RwLock;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod jobs;
mod preview;
mod routes;
mod storage;

use config::AppConfig;
use jobs::JobStore;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub jobs: Arc<RwLock<JobStore>>,
    pub redis: Option<redis::Client>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "arnis_worker=info,tower_http=info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = AppConfig::from_env();

    let redis = match &config.redis_url {
        Some(url) => {
            match redis::Client::open(url.as_str()) {
                Ok(client) => {
                    tracing::info!("Connected to Redis");
                    Some(client)
                }
                Err(e) => {
                    tracing::warn!("Failed to connect to Redis: {}, using in-memory store", e);
                    None
                }
            }
        }
        None => {
            tracing::info!("No REDIS_URL configured, using in-memory job store");
            None
        }
    };

    let state = AppState {
        config: Arc::new(config),
        jobs: Arc::new(RwLock::new(JobStore::new())),
        redis,
    };

    let app = routes::create_router(state.clone());

    let addr = "0.0.0.0:8080";
    tracing::info!("Worker listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
