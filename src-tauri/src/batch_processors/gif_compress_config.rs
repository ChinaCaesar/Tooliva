//! GIF 压缩批量任务参数（与前端 `GifCompressBatchOptions` camelCase 对齐）。

use serde::{Deserialize, Serialize};

/// 压缩模式：影响推荐默认强度（前端切换时写入具体 fps/colors 等；后端仍校验范围）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CompressionMode {
    Light,
    #[default]
    Recommended,
    Extreme,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ResizePolicy {
    #[default]
    Keep,
    P80,
    P60,
    P50,
    CustomWidth,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FpsPreset {
    #[serde(rename = "SOURCE")]
    Source,
    #[serde(rename = "FPS_15")]
    Fps15,
    #[default]
    #[serde(rename = "FPS_12")]
    Fps12,
    #[serde(rename = "FPS_10")]
    Fps10,
    #[serde(rename = "FPS_8")]
    Fps8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ColorCount {
    C256,
    #[default]
    C128,
    C64,
    C32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CompressQuality {
    Low,
    #[default]
    Medium,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DitherLevel {
    Off,
    Low,
    #[default]
    Medium,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LoopPolicy {
    #[default]
    PreserveSource,
    ForceLoop,
    NoLoop,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OutputDirPolicy {
    #[default]
    SameAsSource,
    SourceSubfolder,
    Custom,
}

/// 与 UI 下拉「文件名规则」一致；用于 `allocate_unique_final_path` 的 suffix 段。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FilenameRule {
    #[default]
    CompressedEn,
    CompressedZh,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GifCompressBatchOptions {
    /// 与 UI「压缩模式」同步；后端当前按分项参数执行，保留字段供后续策略扩展。
    #[allow(dead_code)]
    #[serde(default)]
    pub mode: CompressionMode,
    #[serde(default)]
    pub resize: ResizePolicy,
    #[serde(default)]
    pub fps: FpsPreset,
    #[serde(default)]
    pub colors: ColorCount,
    #[serde(default)]
    pub quality: CompressQuality,
    #[serde(default = "default_true")]
    pub remove_duplicate_frames: bool,
    pub target_size_mb: Option<f64>,
    #[serde(default)]
    pub output_dir_policy: OutputDirPolicy,
    #[serde(default)]
    pub dither: DitherLevel,
    #[serde(default)]
    pub loop_policy: LoopPolicy,
    #[serde(default = "default_true")]
    pub keep_transparency: bool,
    #[serde(default)]
    pub filename_rule: FilenameRule,
    #[serde(default)]
    pub fast_mode: bool,
    #[serde(default)]
    pub custom_width: Option<u32>,
}

fn default_true() -> bool {
    true
}

impl Default for GifCompressBatchOptions {
    fn default() -> Self {
        Self {
            mode: CompressionMode::Recommended,
            resize: ResizePolicy::Keep,
            fps: FpsPreset::Fps12,
            colors: ColorCount::C128,
            quality: CompressQuality::Medium,
            remove_duplicate_frames: true,
            target_size_mb: None,
            output_dir_policy: OutputDirPolicy::SameAsSource,
            dither: DitherLevel::Medium,
            loop_policy: LoopPolicy::PreserveSource,
            keep_transparency: true,
            filename_rule: FilenameRule::CompressedEn,
            fast_mode: false,
            custom_width: None,
        }
    }
}

impl GifCompressBatchOptions {
    pub fn filename_suffix(&self) -> &'static str {
        match self.filename_rule {
            FilenameRule::CompressedEn => "COMPRESSED",
            FilenameRule::CompressedZh => "压缩",
        }
    }

    pub fn max_colors_u32(&self) -> u32 {
        match self.colors {
            ColorCount::C256 => 256,
            ColorCount::C128 => 128,
            ColorCount::C64 => 64,
            ColorCount::C32 => 32,
        }
    }
}
