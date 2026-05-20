//! AI inpainting batch processor for manually selected watermark regions.

use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;

use crate::ai_worker::{
    append_perf_log, ensure_lama_worker_ready, inpaint_image_with_lama, InpaintImageRequest,
};
use crate::batch::processor::{
    BatchItemContext, BatchItemOutput, BatchPrepareContext, BatchPrepared, BatchProcessor,
};
use crate::batch::tempfile::{allocate_unique_final_path, ensure_parent_dir};
use crate::batch::types::{BatchError, BatchTaskType};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InpaintRegion {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiInpaintOptions {
    regions_by_file: HashMap<String, Vec<InpaintRegion>>,
    #[serde(default = "default_output_format")]
    output_format: String,
    #[serde(default = "default_mode")]
    mode: String,
}

#[derive(Debug, Clone)]
struct AiInpaintPrepared {
    options: AiInpaintOptions,
}

impl BatchPrepared for AiInpaintPrepared {
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

pub struct AiInpaintBatchProcessor;

impl BatchProcessor for AiInpaintBatchProcessor {
    fn task_type(&self) -> BatchTaskType {
        BatchTaskType::AiInpaint
    }

    fn validate(&self, options: &Value, input_files: &[PathBuf]) -> Result<(), BatchError> {
        let parsed = parse_options(options)?;
        normalize_format_option(&parsed.output_format)?;
        normalize_mode(&parsed.mode)?;
        for input in input_files {
            if !is_supported_image_ext(input) {
                return Err(BatchError::invalid_input(format!(
                    "AI watermark removal only supports PNG/JPG/JPEG/WEBP/BMP: {}",
                    input.display()
                )));
            }
            if parsed.output_format.trim().eq_ignore_ascii_case("auto") {
                resolve_auto_format(input)?;
            }
            let regions = regions_for_path(&parsed, input).ok_or_else(|| {
                BatchError::invalid_input(format!(
                    "Missing watermark selection regions for image: {}",
                    input.display()
                ))
            })?;
            if regions.is_empty() {
                return Err(BatchError::invalid_input(format!(
                    "Image has no valid watermark selection regions: {}",
                    input.display()
                )));
            }
            for region in regions {
                validate_region(region)?;
            }
        }
        Ok(())
    }

    fn prepare(&self, ctx: &BatchPrepareContext) -> Result<Arc<dyn BatchPrepared>, BatchError> {
        let started = Instant::now();
        let options = parse_options(&ctx.options)?;
        let mode = normalize_mode(&options.mode)?;
        ensure_lama_worker_ready(mode == "quality").map_err(BatchError::deterministic)?;
        log_inpaint_perf(&format!(
            "[ai-inpaint-perf] stage=prepare mode={} duration_ms={}",
            mode,
            started.elapsed().as_millis()
        ));
        Ok(Arc::new(AiInpaintPrepared { options }))
    }

    fn process_one(
        &self,
        ctx: &BatchItemContext<'_>,
        prepared: &Arc<dyn BatchPrepared>,
    ) -> Result<BatchItemOutput, BatchError> {
        if ctx.cancel.is_cancelled() {
            return Err(BatchError::canceled());
        }
        let prepared = prepared
            .as_any()
            .downcast_ref::<AiInpaintPrepared>()
            .ok_or_else(|| BatchError::processor("AI inpaint prepared state is missing"))?;
        let item_started = Instant::now();
        let regions =
            regions_for_path(&prepared.options, &ctx.item.input_path).ok_or_else(|| {
                BatchError::invalid_input(format!(
                    "Missing watermark selection regions for image: {}",
                    ctx.item.input_path.display()
                ))
            })?;
        let format = resolve_output_format(&prepared.options.output_format, &ctx.item.input_path)?;
        let mode = normalize_mode(&prepared.options.mode)?;
        let stem = ctx
            .item
            .input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        let final_path =
            allocate_unique_final_path(ctx.output_dir, stem, Some("no_watermark"), &format);
        ensure_parent_dir(&final_path)?;

        let regions = regions_to_sidecar(regions);
        if ctx.cancel.is_cancelled() {
            let _ = std::fs::remove_file(&final_path);
            return Err(BatchError::canceled());
        }

        let worker_started = Instant::now();
        if let Err(err) = inpaint_image_with_lama(InpaintImageRequest {
            input_path: ctx.item.input_path.clone(),
            output_path: final_path.clone(),
            regions,
            output_format: format,
            mode,
        }) {
            let _ = std::fs::remove_file(&final_path);
            return Err(BatchError::processor(format!(
                "AI watermark removal failed: {err}"
            )));
        }
        log_inpaint_perf(&format!(
            "[ai-inpaint-perf] stage=worker-call input=\"{}\" output=\"{}\" duration_ms={}",
            ctx.item.input_path.display(),
            final_path.display(),
            worker_started.elapsed().as_millis()
        ));
        if !final_path.exists() {
            return Err(BatchError::deterministic(
                "AI watermark removal did not generate an output file",
            ));
        }
        log_inpaint_perf(&format!(
            "[ai-inpaint-perf] stage=process-one input=\"{}\" duration_ms={}",
            ctx.item.input_path.display(),
            item_started.elapsed().as_millis()
        ));
        Ok(BatchItemOutput {
            output_path: final_path,
            message: None,
        })
    }
}

fn parse_options(options: &Value) -> Result<AiInpaintOptions, BatchError> {
    serde_json::from_value(options.clone())
        .map_err(|err| BatchError::invalid_input(format!("Invalid AI inpaint options: {err}")))
}

fn default_output_format() -> String {
    "auto".to_string()
}

fn default_mode() -> String {
    "standard".to_string()
}

fn normalize_format_option(value: &str) -> Result<String, BatchError> {
    let fmt = value.trim().to_ascii_lowercase();
    match fmt.as_str() {
        "auto" | "png" | "jpg" | "jpeg" | "webp" | "bmp" => Ok(fmt),
        _ => Err(BatchError::invalid_input(
            "AI watermark removal only supports original format, PNG, JPG, WEBP, or BMP output",
        )),
    }
}

fn normalize_mode(value: &str) -> Result<String, BatchError> {
    let mode = value.trim().to_ascii_lowercase();
    match mode.as_str() {
        "standard" | "quality" => Ok(mode),
        _ => Err(BatchError::invalid_input(
            "AI watermark removal mode must be standard or quality",
        )),
    }
}

fn resolve_output_format(value: &str, input_path: &Path) -> Result<String, BatchError> {
    let normalized = normalize_format_option(value)?;
    if normalized == "auto" {
        return resolve_auto_format(input_path);
    }
    Ok(normalized)
}

fn resolve_auto_format(input_path: &Path) -> Result<String, BatchError> {
    input_path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .filter(|ext| matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp" | "bmp"))
        .ok_or_else(|| {
            BatchError::invalid_input(format!(
                "Unable to infer original output format from image: {}",
                input_path.display()
            ))
        })
}

fn regions_for_path<'a>(
    options: &'a AiInpaintOptions,
    path: &Path,
) -> Option<&'a Vec<InpaintRegion>> {
    let exact = path.display().to_string();
    options.regions_by_file.get(&exact).or_else(|| {
        let normalized = exact.replace('\\', "/").to_lowercase();
        options
            .regions_by_file
            .iter()
            .find(|(key, _)| key.replace('\\', "/").to_lowercase() == normalized)
            .map(|(_, value)| value)
    })
}

fn validate_region(region: &InpaintRegion) -> Result<(), BatchError> {
    let values = [region.x, region.y, region.width, region.height];
    if values.iter().any(|v| !v.is_finite()) {
        return Err(BatchError::invalid_input(
            "Watermark selection region contains invalid numeric values",
        ));
    }
    if region.width <= 0.0 || region.height <= 0.0 {
        return Err(BatchError::invalid_input(
            "Watermark selection region width and height must be greater than 0",
        ));
    }
    if region.x < 0.0 || region.y < 0.0 || region.x > 100.0 || region.y > 100.0 {
        return Err(BatchError::invalid_input(
            "Watermark selection coordinates must be within 0..100",
        ));
    }
    Ok(())
}

fn regions_to_sidecar(regions: &[InpaintRegion]) -> Vec<serde_json::Value> {
    regions
        .iter()
        .map(|r| {
            serde_json::json!({
                "x": (r.x / 100.0).clamp(0.0, 1.0),
                "y": (r.y / 100.0).clamp(0.0, 1.0),
                "width": (r.width / 100.0).clamp(0.0, 1.0),
                "height": (r.height / 100.0).clamp(0.0, 1.0),
            })
        })
        .collect()
}

fn is_supported_image_ext(path: &Path) -> bool {
    const EXTS: &[&str] = &["png", "jpg", "jpeg", "webp", "bmp"];
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| EXTS.iter().any(|x| x.eq_ignore_ascii_case(e)))
        .unwrap_or(false)
}

fn log_inpaint_perf(message: &str) {
    eprintln!("{message}");
    append_perf_log(message);
}
