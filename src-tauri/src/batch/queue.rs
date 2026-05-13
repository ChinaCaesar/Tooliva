//! 简单线程安全 FIFO 队列。
//!
//! 调度层只需要「弹出下一个子任务」与「剩余数量」即可，
//! 不做优先级、不做插队、不做依赖图，保持本地轻量。

use std::collections::VecDeque;
use std::sync::Mutex;

use crate::batch::types::WorkItem;

pub struct WorkQueue {
    items: Mutex<VecDeque<WorkItem>>,
}

impl WorkQueue {
    pub fn from_items(items: Vec<WorkItem>) -> Self {
        Self {
            items: Mutex::new(items.into()),
        }
    }

    /// 弹出下一个子任务；若队列已空返回 `None`。
    pub fn pop(&self) -> Option<WorkItem> {
        self.items.lock().ok().and_then(|mut guard| guard.pop_front())
    }

    /// 当前剩余子任务数量。
    pub fn remaining(&self) -> usize {
        self.items.lock().map(|g| g.len()).unwrap_or(0)
    }

    /// 取消时清空所有未派发的子任务，防止 Worker 再继续取。
    pub fn clear(&self) {
        if let Ok(mut guard) = self.items.lock() {
            guard.clear();
        }
    }
}
