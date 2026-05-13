//! 进度事件聚合与节流。
//!
//! 所有 Worker 完成 / 失败一条子任务后调用 `ProgressEmitter::record_*`，
//! 内部按 [`BATCH_PROGRESS_INTERVAL_MS`] 节流后通过 Tauri 事件推送给前端。
//!
//! 事件名遵循需求约定，统一为 [`BATCH_PROGRESS_EVENT`]。

use serde::Serialize;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

use crate::batch::config::BATCH_PROGRESS_INTERVAL_MS;
use crate::batch::types::{BatchTaskStatus, BatchTaskType};

/// 前端监听的进度事件名（前后端常量需保持一致）。
pub const BATCH_PROGRESS_EVENT: &str = "batch-task-progress";

/// 进度载荷；字段命名与需求约定一致（驼峰序列化，匹配前端类型）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchProgressPayload {
    pub task_id: String,
    pub task_type: BatchTaskType,
    pub total: u32,
    pub finished: u32,
    pub success: u32,
    pub failed: u32,
    pub current_file: Option<String>,
    pub percent: u8,
    pub status: BatchTaskStatus,
    pub message: Option<String>,
}

impl BatchProgressPayload {
    fn percent(finished: u32, total: u32) -> u8 {
        if total == 0 {
            return 100;
        }
        ((finished as f32 / total as f32) * 100.0).round().clamp(0.0, 100.0) as u8
    }
}

/// 节流推送器：维护当前任务的进度快照，按时间窗口推送给前端。
pub struct ProgressEmitter {
    app: AppHandle,
    state: Mutex<EmitterState>,
}

struct EmitterState {
    payload: BatchProgressPayload,
    last_emit_at: Option<Instant>,
}

impl ProgressEmitter {
    pub fn new(
        app: AppHandle,
        task_id: String,
        task_type: BatchTaskType,
        total: u32,
    ) -> Self {
        Self {
            app,
            state: Mutex::new(EmitterState {
                payload: BatchProgressPayload {
                    task_id,
                    task_type,
                    total,
                    finished: 0,
                    success: 0,
                    failed: 0,
                    current_file: None,
                    percent: 0,
                    status: BatchTaskStatus::Pending,
                    message: None,
                },
                last_emit_at: None,
            }),
        }
    }

    /// 切换状态并立即推送一帧（强制 emit，绕过节流）。
    pub fn set_status(&self, status: BatchTaskStatus, message: Option<String>) {
        if let Ok(mut state) = self.state.lock() {
            state.payload.status = status;
            state.payload.message = message;
            self.emit_locked(&mut state, true);
        }
    }

    /// 记录某条子任务正在处理（仅更新 current_file，受节流控制）。
    pub fn mark_current(&self, current_file: Option<String>) {
        if let Ok(mut state) = self.state.lock() {
            state.payload.current_file = current_file;
            self.emit_locked(&mut state, false);
        }
    }

    /// 记录一条子任务成功完成。
    pub fn record_success(&self, output_path: &str) {
        if let Ok(mut state) = self.state.lock() {
            state.payload.success = state.payload.success.saturating_add(1);
            state.payload.finished = state.payload.finished.saturating_add(1);
            state.payload.percent =
                BatchProgressPayload::percent(state.payload.finished, state.payload.total);
            state.payload.message = Some(format!("已完成：{output_path}"));
            self.emit_locked(&mut state, false);
        }
    }

    /// 记录一条子任务失败。
    pub fn record_failure(&self, error_message: &str) {
        if let Ok(mut state) = self.state.lock() {
            state.payload.failed = state.payload.failed.saturating_add(1);
            state.payload.finished = state.payload.finished.saturating_add(1);
            state.payload.percent =
                BatchProgressPayload::percent(state.payload.finished, state.payload.total);
            state.payload.message = Some(error_message.to_string());
            self.emit_locked(&mut state, false);
        }
    }

    /// 任务结束时强制推送终态。
    pub fn finalize(&self, status: BatchTaskStatus, message: Option<String>) {
        if let Ok(mut state) = self.state.lock() {
            state.payload.status = status;
            state.payload.message = message;
            state.payload.current_file = None;
            // 取消等场景 finished 可能 < total，但 percent 仍按真实完成度
            state.payload.percent =
                BatchProgressPayload::percent(state.payload.finished, state.payload.total);
            self.emit_locked(&mut state, true);
        }
    }

    /// 获取一帧快照（用于持久化结果汇总）。
    pub fn snapshot(&self) -> Option<BatchProgressPayload> {
        self.state.lock().ok().map(|s| s.payload.clone())
    }

    /// 真正向前端推送；`force=true` 时绕过节流。
    fn emit_locked(&self, state: &mut EmitterState, force: bool) {
        let now = Instant::now();
        let should_emit = force
            || state
                .last_emit_at
                .map(|t| now.duration_since(t).as_millis() as u64 >= BATCH_PROGRESS_INTERVAL_MS)
                .unwrap_or(true);
        if !should_emit {
            return;
        }
        state.last_emit_at = Some(now);
        let _ = self.app.emit(BATCH_PROGRESS_EVENT, state.payload.clone());
    }
}
