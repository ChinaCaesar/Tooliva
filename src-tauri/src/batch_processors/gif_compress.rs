//! GIF 压缩批量处理器：FFmpeg 重编码 GIF（palettegen / paletteuse）。

use serde::Deserialize;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;

use crate::batch::processor::{
    BatchItemContext, BatchItemOutput, BatchPrepareContext, BatchPrepared, BatchProcessor,
    NoopPrepared,
};
use crate::batch::tempfile::{
    allocate_unique_final_path, cleanup_temp, ensure_parent_dir, finalize_temp, temp_path_for,
};
use crate::batch::types::{BatchError, BatchTaskType};
use crate::batch_processors::gif_compress_config::{
    GifCompressBatchOptions, LoopPolicy, OutputDirPolicy,
};
use crate::batch_processors::gif_compress_filter::build_gif_recompress_filter_complex;
use crate::ffmpeg_gif::resolve_ffmpeg_ffprobe;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GifCompressPayload {
    #[serde(flatten)]
    inner: GifCompressBatchOptions,
}

pub struct GifCompressBatchProcessor;

impl BatchProcessor for GifCompressBatchProcessor {
    fn task_type(&self) -> BatchTaskType {
        BatchTaskType::GifCompress
    }

    fn validate(&self, options: &Value, input_files: &[PathBuf]) -> Result<(), BatchError> {
        let opts: GifCompressPayload = serde_json::from_value(options.clone())
            .map_err(|e| BatchError::invalid_input(format!("GIF 压缩参数不合法：{e}")))?;
        if opts.inner.target_size_mb.is_some() {
            return Err(BatchError::invalid_input(
                "暂不支持按目标体积压缩，请清空目标大小后重试",
            ));
        }
        if matches!(
            opts.inner.resize,
            crate::batch_processors::gif_compress_config::ResizePolicy::CustomWidth
        ) && opts.inner.custom_width.filter(|&w| w >= 2).is_none()
        {
            return Err(BatchError::invalid_input(
                "选择自定义宽度时，请提供有效的 customWidth（≥2）",
            ));
        }
        const GIF_EXT: &[&str] = &["gif"];
        for p in input_files {
            let ok = p
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| GIF_EXT.iter().any(|x| x.eq_ignore_ascii_case(e)))
                .unwrap_or(false);
            if !ok {
                return Err(BatchError::invalid_input(format!(
                    "仅支持 .gif 文件：{}",
                    p.display()
                )));
            }
        }
        build_gif_recompress_filter_complex(&opts.inner).map_err(BatchError::invalid_input)?;
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
        let opts: GifCompressPayload = serde_json::from_value(ctx.options.clone())
            .map_err(|e| BatchError::invalid_input(format!("GIF 压缩参数不合法：{e}")))?;
        let cfg = opts.inner;

        let filter =
            build_gif_recompress_filter_complex(&cfg).map_err(BatchError::invalid_input)?;

        let stem = ctx
            .item
            .input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        let suffix = cfg.filename_suffix();
        let out_dir =
            resolve_item_output_dir(&ctx.item.input_path, ctx.output_dir, &cfg.output_dir_policy)?;
        ensure_parent_dir(&out_dir)?;
        let final_path = allocate_unique_final_path(&out_dir, stem, Some(suffix), "gif");
        ensure_parent_dir(&final_path)?;
        let tmp_path = temp_path_for(&final_path);

        let (ffmpeg, _ffprobe) =
            resolve_ffmpeg_ffprobe().map_err(|e: String| BatchError::deterministic(e))?;

        let mut args: Vec<String> = vec![
            "-hide_banner".into(),
            "-nostats".into(),
            "-loglevel".into(),
            "error".into(),
            "-i".into(),
            ctx.item
                .input_path
                .to_str()
                .ok_or_else(|| BatchError::invalid_input("输入路径编码无效"))?
                .to_string(),
            "-filter_complex".into(),
            filter,
            "-map".into(),
            "[gifout]".into(),
        ];
        match cfg.loop_policy {
            LoopPolicy::PreserveSource => {}
            LoopPolicy::ForceLoop => {
                args.push("-loop".into());
                args.push("0".into());
            }
            LoopPolicy::NoLoop => {
                args.push("-loop".into());
                args.push("-1".into());
            }
        }
        // 输出为 *.gif.tmp 时扩展名无法推断封装格式，必须显式指定 GIF muxer。
        args.push("-f".into());
        args.push("gif".into());
        args.push("-y".into());
        args.push(
            tmp_path
                .to_str()
                .ok_or_else(|| BatchError::invalid_input("输出路径编码无效"))?
                .to_string(),
        );

        let mut child = std::process::Command::new(&ffmpeg)
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| BatchError::io(format!("启动 FFmpeg 失败：{e}")))?;

        let stderr_pipe = child.stderr.take();

        let shared_child = ctx.cancel.register_child(child);
        let wait_result = {
            let mut guard = shared_child
                .lock()
                .map_err(|_| BatchError::processor("FFmpeg 子进程锁异常"))?;
            guard.wait()
        };
        ctx.cancel.forget_child(&shared_child);

        let mut stderr_buf = String::new();
        if let Some(mut r) = stderr_pipe {
            let _ = std::io::Read::read_to_string(&mut r, &mut stderr_buf);
        }
        let stderr_msg = stderr_buf.trim().to_string();

        match wait_result {
            Ok(status) => {
                if ctx.cancel.is_cancelled() {
                    cleanup_temp(&tmp_path);
                    return Err(BatchError::canceled());
                }
                if !status.success() {
                    cleanup_temp(&tmp_path);
                    let detail = if stderr_msg.is_empty() {
                        format!("FFmpeg 退出码 {:?}", status.code())
                    } else {
                        format!("FFmpeg 退出码 {:?}：{stderr_msg}", status.code())
                    };
                    return Err(BatchError::deterministic(format!("GIF 压缩失败：{detail}")));
                }
                finalize_temp(&tmp_path, &final_path)?;
                Ok(BatchItemOutput {
                    output_path: final_path,
                    message: None,
                })
            }
            Err(err) => {
                cleanup_temp(&tmp_path);
                Err(BatchError::io(format!("等待 FFmpeg 结束失败：{err}")))
            }
        }
    }
}

fn resolve_item_output_dir(
    input_path: &Path,
    submit_output_dir: &Path,
    policy: &OutputDirPolicy,
) -> Result<PathBuf, BatchError> {
    let parent = input_path.parent().ok_or_else(|| {
        BatchError::invalid_input(format!(
            "无法解析输入文件所在目录：{}",
            input_path.display()
        ))
    })?;
    match policy {
        OutputDirPolicy::SameAsSource => Ok(parent.to_path_buf()),
        OutputDirPolicy::SourceSubfolder => Ok(parent.join("gif_compress_output")),
        OutputDirPolicy::Custom => Ok(submit_output_dir.to_path_buf()),
    }
}
