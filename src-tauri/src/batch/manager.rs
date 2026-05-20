//! 批量任务管理器：维护「任务 ID → 任务句柄」，作为 Tauri State 注入到命令层。
//!
//! 同时持有 [`BatchProcessorRegistry`]，供调度器查找 Processor。

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use crate::batch::cancel::CancelToken;
use crate::batch::progress::ProgressEmitter;
use crate::batch::registry::BatchProcessorRegistry;
use crate::batch::result::BatchTaskResult;
use crate::batch::types::BatchTaskStatus;

static TASK_ID_COUNTER: AtomicU64 = AtomicU64::new(1);

/// 单个任务的内存句柄。
///
/// 持有取消令牌、进度发射器、可变结果快照与 Worker JoinHandle 列表，
/// 供命令层在 `pause/resume/cancel/get_*` 路径上访问。
pub struct BatchTaskHandle {
    pub cancel: Arc<CancelToken>,
    pub progress: Arc<ProgressEmitter>,
    pub result: Arc<Mutex<BatchTaskResult>>,
    pub join_handles: Mutex<Vec<std::thread::JoinHandle<()>>>,
}

impl BatchTaskHandle {
    pub fn new(
        cancel: Arc<CancelToken>,
        progress: Arc<ProgressEmitter>,
        result: Arc<Mutex<BatchTaskResult>>,
    ) -> Self {
        Self {
            cancel,
            progress,
            result,
            join_handles: Mutex::new(Vec::new()),
        }
    }
}

/// 全局批量任务管理器。
///
/// `Arc` 包裹保证多命令调用线程安全；Mutex 颗粒度尽量小，仅在 HashMap 操作时持有。
pub struct BatchTaskManager {
    registry: BatchProcessorRegistry,
    tasks: Mutex<HashMap<String, Arc<BatchTaskHandle>>>,
}

impl BatchTaskManager {
    pub fn new(registry: BatchProcessorRegistry) -> Self {
        Self {
            registry,
            tasks: Mutex::new(HashMap::new()),
        }
    }

    pub fn registry(&self) -> &BatchProcessorRegistry {
        &self.registry
    }

    pub fn insert(&self, task_id: String, handle: Arc<BatchTaskHandle>) {
        if let Ok(mut map) = self.tasks.lock() {
            map.insert(task_id, handle);
        }
    }

    pub fn get(&self, task_id: &str) -> Option<Arc<BatchTaskHandle>> {
        self.tasks
            .lock()
            .ok()
            .and_then(|map| map.get(task_id).cloned())
    }

    /// 用于 GC：终态任务可以从 `tasks` 中移除，但结果通过 `get_batch_task_result`
    /// 在终态前会被前端拉走，所以这里保留一段时间也无妨。
    pub fn remove(&self, task_id: &str) -> Option<Arc<BatchTaskHandle>> {
        self.tasks
            .lock()
            .ok()
            .and_then(|mut map| map.remove(task_id))
    }

    /// 检查任务是否处于可派发新工作的状态。
    pub fn is_active(&self, task_id: &str) -> bool {
        self.get(task_id)
            .and_then(|h| h.result.lock().ok().map(|r| !r.status.is_terminal()))
            .unwrap_or(false)
    }

    /// 生成本地唯一的任务 ID（带时间戳和自增计数）。
    pub fn next_task_id() -> String {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        let seq = TASK_ID_COUNTER.fetch_add(1, Ordering::Relaxed);
        format!("batch-{ts:x}-{seq:x}")
    }

    /// 设置任务终态状态（汇总用）。
    pub fn set_status(&self, task_id: &str, status: BatchTaskStatus) {
        if let Some(handle) = self.get(task_id) {
            if let Ok(mut result) = handle.result.lock() {
                result.status = status;
            }
        }
    }
}

/// Tauri `State` 包装。命令函数通过 `State<'_, BatchTaskManagerState>` 拿到管理器。
#[derive(Clone)]
pub struct BatchTaskManagerState(pub Arc<BatchTaskManager>);
