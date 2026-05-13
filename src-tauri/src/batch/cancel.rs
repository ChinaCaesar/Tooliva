//! 取消与暂停令牌。
//!
//! 调度器为每个 `task_id` 创建一个 `CancelToken`，所有 Worker 共享。
//! 视频/AI 等需要管理子进程的 Processor 可以把 `Child` 注册进来，
//! 取消时由调度层统一 `kill`。

use std::process::Child;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

/// 暂停 / 取消信号 + 子进程注册表。
///
/// 设计要点：
/// - 暂停（`paused`）：Worker 拉取下一个子任务前发现已暂停则 spin/sleep 等待，
///   已在执行的子任务自然结束，不强制中断。
/// - 取消（`cancelled`）：Worker 立刻退出循环；同时杀死所有已注册子进程。
pub struct CancelToken {
    cancelled: AtomicBool,
    paused: AtomicBool,
    children: Mutex<Vec<std::sync::Arc<Mutex<Child>>>>,
}

impl Default for CancelToken {
    fn default() -> Self {
        Self::new()
    }
}

impl CancelToken {
    pub fn new() -> Self {
        Self {
            cancelled: AtomicBool::new(false),
            paused: AtomicBool::new(false),
            children: Mutex::new(Vec::new()),
        }
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Acquire)
    }

    pub fn is_paused(&self) -> bool {
        self.paused.load(Ordering::Acquire)
    }

    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::Release);
        self.kill_registered_children();
    }

    pub fn pause(&self) {
        self.paused.store(true, Ordering::Release);
    }

    pub fn resume(&self) {
        self.paused.store(false, Ordering::Release);
    }

    /// Processor 在启动 `Child`（例如 FFmpeg）后调用，注册到当前任务取消域。
    /// 返回的 `Arc<Mutex<Child>>` 同时给 Processor 自己读取/等待使用。
    pub fn register_child(&self, child: Child) -> std::sync::Arc<Mutex<Child>> {
        let shared = std::sync::Arc::new(Mutex::new(child));
        if let Ok(mut list) = self.children.lock() {
            list.push(shared.clone());
        }
        shared
    }

    /// Processor 在子进程自然结束后调用，避免长任务列表越积越多。
    pub fn forget_child(&self, target: &std::sync::Arc<Mutex<Child>>) {
        if let Ok(mut list) = self.children.lock() {
            list.retain(|item| !std::sync::Arc::ptr_eq(item, target));
        }
    }

    fn kill_registered_children(&self) {
        if let Ok(mut list) = self.children.lock() {
            for child in list.drain(..) {
                if let Ok(mut guard) = child.lock() {
                    // 尽力终止；失败时也不阻塞调度层
                    let _ = guard.kill();
                }
            }
        }
    }
}
