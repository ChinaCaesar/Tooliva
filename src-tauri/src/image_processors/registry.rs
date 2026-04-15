use crate::image_core::registry::ProcessorRegistry;
use crate::image_processors::compress::processor::CompressProcessor;
use crate::image_processors::convert::processor::ConvertProcessor;
use crate::image_processors::upscale::processor::UpscaleProcessor;
use crate::image_processors::watermark::processor::WatermarkProcessor;
use std::sync::Arc;

pub fn build_default_registry() -> ProcessorRegistry {
    let mut registry = ProcessorRegistry::default();
    registry.register(Arc::new(UpscaleProcessor));
    registry.register(Arc::new(CompressProcessor));
    registry.register(Arc::new(WatermarkProcessor));
    registry.register(Arc::new(ConvertProcessor));
    registry
}
