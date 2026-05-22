//! 调度器：把提交的批量任务转换为子任务队列 + Worker 池，按安全并发执行。
//!
//! 流程（与 spec § 八「批量任务执行流程」对齐）：
//! 1. 校验输入路径 / 输出目录。
//! 2. 查找 Processor 并调用 `validate` / `prepare`。
//! 3. 计算大文件占比 → 决定有效并发数。
//! 4. 构造 [`WorkQueue`]、[`CancelToken`]、[`ProgressEmitter`]。
//! 5. spawn 协调线程；协调线程 spawn N 个 Worker，等待全部 join 后写终态。
//! 6. 返回任务 ID 给命令层（立即返回，真正执行在后台线程）。

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use tauri::AppHandle;

use crate::ai_worker::append_perf_log;
use crate::batch::cancel::CancelToken;
use crate::batch::config::{
    detect_cpu_cores, resolve_effective_concurrency, BATCH_LARGE_FILE_BYTES,
};
use crate::batch::manager::{BatchTaskHandle, BatchTaskManager};
use crate::batch::processor::{BatchPrepareContext, BatchPrepared, BatchProcessor};
use crate::batch::progress::ProgressEmitter;
use crate::batch::queue::WorkQueue;
use crate::batch::result::BatchTaskResult;
use crate::batch::tempfile::cleanup_temp_files_in_dir;
use crate::batch::types::{
    BatchError, BatchTaskStatus, BatchTaskType, SubmitBatchTaskPayload, WorkItem,
};
use crate::batch::worker::{now_ms, worker_loop, WorkerEnv, WorkerOutcome};
use crate::debug_log::debug_log_to_stderr;

/// 命令层入口：创建任务并立即返回 task_id；真正的并发执行在后台线程。
pub fn start_batch_task(
    app: AppHandle,
    payload: SubmitBatchTaskPayload,
    manager: Arc<BatchTaskManager>,
) -> Result<String, BatchError> {
    let submit_started = std::time::Instant::now();
    let task_id = payload
        .task_id
        .clone()
        .unwrap_or_else(BatchTaskManager::next_task_id);
    let task_type = payload.task_type;

    // 输入校验
    let input_files = validate_inputs(&payload.input_files)?;
    let output_dir = validate_output_dir(&payload.output_dir)?;

    let processor = manager
        .registry()
        .get(task_type)
        .ok_or_else(|| BatchError::invalid_input(format!("未注册的批量任务类型：{}", task_type)))?;
    processor.validate(&payload.options, &input_files)?;
    log_batch_perf(&format!(
        "[batch-scheduler-perf] task_id={} stage=validated task_type={} files={} duration_ms={}",
        task_id,
        task_type,
        input_files.len(),
        submit_started.elapsed().as_millis()
    ));

    // 大文件占比 → 影响并发决策
    let large_file_count = count_large_files(&input_files, BATCH_LARGE_FILE_BYTES);
    let effective_concurrency = resolve_effective_concurrency(
        task_type.category(),
        payload.concurrency_preset.unwrap_or_default(),
        payload.custom_concurrency,
        detect_cpu_cores(),
        large_file_count,
        input_files.len(),
    );

    // 准备阶段（一次性资源）
    let prepare_ctx = BatchPrepareContext {
        task_id: task_id.clone(),
        task_type,
        input_files: input_files.clone(),
        output_dir: output_dir.clone(),
        options: payload.options.clone(),
    };
    let prepared = processor.prepare(&prepare_ctx)?;
    log_batch_perf(&format!(
        "[batch-scheduler-perf] task_id={} stage=prepared concurrency={} duration_ms={}",
        task_id,
        effective_concurrency,
        submit_started.elapsed().as_millis()
    ));

    let total = input_files.len() as u32;
    let created_at_ms = now_ms();

    // 构建共享状态
    let cancel = Arc::new(CancelToken::new());
    let progress = Arc::new(ProgressEmitter::new(
        app.clone(),
        task_id.clone(),
        task_type,
        total,
    ));
    let result = Arc::new(Mutex::new(BatchTaskResult::pending(
        task_id.clone(),
        task_type,
        output_dir.clone(),
        total,
        created_at_ms,
        effective_concurrency,
    )));

    let handle = Arc::new(BatchTaskHandle::new(
        cancel.clone(),
        progress.clone(),
        result.clone(),
    ));
    manager.insert(task_id.clone(), handle.clone());

    // 任务为空的快捷路径
    if total == 0 {
        if let Ok(mut r) = result.lock() {
            r.status = BatchTaskStatus::Finished;
            r.started_at_ms = Some(created_at_ms);
            r.finished_at_ms = Some(created_at_ms);
        }
        progress.finalize(
            BatchTaskStatus::Finished,
            Some("没有可处理的文件".to_string()),
        );
        return Ok(task_id);
    }

    // 构造 WorkItem
    let items: Vec<WorkItem> = input_files
        .iter()
        .enumerate()
        .map(|(idx, p)| WorkItem {
            index: idx,
            input_path: p.clone(),
        })
        .collect();
    let queue = Arc::new(WorkQueue::from_items(items));

    // 协调线程：spawn workers → 等待 join → 写终态
    let coordinator_env = CoordinatorEnv {
        task_id: task_id.clone(),
        task_type,
        output_dir: output_dir.clone(),
        options: payload.options.clone(),
        effective_concurrency,
        cancel: cancel.clone(),
        queue,
        progress: progress.clone(),
        processor,
        prepared,
        result,
        manager: manager.clone(),
    };
    let handle_for_join = handle.clone();
    let coordinator = std::thread::spawn(move || run_coordinator(coordinator_env));
    if let Ok(mut joins) = handle_for_join.join_handles.lock() {
        joins.push(coordinator);
    }

    Ok(task_id)
}

struct CoordinatorEnv {
    task_id: String,
    task_type: BatchTaskType,
    output_dir: PathBuf,
    options: serde_json::Value,
    effective_concurrency: u32,
    cancel: Arc<CancelToken>,
    queue: Arc<WorkQueue>,
    progress: Arc<ProgressEmitter>,
    processor: Arc<dyn BatchProcessor>,
    prepared: Arc<dyn BatchPrepared>,
    result: Arc<Mutex<BatchTaskResult>>,
    manager: Arc<BatchTaskManager>,
}

fn run_coordinator(env: CoordinatorEnv) {
    let coordinator_started = std::time::Instant::now();
    let CoordinatorEnv {
        task_id,
        task_type,
        output_dir,
        options,
        effective_concurrency,
        cancel,
        queue,
        progress,
        processor,
        prepared,
        result,
        manager,
    } = env;

    // 写入 started_at
    if let Ok(mut r) = result.lock() {
        r.status = BatchTaskStatus::Running;
        r.started_at_ms = Some(now_ms());
    }
    progress.set_status(BatchTaskStatus::Running, Some("任务开始".to_string()));
    log_batch_perf(&format!(
        "[batch-scheduler-perf] task_id={} stage=coordinator-running concurrency={} duration_ms={}",
        task_id,
        effective_concurrency,
        coordinator_started.elapsed().as_millis()
    ));

    let worker_env = WorkerEnv {
        task_id: task_id.clone(),
        task_type,
        output_dir: output_dir.clone(),
        options,
    };
    let outcomes: Arc<Mutex<Vec<WorkerOutcome>>> = Arc::new(Mutex::new(Vec::new()));

    // spawn workers
    let mut handles = Vec::with_capacity(effective_concurrency as usize);
    for _ in 0..effective_concurrency.max(1) {
        let env_clone = worker_env.clone();
        let queue_clone = queue.clone();
        let cancel_clone = cancel.clone();
        let processor_clone = processor.clone();
        let prepared_clone = prepared.clone();
        let progress_clone = progress.clone();
        let outcomes_clone = outcomes.clone();
        handles.push(std::thread::spawn(move || {
            worker_loop(
                env_clone,
                queue_clone,
                cancel_clone,
                processor_clone,
                prepared_clone,
                progress_clone,
                outcomes_clone,
            );
        }));
    }

    // 等待全部 worker 退出
    log_batch_perf(&format!(
        "[batch-scheduler-perf] task_id={} stage=workers-spawned count={} duration_ms={}",
        task_id,
        effective_concurrency.max(1),
        coordinator_started.elapsed().as_millis()
    ));
    for h in handles {
        let _ = h.join();
    }

    // 汇总
    let mut success_paths: Vec<String> = Vec::new();
    let mut failures = Vec::new();
    if let Ok(mut bucket) = outcomes.lock() {
        for item in bucket.drain(..) {
            match item {
                WorkerOutcome::Success { output_path, .. } => {
                    success_paths.push(output_path.display().to_string());
                }
                WorkerOutcome::Failure(f) => failures.push(f),
                WorkerOutcome::Skipped => {}
            }
        }
    }

    let final_status = if cancel.is_cancelled() {
        BatchTaskStatus::Canceled
    } else if failures.is_empty() && !success_paths.is_empty() {
        BatchTaskStatus::Finished
    } else if !failures.is_empty() && success_paths.is_empty() {
        BatchTaskStatus::Failed
    } else {
        // 既有成功也有失败：视为已完成（含失败列表）
        BatchTaskStatus::Finished
    };

    // 取消时清理输出目录中遗留的 .tmp
    if matches!(final_status, BatchTaskStatus::Canceled) {
        cleanup_temp_files_in_dir(&output_dir);
    }

    // 写终态结果
    let summary_message = match final_status {
        BatchTaskStatus::Canceled => Some("任务已取消".to_string()),
        BatchTaskStatus::Failed => Some("任务执行失败".to_string()),
        _ => None,
    };

    let success_count = success_paths.len();
    let failure_count = failures.len();
    if let Ok(mut r) = result.lock() {
        r.status = final_status;
        r.success = success_count as u32;
        r.failed = failure_count as u32;
        r.success_output_paths = success_paths;
        r.failures = failures;
        r.finished_at_ms = Some(now_ms());
        r.message = summary_message.clone();
    }
    progress.finalize(final_status, summary_message);
    log_batch_perf(&format!(
        "[batch-scheduler-perf] task_id={} stage=finalize status={:?} success={} failed={} duration_ms={}",
        task_id,
        final_status,
        success_count,
        failure_count,
        coordinator_started.elapsed().as_millis()
    ));
    // 任务进入终态后保留 handle 在 manager 中，供前端读取结果。
    // 后续可由 GC 策略移除（首版不主动移除）。
    let _ = manager;
}

fn validate_inputs(input_files: &[String]) -> Result<Vec<PathBuf>, BatchError> {
    if input_files.is_empty() {
        return Err(BatchError::invalid_input("输入文件列表不能为空"));
    }
    let mut result = Vec::with_capacity(input_files.len());
    for raw in input_files {
        let path = PathBuf::from(raw.trim());
        if !path.exists() {
            return Err(BatchError::invalid_input(format!(
                "输入文件不存在：{}",
                path.display()
            )));
        }
        if !path.is_file() {
            return Err(BatchError::invalid_input(format!(
                "输入路径不是文件：{}",
                path.display()
            )));
        }
        result.push(path);
    }
    Ok(result)
}

fn log_batch_perf(message: &str) {
    debug_log_to_stderr(message);
    append_perf_log(message);
}

fn validate_output_dir(raw: &str) -> Result<PathBuf, BatchError> {
    let dir = PathBuf::from(raw.trim());
    if dir.as_os_str().is_empty() {
        return Err(BatchError::invalid_input("输出目录不能为空"));
    }
    if dir.exists() && !dir.is_dir() {
        return Err(BatchError::invalid_input(format!(
            "输出路径已存在但不是目录：{}",
            dir.display()
        )));
    }
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|err| BatchError::io(format!("创建输出目录失败：{err}")))?;
    }
    Ok(dir)
}

fn count_large_files(files: &[PathBuf], threshold: u64) -> usize {
    files
        .iter()
        .filter(|p| {
            fs::metadata(p)
                .map(|m| m.len() >= threshold)
                .unwrap_or(false)
        })
        .count()
}

/// 取消任务：设置 cancel 标志、清空未派发队列、杀死注册的子进程，
/// 并触发输出目录的 `.tmp` 清理。Worker 自然退出后协调线程会写终态。
pub fn cancel_batch_task(manager: &BatchTaskManager, task_id: &str) -> Result<(), BatchError> {
    let Some(handle) = manager.get(task_id) else {
        return Err(BatchError::invalid_input(format!("任务不存在：{task_id}")));
    };
    handle.cancel.cancel();
    Ok(())
}

pub fn pause_batch_task(manager: &BatchTaskManager, task_id: &str) -> Result<(), BatchError> {
    let Some(handle) = manager.get(task_id) else {
        return Err(BatchError::invalid_input(format!("任务不存在：{task_id}")));
    };
    handle.cancel.pause();
    if let Ok(mut result) = handle.result.lock() {
        if matches!(result.status, BatchTaskStatus::Running) {
            result.status = BatchTaskStatus::Paused;
        }
    }
    handle
        .progress
        .set_status(BatchTaskStatus::Paused, Some("任务已暂停".to_string()));
    Ok(())
}

pub fn resume_batch_task(manager: &BatchTaskManager, task_id: &str) -> Result<(), BatchError> {
    let Some(handle) = manager.get(task_id) else {
        return Err(BatchError::invalid_input(format!("任务不存在：{task_id}")));
    };
    handle.cancel.resume();
    if let Ok(mut result) = handle.result.lock() {
        if matches!(result.status, BatchTaskStatus::Paused) {
            result.status = BatchTaskStatus::Running;
        }
    }
    handle
        .progress
        .set_status(BatchTaskStatus::Running, Some("任务已继续".to_string()));
    Ok(())
}

pub fn get_batch_task_result(
    manager: &BatchTaskManager,
    task_id: &str,
) -> Result<BatchTaskResult, BatchError> {
    let handle = manager
        .get(task_id)
        .ok_or_else(|| BatchError::invalid_input(format!("任务不存在：{task_id}")))?;
    let snapshot = handle
        .result
        .lock()
        .map_err(|_| BatchError::processor("读取任务结果失败"))?
        .clone();
    Ok(snapshot)
}

/// 简单包装：返回当前进度快照，便于前端轮询替代事件订阅。
pub fn get_batch_task_progress(
    manager: &BatchTaskManager,
    task_id: &str,
) -> Result<crate::batch::progress::BatchProgressPayload, BatchError> {
    let handle = manager
        .get(task_id)
        .ok_or_else(|| BatchError::invalid_input(format!("任务不存在：{task_id}")))?;
    handle
        .progress
        .snapshot()
        .ok_or_else(|| BatchError::processor("读取任务进度失败"))
}

// 让 `Path` 可被直接用作 `&Path`（保持模块自含）
#[allow(dead_code)]
fn ensure_path_str(p: &Path) -> &Path {
    p
}
