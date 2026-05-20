use crate::image_core::error::ImagePipelineError;
use crate::image_core::types::{LoadedImage, ProcessContext, ProcessOutput, ProcessPlan};

pub trait ImageProcessor: Send + Sync {
    fn key(&self) -> &'static str;
    fn plan(
        &self,
        ctx: &ProcessContext,
        input: &LoadedImage,
    ) -> Result<ProcessPlan, ImagePipelineError>;
    fn process(
        &self,
        ctx: &ProcessContext,
        input: &LoadedImage,
        plan: &ProcessPlan,
        runtime: &crate::image_core::pipeline::ProcessRuntime,
    ) -> Result<ProcessOutput, ImagePipelineError>;
}
