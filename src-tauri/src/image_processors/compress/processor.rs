use crate::image_core::error::ImagePipelineError;
use crate::image_core::pipeline::ProcessRuntime;
use crate::image_core::processor::ImageProcessor;
use crate::image_core::types::{LoadedImage, ProcessContext, ProcessOutput, ProcessPlan};

pub struct CompressProcessor;

impl ImageProcessor for CompressProcessor {
    fn key(&self) -> &'static str {
        "compress"
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
            "压缩处理器骨架已接入，请在此实现具体压缩算法".to_string(),
        ))
    }
}
