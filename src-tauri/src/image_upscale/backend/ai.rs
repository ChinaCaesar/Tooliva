use crate::image_upscale::types::UpscaleRequest;
use image::{DynamicImage, RgbaImage};

pub trait AiSuperResolutionBackend: Send + Sync {
    fn name(&self) -> &'static str;
    fn upscale(
        &self,
        _input: &DynamicImage,
        _request: &UpscaleRequest,
        _output_width: u32,
        _output_height: u32,
    ) -> Result<RgbaImage, String>;
}

pub fn try_upscale_with_ai(
    _input: &DynamicImage,
    _request: &UpscaleRequest,
    _output_width: u32,
    _output_height: u32,
) -> Result<RgbaImage, String> {
    Err("AI 超分后端暂未接入，可在此扩展 Real-ESRGAN / NCNN / ONNX Runtime".to_string())
}
