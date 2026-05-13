//! 视频转 GIF 的批量处理器。
//!
//! 复用现有 `ffmpeg_gif` 工具：每个文件一次性启动 FFmpeg 子进程，
//! 把子进程句柄注册到 [`CancelToken`]，取消时由调度层 kill。

use serde::Deserialize;
use serde_json::Value;
use std::path::PathBuf;
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
use crate::ffmpeg_gif::{compute_segment_duration, probe_duration_secs, resolve_ffmpeg_ffprobe, VideoToGifOptions};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VideoBatchOptions {
    #[serde(flatten)]
    inner: VideoToGifOptions,
}

pub struct VideoToGifBatchProcessor;

impl BatchProcessor for VideoToGifBatchProcessor {
    fn task_type(&self) -> BatchTaskType {
        BatchTaskType::VideoToGif
    }

    fn validate(&self, options: &Value, input_files: &[PathBuf]) -> Result<(), BatchError> {
        let opts: VideoBatchOptions = serde_json::from_value(options.clone())
            .map_err(|err| BatchError::invalid_input(format!("视频转 GIF 参数不合法：{err}")))?;
        if !(1..=60).contains(&opts.inner.fps) {
            return Err(BatchError::invalid_input("帧率必须在 1～60 之间"));
        }
        if let Some(m) = opts.inner.max_frames {
            if m < 1 {
                return Err(BatchError::invalid_input("最大帧数必须≥1"));
            }
        }
        const VIDEO_EXTS: &[&str] = &["mp4", "webm", "mkv", "mov", "avi", "m4v", "wmv"];
        for input in input_files {
            let ok = input
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| VIDEO_EXTS.iter().any(|x| x.eq_ignore_ascii_case(e)))
                .unwrap_or(false);
            if !ok {
                return Err(BatchError::invalid_input(format!(
                    "暂不支持的视频容器：{}",
                    input.display()
                )));
            }
        }
        Ok(())
    }

    fn prepare(&self, _ctx: &BatchPrepareContext) -> Result<Arc<dyn BatchPrepared>, BatchError> {
        // 暂时无共享资源；后续若引入调色板缓存等可在此预加载
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
        let opts: VideoBatchOptions = serde_json::from_value(ctx.options.clone())
            .map_err(|err| BatchError::invalid_input(format!("视频转 GIF 参数不合法：{err}")))?;
        let video_opts = opts.inner;

        let stem = ctx
            .item
            .input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        let final_path = allocate_unique_final_path(ctx.output_dir, stem, None, "gif");
        ensure_parent_dir(&final_path)?;
        let tmp_path = temp_path_for(&final_path);

        let (ffmpeg, ffprobe) =
            resolve_ffmpeg_ffprobe().map_err(|err: String| BatchError::deterministic(err))?;
        let full_duration = probe_duration_secs(&ffprobe, &ctx.item.input_path)
            .map_err(|err: String| BatchError::deterministic(err))?;
        let _segment_duration = compute_segment_duration(full_duration, &video_opts)
            .map_err(|err: String| BatchError::invalid_input(err))?;

        // 直接拼装 FFmpeg 参数，关键是要拿到 `Child` 句柄注册到 CancelToken
        let filter = crate::ffmpeg_gif::filter::build_filter_complex(&video_opts)
            .map_err(|err: String| BatchError::deterministic(err))?;
        let mut args: Vec<String> = vec![
            "-hide_banner".into(),
            "-nostats".into(),
            "-loglevel".into(),
            "error".into(),
        ];
        if let Some(ss) = video_opts
            .start_time_sec
            .filter(|v| v.is_finite() && *v > f64::EPSILON)
        {
            args.push("-ss".into());
            args.push(format!("{ss:.6}"));
        }
        if let Some(to) = video_opts.end_time_sec.filter(|v| v.is_finite()) {
            args.push("-to".into());
            args.push(format!("{to:.6}"));
        }
        args.push("-i".into());
        args.push(
            ctx.item
                .input_path
                .to_str()
                .ok_or_else(|| BatchError::invalid_input("输入路径编码无效"))?
                .to_string(),
        );
        args.push("-filter_complex".into());
        args.push(filter);
        args.push("-map".into());
        args.push("[gifv]".into());
        if let Some(max) = video_opts.max_frames.filter(|v| *v >= 1) {
            args.push("-frames:v".into());
            args.push(max.to_string());
        }
        args.push("-loop".into());
        args.push(if video_opts.loop_playback { "0".into() } else { "-1".into() });
        args.push("-y".into());
        args.push(
            tmp_path
                .to_str()
                .ok_or_else(|| BatchError::invalid_input("输出路径编码无效"))?
                .to_string(),
        );

        let child = std::process::Command::new(&ffmpeg)
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|err| BatchError::io(format!("启动 FFmpeg 失败：{err}")))?;

        // 注册到取消域；调度层取消时会 kill
        let shared_child = ctx.cancel.register_child(child);
        let wait_result = {
            let mut guard = shared_child
                .lock()
                .map_err(|_| BatchError::processor("FFmpeg 子进程锁异常"))?;
            guard.wait()
        };
        ctx.cancel.forget_child(&shared_child);

        match wait_result {
            Ok(status) => {
                if ctx.cancel.is_cancelled() {
                    cleanup_temp(&tmp_path);
                    return Err(BatchError::canceled());
                }
                if !status.success() {
                    cleanup_temp(&tmp_path);
                    return Err(BatchError::deterministic(format!(
                        "FFmpeg 退出码 {:?}",
                        status.code()
                    )));
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
