use std::path::PathBuf;

pub struct AppConfig {
    pub redis_url: Option<String>,
    pub data_dir: PathBuf,
    pub max_area_km2: f64,
    pub bluemap_cache_dir: PathBuf,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            redis_url: std::env::var("REDIS_URL").ok(),
            data_dir: PathBuf::from(std::env::var("DATA_DIR").unwrap_or_else(|_| "/data/worlds".to_string())),
            max_area_km2: std::env::var("MAX_AREA_KM2")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(100.0),
            bluemap_cache_dir: PathBuf::from(
                std::env::var("BLUEMAP_CACHE_DIR").unwrap_or_else(|_| "/app/bluemap-cache".to_string())
            ),
        }
    }
}
