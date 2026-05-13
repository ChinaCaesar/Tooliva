//! 图片压缩的批量处理器。
//!
//! 通过现有 `image_core::ImagePipeline` + `CompressProcessor` 完成单文件压缩，
//! 调度层负责并发、临时文件与失败隔离。

use serde::Deserialize;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use crate::batch::processor::{
    BatchItemContext, BatchItemOutput, BatchPrepareContext, BatchPrepared, BatchProcessor,
    NoopPrepared,
};
use crate::batch::tempfile::{
    allocate_unique_final_path, cleanup_temp, ensure_parent_dir, finalize_temp, temp_path_for,
};
use crate::batch::types::{BatchError, BatchTaskType};
use crate::image_core::pipeline::ImagePipeline;
use crate::image_core::tile::TileEngine;
use crate::image_core::types::{ProcessContext, ProcessingLimits, TileConfig};
use crate::image_processors::compress::processor::CompressProcessor;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompressBatchOptions {
    quality: u8,
    target_format: Option<String>,
    #[serde(default)]
    max_output_pixels: Option<u64>,
    #[serde(default)]
    max_memory_mb: Option<u64>,
}

pub struct ImageCompressBatchProcessor;

impl BatchProcessor for ImageCompressBatchProcessor {
    fn task_type(&self) -> BatchTaskType {
        BatchTaskType::ImageCompress
    }

    fn validate(&self, options: &Value, _input_files: &[PathBuf]) -> Result<(), BatchError> {
        let opts: CompressBatchOptions = serde_json::from_value(options.clone())
            .map_err(|err| BatchError::invalid_input(format!("压缩参数不合法：{err}")))?;
        if !(1..=100).contains(&opts.quality) {
            return Err(BatchError::invalid_input("压缩质量仅支持 1..100"));
        }
        Ok(())
    }

    fn prepare(&self, _ctx: &BatchPrepareContext) -> Result<Arc<dyn BatchPrepared>, BatchError> {
        Ok(Arc::new(NoopPrepared))
    }

    fn process_one(
        &self,
        ctx: &BatchItemContext<'_>,
        _prepared: &Arc<dyn BatchPrepared>,
    ) -> Result<BatchItemOutput, BatchError> {
        if ctx.cancel.is_cancelled() {
            return Err(BatchError::canceled());
        }
        let opts: CompressBatchOptions = serde_json::from_value(ctx.options.clone())
            .map_err(|err| BatchError::invalid_input(format!("压缩参数不合法：{err}")))?;

        let ext = resolve_target_ext(
            opts.target_format.as_deref(),
            ctx.item.input_path.extension().and_then(|e| e.to_str()),
        )?;
        let stem = ctx
            .item
            .input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        let final_path = allocate_unique_final_path(ctx.output_dir, stem, Some("compressed"), ext);
        ensure_parent_dir(&final_path)?;
        let tmp_path = temp_path_for(&final_path);

        let process_ctx = ProcessContext {
            task_id: ctx.task_id.to_string(),
            processor_key: "compress".to_string(),
            input_path: ctx.item.input_path.clone(),
            output_path: tmp_path.clone(),
            output_format: Some(ext.to_string()),
            params: json!({
                "quality": opts.quality,
                "targetFormat": ext
            }),
            limits: ProcessingLimits {
                max_output_side: 12_000,
                max_output_pixels: opts.max_output_pixels.unwrap_or(60_000_000),
                max_memory_mb: opts.max_memory_mb.unwrap_or(768),
            },
            tile: TileConfig {
                tile_size: 1024,
                tile_overlap: 16,
            },
        };

        let pipeline = ImagePipeline::new(TileEngine {
            tile_size: process_ctx.tile.tile_size,
            tile_overlap: process_ctx.tile.tile_overlap,
        });
        match pipeline.execute(&CompressProcessor, &process_ctx) {
            Ok(_) => {
                if ctx.cancel.is_cancelled() {
                    cleanup_temp(&tmp_path);
                    return Err(BatchError::canceled());
                }
                finalize_temp(&tmp_path, &final_path)?;
                Ok(BatchItemOutput {
                    output_path: final_path,
                    message: None,
                })
            }
            Err(err) => {
                cleanup_temp(&tmp_path);
                Err(map_image_error(err))
            }
        }
    }
}

fn resolve_target_ext(
    requested: Option<&str>,
    input_ext: Option<&str>,
) -> Result<&'static str, BatchError> {
    if let Some(format) = requested {
        return match format.to_ascii_lowercase().as_str() {
            "jpg" | "jpeg" => Ok("jpg"),
            "png" => Ok("png"),
            "webp" => Ok("webp"),
            _ => Err(BatchError::invalid_input("输出格式仅支持 jpg/jpeg/png/webp")),
        };
    }
    let ext = input_ext.unwrap_or("jpg").to_ascii_lowercase();
    Ok(match ext.as_str() {
        "jpg" | "jpeg" => "jpg",
        "png" => "png",
        "webp" => "webp",
        _ => "jpg",
    })
}

fn map_image_error(err: crate::image_core::error::ImagePipelineError) -> BatchError {
    use crate::image_core::error::ImagePipelineError as E;
    match err {
        E::InvalidInput(msg) => BatchError::invalid_input(msg),
        E::DecodeFailed(msg) | E::EncodeFailed(msg) | E::NotImplemented(msg) => {
            BatchError::deterministic(msg)
        }
        E::IoFailed(msg) => BatchError::io(msg),
        E::PlanFailed(msg) | E::Internal(msg) => BatchError::processor(msg),
    }
}

// 保留 `Path` 引用以避免 IDE 警告；当前文件不需要直接使用。
#[allow(dead_code)]
fn _ensure_path(_path: &Path) {}
