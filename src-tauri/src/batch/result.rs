//! 批量任务的失败项与最终结果结构。

use serde::Serialize;
use std::path::PathBuf;

use crate::batch::types::{BatchTaskStatus, BatchTaskType};

/// 单个失败子任务的快照。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchItemFailure {
    pub input_path: String,
    pub error_message: String,
    pub occurred_at_ms: u64,
    pub retried: u32,
}

/// 批量任务汇总结果。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchTaskResult {
    pub task_id: String,
    pub task_type: BatchTaskType,
    pub status: BatchTaskStatus,
    pub total: u32,
    pub success: u32,
    pub failed: u32,
    pub output_dir: String,
    pub failures: Vec<BatchItemFailure>,
    pub success_output_paths: Vec<String>,
    pub created_at_ms: u64,
    pub started_at_ms: Option<u64>,
    pub finished_at_ms: Option<u64>,
    pub effective_concurrency: u32,
    pub message: Option<String>,
}

impl BatchTaskResult {
    pub fn pending(
        task_id: String,
        task_type: BatchTaskType,
        output_dir: PathBuf,
        total: u32,
        created_at_ms: u64,
        effective_concurrency: u32,
    ) -> Self {
        Self {
            task_id,
            task_type,
            status: BatchTaskStatus::Pending,
            total,
            success: 0,
            failed: 0,
            output_dir: output_dir.display().to_string(),
            failures: Vec::new(),
            success_output_paths: Vec::new(),
            created_at_ms,
            started_at_ms: None,
            finished_at_ms: None,
            effective_concurrency,
            message: None,
        }
    }
}
