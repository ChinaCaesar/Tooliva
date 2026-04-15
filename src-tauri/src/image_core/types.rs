use image::ImageFormat;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingLimits {
    pub max_output_side: u32,
    pub max_output_pixels: u64,
    pub max_memory_mb: u64,
}

impl Default for ProcessingLimits {
    fn default() -> Self {
        Self {
            max_output_side: 12_000,
            max_output_pixels: 60_000_000,
            max_memory_mb: 768,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TileConfig {
    pub tile_size: u32,
    pub tile_overlap: u32,
}

impl Default for TileConfig {
    fn default() -> Self {
        Self {
            tile_size: 1024,
            tile_overlap: 16,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessContext {
    pub task_id: String,
    pub processor_key: String,
    pub input_path: PathBuf,
    pub output_path: PathBuf,
    pub output_format: Option<String>,
    pub params: Value,
    pub limits: ProcessingLimits,
    pub tile: TileConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessPlan {
    pub input_width: u32,
    pub input_height: u32,
    pub output_width: u32,
    pub output_height: u32,
    pub estimated_memory_mb: u64,
    pub total_steps: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessOutput {
    pub output_path: PathBuf,
    pub output_width: u32,
    pub output_height: u32,
    pub backend_used: String,
    pub metadata: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub task_id: String,
    pub processor_key: String,
    pub progress: u8,
    pub stage: String,
    pub backend: Option<String>,
    pub message: Option<String>,
}

impl ProgressEvent {
    pub fn stage(task_id: &str, processor_key: &str, stage: &str, progress: u8, message: Option<String>) -> Self {
        Self {
            task_id: task_id.to_string(),
            processor_key: processor_key.to_string(),
            progress,
            stage: stage.to_string(),
            backend: None,
            message,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineSummary {
    pub task_id: String,
    pub processor_key: String,
    pub success: bool,
    pub elapsed_ms: u128,
    pub stage_elapsed_ms: Vec<(String, u128)>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone)]
pub struct LoadedImage {
    pub image: image::DynamicImage,
    pub format: ImageFormat,
}

#[derive(Debug, Clone)]
pub struct RuntimeStageStat {
    pub stage: String,
    pub elapsed: Duration,
}
