//! 批量任务公共类型定义。
//!
//! 这里集中放置任务类型枚举、状态枚举、提交载荷以及统一错误类型，
//! 供调度器、Processor 与 Tauri 命令层共享。

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fmt::{Display, Formatter};
use std::path::PathBuf;

/// 批量任务的业务类型（决定使用哪个 Processor 与哪类并发上限）。
///
/// 通过 `serde(rename_all = "SCREAMING_SNAKE_CASE")` 前后端协议字符串保持大写下划线风格。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BatchTaskType {
    ImageWatermark,
    ImageCompress,
    ImageConvert,
    ImageUpscale,
    VideoToGif,
    AiInpaint,
    AiUpscale,
}

impl BatchTaskType {
    /// 任务所属大类，用于并发预设与上限决策。
    pub fn category(&self) -> BatchTaskCategory {
        match self {
            Self::ImageWatermark | Self::ImageCompress | Self::ImageConvert | Self::ImageUpscale => {
                BatchTaskCategory::Image
            }
            Self::VideoToGif => BatchTaskCategory::Video,
            Self::AiInpaint | Self::AiUpscale => BatchTaskCategory::Ai,
        }
    }

    /// 协议字符串，便于日志与跨语言对齐。
    pub fn as_protocol_str(&self) -> &'static str {
        match self {
            Self::ImageWatermark => "IMAGE_WATERMARK",
            Self::ImageCompress => "IMAGE_COMPRESS",
            Self::ImageConvert => "IMAGE_CONVERT",
            Self::ImageUpscale => "IMAGE_UPSCALE",
            Self::VideoToGif => "VIDEO_TO_GIF",
            Self::AiInpaint => "AI_INPAINT",
            Self::AiUpscale => "AI_UPSCALE",
        }
    }
}

impl Display for BatchTaskType {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_protocol_str())
    }
}

/// 任务大类，仅用于并发档位决策。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BatchTaskCategory {
    Image,
    Video,
    Ai,
}

/// 任务生命周期状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BatchTaskStatus {
    Pending,
    Running,
    Paused,
    Canceled,
    Finished,
    Failed,
}

impl BatchTaskStatus {
    /// 是否处于不可继续执行的终态。
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Canceled | Self::Finished | Self::Failed)
    }
}

/// 调度层向 Tauri/前端暴露的统一错误。
///
/// 区分 `Retryable=true` 时调度器可在 `BATCH_MAX_RETRY_COUNT` 内重试，
/// 否则视为确定性错误，避免无效重试。
#[derive(Debug, Clone)]
pub struct BatchError {
    pub message: String,
    pub retryable: bool,
}

impl BatchError {
    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            retryable: false,
        }
    }

    pub fn io(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            retryable: true,
        }
    }

    pub fn processor(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            retryable: true,
        }
    }

    pub fn deterministic(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            retryable: false,
        }
    }

    pub fn canceled() -> Self {
        Self {
            message: "任务已被取消".to_string(),
            retryable: false,
        }
    }
}

impl Display for BatchError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for BatchError {}

impl From<std::io::Error> for BatchError {
    fn from(value: std::io::Error) -> Self {
        Self::io(value.to_string())
    }
}

/// 前端提交批量任务时的统一载荷。
///
/// - `task_id`：可选；若未提供则后端生成。生成规则见 [`crate::batch::manager`]。
/// - `concurrency_preset` / `custom_concurrency`：用户选择的并发档位，后端会按
///   `BATCH_AUTO_FIX_CONCURRENCY` 与任务类别再做安全修正。
/// - `options`：任务级业务参数，按 `task_type` 由 Processor 解析校验。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitBatchTaskPayload {
    pub task_id: Option<String>,
    pub task_type: BatchTaskType,
    pub input_files: Vec<String>,
    pub output_dir: String,
    #[serde(default)]
    pub options: Value,
    #[serde(default)]
    pub concurrency_preset: Option<crate::batch::config::ConcurrencyPreset>,
    #[serde(default)]
    pub custom_concurrency: Option<u32>,
}

/// 子任务的执行单元（输入 → 输出）。
///
/// 当一个视频被拆为多个 GIF 片段时，会拆为多条 `WorkItem`，但仍受视频类全局并发限制。
#[derive(Debug, Clone)]
pub struct WorkItem {
    pub index: usize,
    pub input_path: PathBuf,
}

/// 摘要快照（供 `get_batch_task_status` 与最终结果共用的精简结构）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchTaskSummary {
    pub task_id: String,
    pub task_type: BatchTaskType,
    pub status: BatchTaskStatus,
    pub total: u32,
    pub finished: u32,
    pub success: u32,
    pub failed: u32,
    pub created_at_ms: u64,
    pub started_at_ms: Option<u64>,
    pub finished_at_ms: Option<u64>,
    pub output_dir: String,
}
