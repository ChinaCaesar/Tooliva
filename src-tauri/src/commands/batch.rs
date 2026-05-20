//! 批量任务相关的 Tauri 命令。
//!
//! 设计原则：保持入参 / 出参与 `crate::batch` 类型一一对应，
//! 命令层只做参数转发与 `BatchError → String` 的错误格式化。

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::batch::manager::BatchTaskManagerState;
use crate::batch::progress::BatchProgressPayload;
use crate::batch::result::BatchTaskResult;
use crate::batch::scheduler::{
    cancel_batch_task as do_cancel, get_batch_task_progress,
    get_batch_task_result as do_get_result, pause_batch_task as do_pause,
    resume_batch_task as do_resume, start_batch_task,
};
use crate::batch::types::SubmitBatchTaskPayload;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitBatchTaskResult {
    pub task_id: String,
}

#[tauri::command]
pub async fn submit_batch_task(
    payload: SubmitBatchTaskPayload,
    app: AppHandle,
    state: State<'_, BatchTaskManagerState>,
) -> Result<SubmitBatchTaskResult, String> {
    let manager = state.0.clone();
    let task_id = start_batch_task(app, payload, manager).map_err(|err| err.message)?;
    Ok(SubmitBatchTaskResult { task_id })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchTaskIdPayload {
    pub task_id: String,
}

#[tauri::command]
pub async fn pause_batch_task(
    payload: BatchTaskIdPayload,
    state: State<'_, BatchTaskManagerState>,
) -> Result<(), String> {
    do_pause(&state.0, &payload.task_id).map_err(|err| err.message)
}

#[tauri::command]
pub async fn resume_batch_task(
    payload: BatchTaskIdPayload,
    state: State<'_, BatchTaskManagerState>,
) -> Result<(), String> {
    do_resume(&state.0, &payload.task_id).map_err(|err| err.message)
}

#[tauri::command]
pub async fn cancel_batch_task(
    payload: BatchTaskIdPayload,
    state: State<'_, BatchTaskManagerState>,
) -> Result<(), String> {
    do_cancel(&state.0, &payload.task_id).map_err(|err| err.message)
}

#[tauri::command]
pub async fn get_batch_task_result(
    payload: BatchTaskIdPayload,
    state: State<'_, BatchTaskManagerState>,
) -> Result<BatchTaskResult, String> {
    do_get_result(&state.0, &payload.task_id).map_err(|err| err.message)
}

#[tauri::command]
pub async fn get_batch_task_status(
    payload: BatchTaskIdPayload,
    state: State<'_, BatchTaskManagerState>,
) -> Result<BatchProgressPayload, String> {
    get_batch_task_progress(&state.0, &payload.task_id).map_err(|err| err.message)
}
