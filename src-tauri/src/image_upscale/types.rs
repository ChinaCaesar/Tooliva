use image::imageops::FilterType;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub const MAX_OUTPUT_SIDE: u32 = 12000;
pub const DEFAULT_MAX_OUTPUT_PIXELS: u64 = 60_000_000;
pub const DEFAULT_MAX_MEMORY_MB: u64 = 768;
pub const DEFAULT_TILE_SIZE: u32 = 1024;
pub const DEFAULT_TILE_OVERLAP: u32 = 16;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpscaleQualityMode {
    Fast,
    Balanced,
    Quality,
}

impl Default for UpscaleQualityMode {
    fn default() -> Self {
        Self::Fast
    }
}

impl UpscaleQualityMode {
    pub fn filter(self) -> FilterType {
        match self {
            Self::Fast => FilterType::Triangle,
            Self::Balanced => FilterType::CatmullRom,
            Self::Quality => FilterType::Lanczos3,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProcessingBackend {
    Auto,
    Gpu,
    Cpu,
    Ai,
}

impl Default for ProcessingBackend {
    fn default() -> Self {
        Self::Auto
    }
}

#[derive(Debug, Clone)]
pub struct UpscaleRequest {
    pub task_id: String,
    pub input_path: PathBuf,
    pub output_path: PathBuf,
    pub scale_factor: u8,
    pub quality_mode: UpscaleQualityMode,
    pub backend_preference: ProcessingBackend,
    pub max_output_pixels: u64,
    pub max_memory_mb: u64,
    pub tile_size: u32,
    pub tile_overlap: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpscaleProgressEvent {
    pub task_id: String,
    pub progress: u8,
    pub stage: String,
    pub backend: String,
    pub message: Option<String>,
}

#[derive(Debug, Clone)]
pub struct UpscalePlan {
    pub input_width: u32,
    pub input_height: u32,
    pub output_width: u32,
    pub output_height: u32,
    pub estimated_memory_mb: u64,
}

#[derive(Debug, Clone)]
pub struct UpscaleOutcome {
    pub output_path: PathBuf,
    pub output_width: u32,
    pub output_height: u32,
    pub backend_used: String,
}
