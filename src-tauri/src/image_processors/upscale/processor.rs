use crate::image_core::error::ImagePipelineError;
use crate::image_core::pipeline::ProcessRuntime;
use crate::image_core::processor::ImageProcessor;
use crate::image_core::tile::{TileAlgorithm, TileRect, TileResult};
use crate::image_core::types::{LoadedImage, ProcessContext, ProcessOutput, ProcessPlan, ProgressEvent};
use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, RgbaImage};
use serde::Deserialize;

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpscaleQualityMode {
    Fast,
    Balanced,
    Quality,
}

impl Default for UpscaleQualityMode {
    fn default() -> Self {
        Self::Fast
    }
}

impl UpscaleQualityMode {
    fn filter(self) -> FilterType {
        match self {
            Self::Fast => FilterType::Triangle,
            Self::Balanced => FilterType::CatmullRom,
            Self::Quality => FilterType::Lanczos3,
        }
    }
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpscaleBackend {
    Auto,
    Cpu,
    Gpu,
    Ai,
}

impl Default for UpscaleBackend {
    fn default() -> Self {
        Self::Auto
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpscaleParams {
    pub scale_factor: u8,
    pub quality_mode: Option<UpscaleQualityMode>,
    pub backend_preference: Option<UpscaleBackend>,
}

pub struct UpscaleProcessor;

impl ImageProcessor for UpscaleProcessor {
    fn key(&self) -> &'static str {
        "upscale"
    }

    fn plan(&self, ctx: &ProcessContext, input: &LoadedImage) -> Result<ProcessPlan, ImagePipelineError> {
        let params = parse_params(ctx)?;
        if !matches!(params.scale_factor, 2 | 4 | 8) {
            return Err(ImagePipelineError::InvalidInput("仅支持 2/4/8 倍放大".to_string()));
        }
        let output_width = input.image.width().saturating_mul(params.scale_factor as u32);
        let output_height = input.image.height().saturating_mul(params.scale_factor as u32);
        if output_width > ctx.limits.max_output_side || output_height > ctx.limits.max_output_side {
            return Err(ImagePipelineError::PlanFailed(format!(
                "输出尺寸 {}x{} 超出上限 {}",
                output_width, output_height, ctx.limits.max_output_side
            )));
        }
        let output_pixels = (output_width as u64).saturating_mul(output_height as u64);
        if output_pixels > ctx.limits.max_output_pixels {
            return Err(ImagePipelineError::PlanFailed("输出像素超出上限".to_string()));
        }
        let estimated_memory_mb = estimate_memory_mb(
            input.image.width(),
            input.image.height(),
            output_width,
            output_height,
        );
        if estimated_memory_mb > ctx.limits.max_memory_mb {
            return Err(ImagePipelineError::PlanFailed("预计内存超限".to_string()));
        }
        Ok(ProcessPlan {
            input_width: input.image.width(),
            input_height: input.image.height(),
            output_width,
            output_height,
            estimated_memory_mb,
            total_steps: 100,
        })
    }

    fn process(
        &self,
        ctx: &ProcessContext,
        input: &LoadedImage,
        plan: &ProcessPlan,
        runtime: &ProcessRuntime,
    ) -> Result<ProcessOutput, ImagePipelineError> {
        let params = parse_params(ctx)?;
        let quality = params.quality_mode.unwrap_or_default();
        let _backend = params.backend_preference.unwrap_or_default();
        let source = input.image.to_rgba8();
        let algo = UpscaleTileAlgorithm {
            filter: quality.filter(),
        };
        let output = runtime
            .tile_engine
            .run_tiled(&source, plan, &algo, |done, total| {
                let ratio = if total == 0 { 0.0 } else { done as f32 / total as f32 };
                let progress = (12.0 + ratio * 80.0).round().clamp(12.0, 92.0) as u8;
                runtime.progress.emit(ProgressEvent::stage(
                    &ctx.task_id,
                    &ctx.processor_key,
                    "processing",
                    progress,
                    None,
                ));
            })?;
        let dyn_output = DynamicImage::ImageRgba8(output);
        runtime
            .io
            .save(&dyn_output, &ctx.output_path, Some(input.format))?;
        Ok(ProcessOutput {
            output_path: ctx.output_path.clone(),
            output_width: plan.output_width,
            output_height: plan.output_height,
            backend_used: "cpu".to_string(),
            metadata: serde_json::json!({ "qualityMode": format!("{:?}", quality).to_lowercase() }),
        })
    }
}

struct UpscaleTileAlgorithm {
    filter: FilterType,
}

impl TileAlgorithm for UpscaleTileAlgorithm {
    fn process_tile(&self, source: &RgbaImage, rect: TileRect, plan: &ProcessPlan) -> Result<TileResult, ImagePipelineError> {
        let view = source.view(rect.x, rect.y, rect.width, rect.height);
        let scale_x = plan.output_width as f32 / source.width() as f32;
        let scale_y = plan.output_height as f32 / source.height() as f32;
        let tile = image::imageops::resize(
            &view.to_image(),
            ((rect.width as f32) * scale_x).round().max(1.0) as u32,
            ((rect.height as f32) * scale_y).round().max(1.0) as u32,
            self.filter,
        );
        Ok(TileResult {
            image: tile,
            dst_x: ((rect.x as f32) * scale_x).round() as u32,
            dst_y: ((rect.y as f32) * scale_y).round() as u32,
        })
    }
}

fn parse_params(ctx: &ProcessContext) -> Result<UpscaleParams, ImagePipelineError> {
    serde_json::from_value(ctx.params.clone())
        .map_err(|err| ImagePipelineError::InvalidInput(format!("放大参数不合法：{err}")))
}

fn estimate_memory_mb(input_width: u32, input_height: u32, output_width: u32, output_height: u32) -> u64 {
    let input_bytes = (input_width as u64)
        .saturating_mul(input_height as u64)
        .saturating_mul(4);
    let output_bytes = (output_width as u64)
        .saturating_mul(output_height as u64)
        .saturating_mul(4);
    (input_bytes.saturating_add(output_bytes).saturating_mul(2) / (1024 * 1024)).max(1)
}
