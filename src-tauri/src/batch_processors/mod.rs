//! 业务批量处理器集合。
//!
//! 调度层（`crate::batch`）只看到统一的 `BatchProcessor` 抽象，
//! 各具体处理器在这里组合现有的单图算法 / FFmpeg 命令等基础能力。

pub mod ai_inpaint;
pub mod gif_compress;
pub mod gif_compress_config;
pub mod gif_compress_filter;
pub mod image_compress;
pub mod image_convert;
pub mod image_watermark;
pub mod registry;
pub mod video_to_gif;
pub mod video_watermark_removal;

pub use registry::build_default_batch_registry;
