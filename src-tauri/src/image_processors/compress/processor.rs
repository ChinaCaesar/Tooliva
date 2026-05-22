use crate::image_core::error::ImagePipelineError;
use crate::image_core::pipeline::ProcessRuntime;
use crate::image_core::processor::ImageProcessor;
use crate::image_core::types::{
    LoadedImage, ProcessContext, ProcessOutput, ProcessPlan, ProgressEvent,
};
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::{
    CompressionType as PngCompressionType, FilterType as PngFilterType, PngEncoder,
};
use image::codecs::webp::WebPEncoder;
use image::{ExtendedColorType, ImageEncoder};
use serde::Deserialize;
use std::fs;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompressParams {
    quality: u8,
    target_format: Option<String>,
}

pub struct CompressProcessor;

impl ImageProcessor for CompressProcessor {
    fn key(&self) -> &'static str {
        "compress"
    }

    fn plan(
        &self,
        ctx: &ProcessContext,
        input: &LoadedImage,
    ) -> Result<ProcessPlan, ImagePipelineError> {
        let params = parse_params(ctx)?;
        if !(1..=100).contains(&params.quality) {
            return Err(ImagePipelineError::InvalidInput(
                "压缩质量仅支持 1..100".to_string(),
            ));
        }
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
        ctx: &ProcessContext,
        input: &LoadedImage,
        _plan: &ProcessPlan,
        runtime: &ProcessRuntime,
    ) -> Result<ProcessOutput, ImagePipelineError> {
        let params = parse_params(ctx)?;
        runtime.progress.emit(ProgressEvent::stage(
            &ctx.task_id,
            &ctx.processor_key,
            "processing",
            45,
            Some("压缩编码中".to_string()),
        ));

        runtime.io.ensure_parent_dir(&ctx.output_path)?;
        let target_format = normalize_format(params.target_format.as_deref(), &ctx.output_format)?;
        let encoded = encode_image(input, target_format, params.quality)?;
        let input_bytes = fs::read(&ctx.input_path)
            .map_err(|err| ImagePipelineError::IoFailed(format!("读取源文件失败：{err}")))?;
        let fallback_to_source = should_fallback_to_source(
            &ctx.output_format,
            target_format,
            input_bytes.len(),
            encoded.len(),
        );
        let output_bytes = if fallback_to_source {
            input_bytes
        } else {
            encoded
        };
        fs::write(&ctx.output_path, output_bytes)
            .map_err(|err| ImagePipelineError::IoFailed(format!("写入输出文件失败：{err}")))?;

        runtime.progress.emit(ProgressEvent::stage(
            &ctx.task_id,
            &ctx.processor_key,
            "saving",
            90,
            Some("写入文件中".to_string()),
        ));
        Ok(ProcessOutput {
            output_path: ctx.output_path.clone(),
            output_width: input.image.width(),
            output_height: input.image.height(),
            backend_used: "cpu".to_string(),
            metadata: serde_json::json!({
                "quality": params.quality,
                "targetFormat": target_format.as_str()
            }),
        })
    }
}

#[derive(Debug, Clone, Copy)]
enum CompressTargetFormat {
    Jpeg,
    Webp,
    Png,
}

impl CompressTargetFormat {
    fn as_str(self) -> &'static str {
        match self {
            Self::Jpeg => "jpeg",
            Self::Webp => "webp",
            Self::Png => "png",
        }
    }
}

fn parse_params(ctx: &ProcessContext) -> Result<CompressParams, ImagePipelineError> {
    serde_json::from_value(ctx.params.clone())
        .map_err(|err| ImagePipelineError::InvalidInput(format!("压缩参数不合法：{err}")))
}

fn normalize_format(
    requested: Option<&str>,
    fallback: &Option<String>,
) -> Result<CompressTargetFormat, ImagePipelineError> {
    let target = requested
        .map(|x| x.to_ascii_lowercase())
        .or_else(|| fallback.as_ref().map(|x| x.to_ascii_lowercase()))
        .unwrap_or_else(|| "jpeg".to_string());
    match target.as_str() {
        "jpg" | "jpeg" => Ok(CompressTargetFormat::Jpeg),
        "webp" => Ok(CompressTargetFormat::Webp),
        "png" => Ok(CompressTargetFormat::Png),
        _ => Err(ImagePipelineError::InvalidInput(
            "压缩仅支持 jpg/jpeg/webp/png 输出".to_string(),
        )),
    }
}

fn encode_image(
    input: &LoadedImage,
    target_format: CompressTargetFormat,
    quality: u8,
) -> Result<Vec<u8>, ImagePipelineError> {
    let mut output = Vec::<u8>::new();
    match target_format {
        CompressTargetFormat::Jpeg => {
            let rgb = input.image.to_rgb8();
            let mut encoder = JpegEncoder::new_with_quality(&mut output, quality);
            encoder
                .encode(
                    rgb.as_raw(),
                    rgb.width(),
                    rgb.height(),
                    ExtendedColorType::Rgb8,
                )
                .map_err(|err| ImagePipelineError::EncodeFailed(err.to_string()))?;
        }
        CompressTargetFormat::Webp => {
            let rgba = input.image.to_rgba8();
            let encoder = WebPEncoder::new_lossless(&mut output);
            encoder
                .write_image(
                    rgba.as_raw(),
                    rgba.width(),
                    rgba.height(),
                    ExtendedColorType::Rgba8,
                )
                .map_err(|err| ImagePipelineError::EncodeFailed(err.to_string()))?;
        }
        CompressTargetFormat::Png => {
            let rgba = input.image.to_rgba8();
            let encoder = PngEncoder::new_with_quality(
                &mut output,
                PngCompressionType::Best,
                PngFilterType::Adaptive,
            );
            encoder
                .write_image(
                    rgba.as_raw(),
                    rgba.width(),
                    rgba.height(),
                    ExtendedColorType::Rgba8,
                )
                .map_err(|err| ImagePipelineError::EncodeFailed(err.to_string()))?;
        }
    }
    Ok(output)
}

fn should_fallback_to_source(
    output_format: &Option<String>,
    target_format: CompressTargetFormat,
    source_size: usize,
    encoded_size: usize,
) -> bool {
    if encoded_size <= source_size {
        return false;
    }
    let source_format = output_format
        .as_deref()
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_default();
    matches!(
        (target_format, source_format.as_str()),
        (CompressTargetFormat::Jpeg, "jpg" | "jpeg")
            | (CompressTargetFormat::Png, "png")
            | (CompressTargetFormat::Webp, "webp")
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{DynamicImage, ImageBuffer, ImageFormat, Rgba};

    fn sample_loaded_image() -> LoadedImage {
        let image = ImageBuffer::from_fn(320, 240, |x, y| {
            let r = ((x * 13 + y * 7) % 256) as u8;
            let g = ((x * 5 + y * 17) % 256) as u8;
            let b = ((x * 23 + y * 3) % 256) as u8;
            Rgba([r, g, b, 255])
        });

        LoadedImage {
            image: DynamicImage::ImageRgba8(image),
            format: ImageFormat::Jpeg,
        }
    }

    #[test]
    fn jpeg_encoder_respects_lower_quality_values() {
        let input = sample_loaded_image();

        let default_quality = encode_image(&input, CompressTargetFormat::Jpeg, 80).unwrap();
        let high_quality = encode_image(&input, CompressTargetFormat::Jpeg, 92).unwrap();

        assert!(
            default_quality.len() < high_quality.len(),
            "expected JPEG quality 80 to be smaller than quality 92, got {} >= {} bytes",
            default_quality.len(),
            high_quality.len()
        );
    }
}
