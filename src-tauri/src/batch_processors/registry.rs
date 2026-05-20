//! 默认 BatchProcessor 注册。
//!
//! 在 `lib.rs` 中通过 [`build_default_batch_registry`] 注入到全局 `BatchTaskManager`。

use std::sync::Arc;

use crate::batch::registry::BatchProcessorRegistry;
use crate::batch_processors::ai_inpaint::AiInpaintBatchProcessor;
use crate::batch_processors::gif_compress::GifCompressBatchProcessor;
use crate::batch_processors::image_compress::ImageCompressBatchProcessor;
use crate::batch_processors::image_convert::ImageConvertBatchProcessor;
use crate::batch_processors::image_watermark::ImageWatermarkBatchProcessor;
use crate::batch_processors::video_to_gif::VideoToGifBatchProcessor;
use crate::batch_processors::video_watermark_removal::VideoWatermarkRemovalBatchProcessor;

pub fn build_default_batch_registry() -> BatchProcessorRegistry {
    let mut registry = BatchProcessorRegistry::default();
    registry.register(Arc::new(ImageWatermarkBatchProcessor));
    registry.register(Arc::new(ImageCompressBatchProcessor));
    registry.register(Arc::new(ImageConvertBatchProcessor));
    registry.register(Arc::new(VideoToGifBatchProcessor));
    registry.register(Arc::new(VideoWatermarkRemovalBatchProcessor));
    registry.register(Arc::new(GifCompressBatchProcessor));
    registry.register(Arc::new(AiInpaintBatchProcessor));
    registry
}
