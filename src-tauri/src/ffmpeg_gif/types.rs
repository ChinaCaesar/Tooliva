//! Types shared between CLI-facing command code and FFmpeg filter builder.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoToGifCropRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum VideoGifSizePreset {
    Original,
    #[serde(rename = "p720")]
    P720,
    #[serde(rename = "p480")]
    P480,
    #[serde(rename = "p360")]
    P360,
    Custom,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum VideoGifQualityPreset {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoToGifOptions {
    pub start_time_sec: Option<f64>,
    pub end_time_sec: Option<f64>,
    pub size_preset: VideoGifSizePreset,
    pub custom_width: Option<u32>,
    pub custom_height: Option<u32>,
    pub fps: u32,
    pub quality: VideoGifQualityPreset,
    pub loop_playback: bool,
    pub max_frames: Option<u32>,
    pub playback_speed: Option<f64>,
    pub palette_stats_mode: Option<String>,
    pub palette_max_colors: Option<u32>,
    pub dither: Option<String>,
    pub bayer_scale: Option<u32>,
    pub crop: Option<VideoToGifCropRect>,
    /// Reserved for future soft output cap enforcement.
    #[allow(dead_code)]
    pub output_size_limit_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoToGifProgressEvent {
    pub task_id: String,
    pub progress: f64,
    pub stage: String,
    pub message: Option<String>,
}
