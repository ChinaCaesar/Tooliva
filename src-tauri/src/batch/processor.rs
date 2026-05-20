//! BatchProcessor 抽象接口。
//!
//! 设计原则：调度器不关心业务，只负责调用 Processor 执行单文件任务。
//!
//! 资源复用：通过 `prepare` 在批量开始前生成一份共享资源（例如水印字体、
//! 预加载水印图）。`process_one` 拿到 `&Arc<dyn BatchPrepared>`，可下转到具体类型，
//! 在每个文件处理时复用，避免重复读盘。

use serde_json::Value;
use std::any::Any;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use crate::batch::cancel::CancelToken;
use crate::batch::progress::ProgressEmitter;
use crate::batch::types::{BatchError, BatchTaskCategory, BatchTaskType, WorkItem};

/// 批量准备阶段的上下文：处理器可读取所有输入文件元信息与任务参数。
#[derive(Debug, Clone)]
pub struct BatchPrepareContext {
    pub task_id: String,
    pub task_type: BatchTaskType,
    pub input_files: Vec<PathBuf>,
    pub output_dir: PathBuf,
    pub options: Value,
}

/// 单文件执行上下文。Processor 只看到一条 `WorkItem`，不感知队列与并发。
pub struct BatchItemContext<'a> {
    pub task_id: &'a str,
    pub task_type: BatchTaskType,
    pub item: WorkItem,
    pub output_dir: &'a Path,
    pub options: &'a Value,
    pub cancel: &'a CancelToken,
    pub progress: &'a ProgressEmitter,
}

/// 单文件执行成功后的输出快照。
#[derive(Debug, Clone)]
pub struct BatchItemOutput {
    pub output_path: PathBuf,
    pub message: Option<String>,
}

/// 批量预备资源占位 trait；具体处理器可在 `prepare` 返回包含自身数据的实现。
pub trait BatchPrepared: Send + Sync + Any {
    fn as_any(&self) -> &dyn Any;
}

/// 不需要预备资源时使用的默认实现。
pub struct NoopPrepared;

impl BatchPrepared for NoopPrepared {
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// 业务处理器需实现的统一接口。
pub trait BatchProcessor: Send + Sync {
    /// 处理器对应的任务类型；调度层据此查找 Processor。
    fn task_type(&self) -> BatchTaskType;

    /// 任务大类（图片 / 视频 / AI），用于并发预设决策。默认按 `task_type` 推导。
    fn category(&self) -> BatchTaskCategory {
        self.task_type().category()
    }

    /// 提交时的整体参数校验；返回错误会让任务直接失败，不进入队列。
    fn validate(&self, _options: &Value, _input_files: &[PathBuf]) -> Result<(), BatchError> {
        Ok(())
    }

    /// 批量开始前的资源准备（例如加载字体、解码水印源图）。
    /// 默认返回空实现。
    fn prepare(&self, _ctx: &BatchPrepareContext) -> Result<Arc<dyn BatchPrepared>, BatchError> {
        Ok(Arc::new(NoopPrepared))
    }

    /// 单文件处理；返回成功的输出路径或可重试 / 不可重试错误。
    fn process_one(
        &self,
        ctx: &BatchItemContext<'_>,
        prepared: &Arc<dyn BatchPrepared>,
    ) -> Result<BatchItemOutput, BatchError>;
}
