//! Video watermark removal batch processor.
//!
//! This intentionally reuses the batch scheduler and bundled FFmpeg runtime. The video path keeps
//! one static rectangle selection workflow and preserves the original container extension.

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
use crate::ffmpeg_gif::resolve_ffmpeg_ffprobe;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemovalRegion {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VideoWatermarkRemovalOptions {
    regions_by_file: std::collections::HashMap<String, Vec<RemovalRegion>>,
}

#[derive(Debug, Clone, Copy)]
struct VideoDimensions {
    width: u32,
    height: u32,
}

pub struct VideoWatermarkRemovalBatchProcessor;

impl BatchProcessor for VideoWatermarkRemovalBatchProcessor {
    fn task_type(&self) -> BatchTaskType {
        BatchTaskType::VideoWatermarkRemoval
    }

    fn validate(&self, options: &Value, input_files: &[PathBuf]) -> Result<(), BatchError> {
        let parsed = parse_options(options)?;
        for input in input_files {
            if !is_supported_video_ext(input) {
                return Err(BatchError::invalid_input(format!(
                    "视频去水印仅支持 MP4/MOV/WebM/MKV/AVI/M4V/WMV：{}",
                    input.display()
                )));
            }
            let regions = regions_for_path(&parsed, input).ok_or_else(|| {
                BatchError::invalid_input(format!("缺少视频水印框选区域：{}", input.display()))
            })?;
            if regions.is_empty() {
                return Err(BatchError::invalid_input(format!(
                    "视频没有有效的水印框选区域：{}",
                    input.display()
                )));
            }
            for region in regions {
                validate_region(region)?;
            }
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

        let options = parse_options(&ctx.options)?;
        let regions = regions_for_path(&options, &ctx.item.input_path).ok_or_else(|| {
            BatchError::invalid_input(format!(
                "缺少视频水印框选区域：{}",
                ctx.item.input_path.display()
            ))
        })?;

        let extension = output_extension(&ctx.item.input_path)?;
        let stem = ctx
            .item
            .input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        let final_path =
            allocate_unique_final_path(ctx.output_dir, stem, Some("no_watermark"), &extension);
        ensure_parent_dir(&final_path)?;
        let tmp_path = temp_path_for(&final_path);

        let (ffmpeg, ffprobe) =
            resolve_ffmpeg_ffprobe().map_err(|err: String| BatchError::deterministic(err))?;
        let dimensions = probe_video_dimensions(&ffprobe, &ctx.item.input_path)?;
        let filter = build_delogo_filter(regions, dimensions)?;

        let mut args = vec![
            "-hide_banner".to_string(),
            "-nostats".to_string(),
            "-loglevel".to_string(),
            "error".to_string(),
            "-i".to_string(),
            path_to_string(&ctx.item.input_path)?,
            "-map".to_string(),
            "0:v:0".to_string(),
            "-map".to_string(),
            "0:a?".to_string(),
            "-filter:v".to_string(),
            filter,
        ];
        append_codec_args(&extension, &mut args);
        args.push("-f".to_string());
        args.push(ffmpeg_muxer(&extension).to_string());
        args.push("-y".to_string());
        args.push(path_to_string(&tmp_path)?);

        let child = std::process::Command::new(&ffmpeg)
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|err| BatchError::io(format!("启动 FFmpeg 失败：{err}")))?;

        let shared_child = ctx.cancel.register_child(child);
        let wait_result = {
            let mut guard = shared_child
                .lock()
                .map_err(|_| BatchError::processor("FFmpeg 子进程锁异常"))?;
            guard.wait()
        };
        ctx.cancel.forget_child(&shared_child);

        match wait_result {
            Ok(_) if ctx.cancel.is_cancelled() => {
                cleanup_temp(&tmp_path);
                Err(BatchError::canceled())
            }
            Ok(status) if status.success() => {
                finalize_temp(&tmp_path, &final_path)?;
                Ok(BatchItemOutput {
                    output_path: final_path,
                    message: None,
                })
            }
            Ok(status) => {
                cleanup_temp(&tmp_path);
                Err(BatchError::deterministic(format!(
                    "FFmpeg 视频去水印失败，退出码 {:?}",
                    status.code()
                )))
            }
            Err(err) => {
                cleanup_temp(&tmp_path);
                Err(BatchError::io(format!("等待 FFmpeg 结束失败：{err}")))
            }
        }
    }
}

fn parse_options(options: &Value) -> Result<VideoWatermarkRemovalOptions, BatchError> {
    serde_json::from_value(options.clone())
        .map_err(|err| BatchError::invalid_input(format!("视频去水印参数不合法：{err}")))
}

fn regions_for_path<'a>(
    options: &'a VideoWatermarkRemovalOptions,
    path: &Path,
) -> Option<&'a Vec<RemovalRegion>> {
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

fn validate_region(region: &RemovalRegion) -> Result<(), BatchError> {
    let values = [region.x, region.y, region.width, region.height];
    if values.iter().any(|value| !value.is_finite()) {
        return Err(BatchError::invalid_input("水印区域包含无效数值"));
    }
    if region.width <= 0.0 || region.height <= 0.0 {
        return Err(BatchError::invalid_input("水印区域宽高必须大于 0"));
    }
    if region.x < 0.0 || region.y < 0.0 || region.x > 100.0 || region.y > 100.0 {
        return Err(BatchError::invalid_input("水印区域坐标必须在 0..100 内"));
    }
    Ok(())
}

fn probe_video_dimensions(ffprobe: &Path, input: &Path) -> Result<VideoDimensions, BatchError> {
    let out = std::process::Command::new(ffprobe)
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=s=x:p=0",
            &path_to_string(input)?,
        ])
        .output()
        .map_err(|err| BatchError::io(format!("启动 ffprobe 失败：{err}")))?;
    if !out.status.success() {
        return Err(BatchError::deterministic(format!(
            "ffprobe 读取视频尺寸失败：{}",
            String::from_utf8_lossy(&out.stderr).trim()
        )));
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let line = text.lines().next().unwrap_or("").trim();
    let mut parts = line.split('x');
    let width = parts
        .next()
        .and_then(|value| value.parse::<u32>().ok())
        .ok_or_else(|| BatchError::deterministic("无法解析视频宽度"))?;
    let height = parts
        .next()
        .and_then(|value| value.parse::<u32>().ok())
        .ok_or_else(|| BatchError::deterministic("无法解析视频高度"))?;
    if width == 0 || height == 0 {
        return Err(BatchError::deterministic("视频尺寸无效"));
    }
    Ok(VideoDimensions { width, height })
}

fn build_delogo_filter(
    regions: &[RemovalRegion],
    dimensions: VideoDimensions,
) -> Result<String, BatchError> {
    let mut filters = Vec::with_capacity(regions.len());
    for region in regions {
        validate_region(region)?;
        let mut x = ((region.x / 100.0) * dimensions.width as f32).round() as i32;
        let mut y = ((region.y / 100.0) * dimensions.height as f32).round() as i32;
        let mut w = ((region.width / 100.0) * dimensions.width as f32).round() as i32;
        let mut h = ((region.height / 100.0) * dimensions.height as f32).round() as i32;
        x = x.clamp(0, dimensions.width.saturating_sub(2) as i32);
        y = y.clamp(0, dimensions.height.saturating_sub(2) as i32);
        w = w.max(2).min(dimensions.width as i32 - x);
        h = h.max(2).min(dimensions.height as i32 - y);
        if w < 2 || h < 2 {
            return Err(BatchError::invalid_input("水印区域太小，无法处理"));
        }
        filters.push(format!("delogo=x={x}:y={y}:w={w}:h={h}:show=0"));
    }
    Ok(filters.join(","))
}

fn append_codec_args(ext: &str, args: &mut Vec<String>) {
    match ext {
        "webm" => args.extend(
            [
                "-c:v",
                "libvpx-vp9",
                "-deadline",
                "good",
                "-cpu-used",
                "4",
                "-crf",
                "32",
                "-b:v",
                "0",
                "-c:a",
                "libopus",
            ]
            .into_iter()
            .map(str::to_string),
        ),
        "avi" => args.extend(
            ["-c:v", "mpeg4", "-q:v", "4", "-c:a", "libmp3lame"]
                .into_iter()
                .map(str::to_string),
        ),
        "wmv" => args.extend(
            ["-c:v", "wmv2", "-q:v", "4", "-c:a", "wmav2"]
                .into_iter()
                .map(str::to_string),
        ),
        "mp4" | "m4v" | "mov" => args.extend(
            [
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "23",
                "-c:a",
                "aac",
                "-b:a",
                "160k",
                "-movflags",
                "+faststart",
            ]
            .into_iter()
            .map(str::to_string),
        ),
        _ => args.extend(
            [
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "23",
                "-c:a",
                "aac",
                "-b:a",
                "160k",
            ]
            .into_iter()
            .map(str::to_string),
        ),
    }
}

fn ffmpeg_muxer(ext: &str) -> &'static str {
    match ext {
        "mp4" | "m4v" => "mp4",
        "mov" => "mov",
        "webm" => "webm",
        "mkv" => "matroska",
        "avi" => "avi",
        "wmv" => "asf",
        _ => "mp4",
    }
}

fn output_extension(path: &Path) -> Result<String, BatchError> {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .filter(|e| is_supported_ext(e))
        .ok_or_else(|| BatchError::invalid_input("无法识别视频原格式"))
}

fn is_supported_video_ext(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| is_supported_ext(&e.to_ascii_lowercase()))
        .unwrap_or(false)
}

fn is_supported_ext(ext: &str) -> bool {
    matches!(ext, "mp4" | "webm" | "mkv" | "mov" | "avi" | "m4v" | "wmv")
}

fn path_to_string(path: &Path) -> Result<String, BatchError> {
    path.to_str()
        .map(str::to_string)
        .ok_or_else(|| BatchError::invalid_input("路径编码无效"))
}
