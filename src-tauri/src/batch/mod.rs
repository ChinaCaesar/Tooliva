//! 批量任务调度公共层。
//!
//! 本模块提供统一的本地批处理调度内核：任务模型、并发安全修正、队列、Worker、
//! 进度节流、暂停/继续/取消、临时文件机制与 Processor 抽象。
//!
//! 业务模块（图片水印、图片压缩、视频转 GIF 等）只需实现 [`processor::BatchProcessor`]
//! 即可复用整套调度能力，不需要重复实现并发与文件 IO 细节。

pub mod cancel;
pub mod config;
pub mod manager;
pub mod processor;
pub mod progress;
pub mod queue;
pub mod registry;
pub mod result;
pub mod scheduler;
pub mod tempfile;
pub mod types;
pub mod worker;

pub use cancel::CancelToken;
pub use config::{resolve_effective_concurrency, ConcurrencyPreset};
pub use manager::{BatchTaskManager, BatchTaskManagerState};
pub use processor::{
    BatchItemContext, BatchItemOutput, BatchPrepareContext, BatchPrepared, BatchProcessor,
    NoopPrepared,
};
pub use progress::{BatchProgressPayload, ProgressEmitter, BATCH_PROGRESS_EVENT};
pub use registry::BatchProcessorRegistry;
pub use result::{BatchItemFailure, BatchTaskResult};
pub use scheduler::start_batch_task;
pub use types::{BatchError, BatchTaskCategory, BatchTaskStatus, BatchTaskType, SubmitBatchTaskPayload};
