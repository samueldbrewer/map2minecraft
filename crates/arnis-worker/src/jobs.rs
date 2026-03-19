use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateRequest {
    pub bbox: [f64; 4], // [min_lat, min_lng, max_lat, max_lng]
    pub scale: Option<f64>,
    pub bedrock: Option<bool>,
    pub terrain: Option<bool>,
    pub interior: Option<bool>,
    pub roof: Option<bool>,
    pub fillground: Option<bool>,
    pub spawn_lat: Option<f64>,
    pub spawn_lng: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Queued,
    Processing,
    GeneratingPreview,
    Completed,
    Failed,
    Paid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: String,
    pub status: JobStatus,
    pub progress: f64,
    pub message: String,
    pub request: GenerateRequest,
    pub created_at: u64,
    pub world_path: Option<String>,
    pub error: Option<String>,
    pub paid: bool,
}

pub struct JobStore {
    pub jobs: HashMap<String, Job>,
}

impl JobStore {
    pub fn new() -> Self {
        Self {
            jobs: HashMap::new(),
        }
    }

    pub fn create_job(&mut self, request: GenerateRequest) -> Job {
        let id = Uuid::new_v4().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let job = Job {
            id: id.clone(),
            status: JobStatus::Queued,
            progress: 0.0,
            message: "Queued for processing".to_string(),
            request,
            created_at: now,
            world_path: None,
            error: None,
            paid: false,
        };

        self.jobs.insert(id, job.clone());
        job
    }

    pub fn get_job(&self, id: &str) -> Option<&Job> {
        self.jobs.get(id)
    }

    pub fn update_job<F>(&mut self, id: &str, f: F) -> Option<Job>
    where
        F: FnOnce(&mut Job),
    {
        if let Some(job) = self.jobs.get_mut(id) {
            f(job);
            Some(job.clone())
        } else {
            None
        }
    }
}
