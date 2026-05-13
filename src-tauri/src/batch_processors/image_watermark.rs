//! 图片加水印的批量处理器。
//!
//! 资源生命周期（满足 spec § 十三 资源复用要求）：
//! - `prepare`：一次性解析参数、加载系统字体（文字模式）、解码水印源图（图片模式），
//!   存入 [`WatermarkBatchPrepared`]。整个批量任务内所有 Worker 共享同一份 Arc。
//! - `process_one`：仅做「打开当前输入图 → 用缓存资源构建该图尺寸下的 overlay →
//!   合成 → 通过 .tmp + rename 写盘」。每张图处理完毕由 Rust 局部作用域释放大图内存。

use ab_glyph::FontArc;
use image::{DynamicImage, ImageFormat, ImageReader};
use serde::Deserialize;
use serde_json::Value;
use std::any::Any;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use crate::batch::processor::{
    BatchItemContext, BatchItemOutput, BatchPrepareContext, BatchPrepared, BatchProcessor,
};
use crate::batch::tempfile::{
    allocate_unique_final_path, cleanup_temp, ensure_parent_dir, finalize_temp, temp_path_for,
};
use crate::batch::types::{BatchError, BatchTaskType};
use crate::image_core::types::LoadedImage;
use crate::image_processors::watermark::processor::{
    build_image_overlay_with_cache, build_text_overlay_with_cache, composite_and_save_watermark,
    decode_watermark_image, is_image_mode, is_text_mode, load_watermark_font,
    parse_watermark_params, WatermarkParams,
};

/// 批量内共享的水印资源缓存。
pub struct WatermarkBatchPrepared {
    pub params: WatermarkParams,
    pub font: Option<FontArc>,
    pub watermark_source: Option<DynamicImage>,
}

impl BatchPrepared for WatermarkBatchPrepared {
    fn as_any(&self) -> &dyn Any {
        self
    }
}

pub struct ImageWatermarkBatchProcessor;

/// 用于批量任务的精简参数视图，仅用于 `validate` 阶段的轻量类型检查。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WatermarkValidateView {
    #[allow(dead_code)]
    mode: Option<String>,
}

impl BatchProcessor for ImageWatermarkBatchProcessor {
    fn task_type(&self) -> BatchTaskType {
        BatchTaskType::ImageWatermark
    }

    fn validate(&self, options: &Value, input_files: &[PathBuf]) -> Result<(), BatchError> {
        let _: WatermarkValidateView = serde_json::from_value(options.clone())
            .map_err(|err| BatchError::invalid_input(format!("水印参数不合法：{err}")))?;
        let params = parse_watermark_params(options).map_err(map_image_error)?;
        // 图片模式必须存在水印图片
        if is_image_mode(&params) {
            let watermark_path = params
                .image_path
                .as_deref()
                .ok_or_else(|| BatchError::invalid_input("图片水印模式必须提供水印图片"))?;
            let path = PathBuf::from(watermark_path);
            if !path.exists() || !path.is_file() {
                return Err(BatchError::invalid_input(format!(
                    "水印图片不存在：{}",
                    path.display()
                )));
            }
        }
        // 输入文件后缀基本校验（支持的图像格式）
        for input in input_files {
            if !is_supported_image_ext(input) {
                return Err(BatchError::invalid_input(format!(
                    "仅支持 PNG/JPG/JPEG/WEBP/BMP 格式：{}",
                    input.display()
                )));
            }
        }
        Ok(())
    }

    fn prepare(&self, ctx: &BatchPrepareContext) -> Result<Arc<dyn BatchPrepared>, BatchError> {
        // 解析一次参数，所有 Worker 共享
        let params = parse_watermark_params(&ctx.options).map_err(map_image_error)?;
        // 文字模式：一次性加载字体
        let font = if is_text_mode(&params) {
            Some(load_watermark_font().map_err(map_image_error)?)
        } else {
            None
        };
        // 图片模式：一次性解码水印源图
        let watermark_source = if is_image_mode(&params) {
            let p = params
                .image_path
                .as_deref()
                .ok_or_else(|| BatchError::invalid_input("图片水印模式必须提供水印图片"))?;
            Some(decode_watermark_image(Path::new(p)).map_err(map_image_error)?)
        } else {
            None
        };
        Ok(Arc::new(WatermarkBatchPrepared {
            params,
            font,
            watermark_source,
        }))
    }

    fn process_one(
        &self,
        ctx: &BatchItemContext<'_>,
        prepared: &Arc<dyn BatchPrepared>,
    ) -> Result<BatchItemOutput, BatchError> {
        // 取消时立刻返回，避免开新文件 IO
        if ctx.cancel.is_cancelled() {
            return Err(BatchError::canceled());
        }
        let prepared = prepared
            .as_any()
            .downcast_ref::<WatermarkBatchPrepared>()
            .ok_or_else(|| BatchError::processor("批量水印预备资源缺失"))?;

        // 解码输入图（局部作用域，处理完即释放内存）
        let loaded = decode_input_image(&ctx.item.input_path)?;

        // 用已缓存的字体 / 源图生成 overlay（按当前输入尺寸缩放）
        let overlay = if is_text_mode(&prepared.params) {
            build_text_overlay_with_cache(&loaded, &prepared.params, prepared.font.as_ref())
                .map_err(map_image_error)?
        } else {
            build_image_overlay_with_cache(
                &loaded,
                &prepared.params,
                prepared.watermark_source.as_ref(),
            )
            .map_err(map_image_error)?
        };

        // 计算最终输出路径（不覆盖原文件，重名追加序号）
        let stem = ctx
            .item
            .input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        let ext = ctx
            .item
            .input_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("png");
        let final_path = allocate_unique_final_path(ctx.output_dir, stem, Some("watermark"), ext);
        ensure_parent_dir(&final_path)?;
        let tmp_path = temp_path_for(&final_path);

        // 先写到 .tmp，再原子重命名
        let write_result =
            composite_and_save_watermark(&loaded, &overlay, &prepared.params, &tmp_path)
                .map_err(map_image_error);
        // 显式释放：让大图尽快被回收（drop 顺序也会做，但显式更直观）
        drop(loaded);
        drop(overlay);

        match write_result {
            Ok(_) => {
                if ctx.cancel.is_cancelled() {
                    // 取消发生在写入完成之后：清理 tmp，不上报为成功
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
                Err(err)
            }
        }
    }
}

/// 仅支持常见图像扩展名；其他后缀视为不支持。
fn is_supported_image_ext(path: &Path) -> bool {
    const EXTS: &[&str] = &["png", "jpg", "jpeg", "webp", "bmp"];
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| EXTS.iter().any(|x| x.eq_ignore_ascii_case(e)))
        .unwrap_or(false)
}

/// 把 `image_core` 的错误映射到 [`BatchError`]，并按错误类型决定是否可重试。
fn map_image_error(err: crate::image_core::error::ImagePipelineError) -> BatchError {
    use crate::image_core::error::ImagePipelineError as E;
    match err {
        E::InvalidInput(msg) => BatchError::invalid_input(msg),
        // 解码失败 / 编码失败 / 格式不支持视为确定性错误，无需重试
        E::DecodeFailed(msg) | E::EncodeFailed(msg) | E::NotImplemented(msg) => {
            BatchError::deterministic(msg)
        }
        E::IoFailed(msg) => BatchError::io(msg),
        E::PlanFailed(msg) | E::Internal(msg) => BatchError::processor(msg),
    }
}

fn decode_input_image(path: &Path) -> Result<LoadedImage, BatchError> {
    let reader = ImageReader::open(path)
        .map_err(|err| BatchError::io(format!("打开图片失败：{err}")))?
        .with_guessed_format()
        .map_err(|err| BatchError::deterministic(format!("识别图片格式失败：{err}")))?;
    let format = reader.format().unwrap_or(ImageFormat::Png);
    let image = reader
        .decode()
        .map_err(|err| BatchError::deterministic(format!("解码图片失败：{err}")))?;
    Ok(LoadedImage { image, format })
}
