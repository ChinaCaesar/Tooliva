use crate::image_core::error::ImagePipelineError;
use crate::image_core::pipeline::ProcessRuntime;
use crate::image_core::processor::ImageProcessor;
use crate::image_core::types::{LoadedImage, ProcessContext, ProcessOutput, ProcessPlan};

pub struct WatermarkProcessor;

impl ImageProcessor for WatermarkProcessor {
    fn key(&self) -> &'static str {
        "watermark"
    }

    fn plan(&self, _ctx: &ProcessContext, input: &LoadedImage) -> Result<ProcessPlan, ImagePipelineError> {
        Ok(ProcessPlan {
            input_width: input.image.width(),
            input_height: input.image.height(),
            output_width: input.image.width(),
            output_height: input.image.height(),
            estimated_memory_mb: 64,
            total_steps: 100,
        })
    }

    fn process(
        &self,
        _ctx: &ProcessContext,
        _input: &LoadedImage,
        _plan: &ProcessPlan,
        _runtime: &ProcessRuntime,
    ) -> Result<ProcessOutput, ImagePipelineError> {
        Err(ImagePipelineError::NotImplemented(
            "水印处理器骨架已接入，请在此实现文本/图片水印算法".to_string(),
        ))
    }
}
