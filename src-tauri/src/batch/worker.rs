//! Worker 线程逻辑：循环从队列取子任务，调度 Processor 执行，处理重试与失败收敛。
//!
//! 调度器为每个任务 spawn N 个 Worker，它们共享同一队列、取消令牌与进度发射器。

use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::batch::cancel::CancelToken;
use crate::batch::config::BATCH_MAX_RETRY_COUNT;
use crate::batch::processor::{BatchItemContext, BatchPrepared, BatchProcessor};
use crate::batch::progress::ProgressEmitter;
use crate::batch::queue::WorkQueue;
use crate::batch::result::BatchItemFailure;
use crate::batch::types::{BatchError, BatchTaskType};
use crate::ai_worker::append_perf_log;

/// Worker 收集到的结果，回传给协调线程做汇总。
pub enum WorkerOutcome {
    Success {
        index: usize,
        input_path: PathBuf,
        output_path: PathBuf,
    },
    Failure(BatchItemFailure),
    Skipped,
}

#[derive(Clone)]
pub struct WorkerEnv {
    pub task_id: String,
    pub task_type: BatchTaskType,
    pub output_dir: PathBuf,
    pub options: serde_json::Value,
}

/// 单线程 Worker 主循环：直到队列空 / 任务取消为止。
pub fn worker_loop(
    env: WorkerEnv,
    queue: Arc<WorkQueue>,
    cancel: Arc<CancelToken>,
    processor: Arc<dyn BatchProcessor>,
    prepared: Arc<dyn BatchPrepared>,
    progress: Arc<ProgressEmitter>,
    outcomes: Arc<std::sync::Mutex<Vec<WorkerOutcome>>>,
) {
    loop {
        // 取消：立刻退出
        if cancel.is_cancelled() {
            return;
        }
        // 暂停：自旋等待，sleep 让出 CPU。当前正在执行的子任务（无）自然不阻塞。
        if cancel.is_paused() {
            std::thread::sleep(Duration::from_millis(120));
            continue;
        }
        let Some(item) = queue.pop() else {
            return;
        };

        // 标记当前正在处理的文件
        progress.mark_current(Some(item.input_path.display().to_string()));

        let outcome = run_with_retry(
            &env,
            &item.input_path,
            item.index,
            &processor,
            &prepared,
            &cancel,
        );
        match &outcome {
            WorkerOutcome::Success { output_path, .. } => {
                progress.record_success(&output_path.display().to_string());
            }
            WorkerOutcome::Failure(failure) => {
                progress.record_failure(&failure.error_message);
            }
            WorkerOutcome::Skipped => {
                // 任务取消时静默跳过，不计入失败
            }
        }
        if let Ok(mut bucket) = outcomes.lock() {
            bucket.push(outcome);
        }
    }
}

/// 单条子任务带有限重试：仅在错误标记为 `retryable=true` 时重试，最多 `BATCH_MAX_RETRY_COUNT` 次。
fn run_with_retry(
    env: &WorkerEnv,
    input_path: &std::path::Path,
    index: usize,
    processor: &Arc<dyn BatchProcessor>,
    prepared: &Arc<dyn BatchPrepared>,
    cancel: &Arc<CancelToken>,
) -> WorkerOutcome {
    let mut attempts: u32 = 0;
    let max_attempts = BATCH_MAX_RETRY_COUNT.saturating_add(1).max(1);

    loop {
        if cancel.is_cancelled() {
            return WorkerOutcome::Skipped;
        }
        attempts = attempts.saturating_add(1);
        log_batch_worker_perf(&format!(
            "[batch-worker-perf] task_id={} item_index={} stage=attempt-start attempt={} input=\"{}\"",
            env.task_id,
            index,
            attempts,
            input_path.display()
        ));
        let work_item = crate::batch::types::WorkItem {
            index,
            input_path: input_path.to_path_buf(),
        };
        let ctx = BatchItemContext {
            task_id: &env.task_id,
            task_type: env.task_type,
            item: work_item,
            output_dir: &env.output_dir,
            options: &env.options,
            cancel,
        };
        let result = processor.process_one(&ctx, prepared);
        match result {
            Ok(output) => {
                log_batch_worker_perf(&format!(
                    "[batch-worker-perf] task_id={} item_index={} stage=attempt-success attempt={} output=\"{}\"",
                    env.task_id,
                    index,
                    attempts,
                    output.output_path.display()
                ));
                return WorkerOutcome::Success {
                    index,
                    input_path: input_path.to_path_buf(),
                    output_path: output.output_path,
                };
            }
            Err(err) => {
                let exhausted = attempts >= max_attempts;
                let retryable = err.retryable && !exhausted && !cancel.is_cancelled();
                log_batch_worker_perf(&format!(
                    "[batch-worker-perf] task_id={} item_index={} stage=attempt-failure attempt={} retryable={} exhausted={} error=\"{}\"",
                    env.task_id,
                    index,
                    attempts,
                    retryable,
                    exhausted,
                    sanitize_log_value(&err.message)
                ));
                if !retryable {
                    return WorkerOutcome::Failure(build_failure(
                        input_path,
                        err,
                        attempts.saturating_sub(1),
                    ));
                }
                // 重试前短暂退避，缓解瞬时 IO 抖动
                std::thread::sleep(Duration::from_millis(80));
            }
        }
    }
}

fn log_batch_worker_perf(message: &str) {
    eprintln!("{message}");
    append_perf_log(message);
}

fn sanitize_log_value(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn build_failure(input_path: &std::path::Path, err: BatchError, retried: u32) -> BatchItemFailure {
    BatchItemFailure {
        input_path: input_path.display().to_string(),
        error_message: err.message,
        occurred_at_ms: now_ms(),
        retried,
    }
}

pub(crate) fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
