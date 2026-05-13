//! 图片格式转换批量处理器（最小实现 / 占位）。
//!
//! 现阶段依赖 `image` crate 的 `save_with_format` 直接做格式转换。
//! 主要目的：验证 BatchProcessor 抽象能编译并通过类型分发。

use serde::Deserialize;
use serde_json::Value;
use std::path::PathBuf;
use std::sync::Arc;

use crate::batch::processor::{
    BatchItemContext, BatchItemOutput, BatchPrepareContext, BatchPrepared, BatchProcessor,
    NoopPrepared,
};
use crate::batch::tempfile::{
    allocate_unique_final_path, cleanup_temp, ensure_parent_dir, finalize_temp, temp_path_for,
};
use crate::batch::types::{BatchError, BatchTaskType};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConvertBatchOptions {
    target_format: String,
}

pub struct ImageConvertBatchProcessor;

impl BatchProcessor for ImageConvertBatchProcessor {
    fn task_type(&self) -> BatchTaskType {
        BatchTaskType::ImageConvert
    }

    fn validate(&self, options: &Value, _input_files: &[PathBuf]) -> Result<(), BatchError> {
        let opts: ConvertBatchOptions = serde_json::from_value(options.clone())
            .map_err(|err| BatchError::invalid_input(format!("格式转换参数不合法：{err}")))?;
        let ok = matches!(
            opts.target_format.to_ascii_lowercase().as_str(),
            "jpg" | "jpeg" | "png" | "webp" | "bmp"
        );
        if !ok {
            return Err(BatchError::invalid_input(
                "目标格式仅支持 jpg/jpeg/png/webp/bmp",
            ));
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
        let opts: ConvertBatchOptions = serde_json::from_value(ctx.options.clone())
            .map_err(|err| BatchError::invalid_input(format!("格式转换参数不合法：{err}")))?;
        let ext = match opts.target_format.to_ascii_lowercase().as_str() {
            "jpg" | "jpeg" => "jpg",
            "png" => "png",
            "webp" => "webp",
            "bmp" => "bmp",
            _ => "png",
        };
        let target_format = match ext {
            "jpg" => image::ImageFormat::Jpeg,
            "png" => image::ImageFormat::Png,
            "webp" => image::ImageFormat::WebP,
            "bmp" => image::ImageFormat::Bmp,
            _ => image::ImageFormat::Png,
        };

        let stem = ctx
            .item
            .input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        let final_path = allocate_unique_final_path(ctx.output_dir, stem, Some("converted"), ext);
        ensure_parent_dir(&final_path)?;
        let tmp_path = temp_path_for(&final_path);

        let decoded = image::ImageReader::open(&ctx.item.input_path)
            .map_err(|err| BatchError::io(format!("打开图片失败：{err}")))?
            .with_guessed_format()
            .map_err(|err| BatchError::deterministic(format!("识别图片格式失败：{err}")))?
            .decode()
            .map_err(|err| BatchError::deterministic(format!("解码图片失败：{err}")))?;

        match decoded.save_with_format(&tmp_path, target_format) {
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
                Err(BatchError::deterministic(format!("写出图片失败：{err}")))
            }
        }
    }
}
