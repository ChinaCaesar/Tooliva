//! High quality video watermark removal.
//!
//! Uses the same LaMA inpaint worker as image watermark removal, but only on a cropped
//! region around the selected watermark areas. This keeps commercial-quality inpainting
//! while avoiding full-frame extraction and excessive disk I/O.

use image::{GrayImage, Luma};
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::ai_worker::{ensure_lama_worker_ready, inpaint_image_with_lama, InpaintImageRequest};
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
    regions_by_file: HashMap<String, Vec<RemovalRegion>>,
}

#[derive(Debug, Clone, Copy)]
struct VideoDimensions {
    width: u32,
    height: u32,
}

#[derive(Debug, Clone, Copy)]
struct CropBox {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EncoderBackend {
    Nvidia,
    Software,
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
                    "Video watermark removal supports MP4/MOV/WebM/MKV/AVI/M4V/WMV only: {}",
                    input.display()
                )));
            }
            let regions = regions_for_path(&parsed, input).ok_or_else(|| {
                BatchError::invalid_input(format!(
                    "Missing selected watermark region for video: {}",
                    input.display()
                ))
            })?;
            if regions.is_empty() {
                return Err(BatchError::invalid_input(format!(
                    "Video has no selected watermark regions: {}",
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
        ensure_lama_worker_ready(true).map_err(BatchError::deterministic)?;
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
                "Missing selected watermark region for video: {}",
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
        let fps = probe_video_fps(&ffprobe, &ctx.item.input_path).unwrap_or_else(|_| "30".into());
        let crop = compute_crop_box(regions, dimensions);
        let backend = choose_encoder_backend(&ffmpeg, &extension);
        let work_dir = unique_work_dir(stem, ctx.item.index)?;
        let raw_dir = work_dir.join("roi_raw");
        let fixed_dir = work_dir.join("roi_fixed");
        let blend_mask_path = work_dir.join("roi_blend_mask.png");
        let result = (|| {
            fs::create_dir_all(&raw_dir)
                .and_then(|_| fs::create_dir_all(&fixed_dir))
                .map_err(|err| {
                    BatchError::io(format!("Failed to create video temp directory: {err}"))
                })?;
            write_roi_blend_mask(&blend_mask_path, crop, dimensions, regions)?;
            extract_roi_frames(&ffmpeg, &ctx.item.input_path, &raw_dir, crop, ctx)?;
            inpaint_roi_frames(&raw_dir, &fixed_dir, crop, dimensions, regions, ctx)?;
            compose_video(
                &ffmpeg,
                &ctx.item.input_path,
                &fixed_dir,
                &blend_mask_path,
                &tmp_path,
                &extension,
                &fps,
                crop,
                backend,
                ctx,
            )
        })();
        let _ = fs::remove_dir_all(&work_dir);

        match result {
            Ok(()) => {
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

fn extract_roi_frames(
    ffmpeg: &Path,
    input: &Path,
    raw_dir: &Path,
    crop: CropBox,
    ctx: &BatchItemContext<'_>,
) -> Result<(), BatchError> {
    ctx.progress.record_current_progress(
        Some(ctx.item.input_path.display().to_string()),
        2.0,
        Some(format!(
            "Extracting ROI frames for LaMA: {}x{} at {},{}",
            crop.width, crop.height, crop.x, crop.y
        )),
    );
    let pattern = raw_dir.join("frame_%06d.png");
    run_ffmpeg_with_cancel(
        ffmpeg,
        vec![
            "-hide_banner".into(),
            "-nostats".into(),
            "-loglevel".into(),
            "error".into(),
            "-threads".into(),
            "0".into(),
            "-i".into(),
            path_to_string(input)?,
            "-map".into(),
            "0:v:0".into(),
            "-vf".into(),
            format!("crop={}:{}:{}:{}", crop.width, crop.height, crop.x, crop.y),
            "-vsync".into(),
            "0".into(),
            "-start_number".into(),
            "1".into(),
            "-compression_level".into(),
            "1".into(),
            path_to_string(&pattern)?,
        ],
        ctx,
        "Failed to extract ROI frames",
    )
}

fn inpaint_roi_frames(
    raw_dir: &Path,
    fixed_dir: &Path,
    crop: CropBox,
    dimensions: VideoDimensions,
    regions: &[RemovalRegion],
    ctx: &BatchItemContext<'_>,
) -> Result<(), BatchError> {
    let mut frames = list_frames(raw_dir)?;
    if frames.is_empty() {
        return Err(BatchError::deterministic("Video produced no ROI frames"));
    }
    frames.sort();
    let roi_regions = regions_to_roi_sidecar(regions, crop, dimensions)?;
    let total = frames.len().max(1);
    for (index, frame) in frames.into_iter().enumerate() {
        if ctx.cancel.is_cancelled() {
            return Err(BatchError::canceled());
        }
        let output = fixed_dir.join(
            frame
                .file_name()
                .ok_or_else(|| BatchError::deterministic("ROI frame name is invalid"))?,
        );
        inpaint_image_with_lama(InpaintImageRequest {
            input_path: frame,
            output_path: output,
            regions: roi_regions.clone(),
            output_format: "png".into(),
            mode: "quality".into(),
        })
        .map_err(|err| BatchError::processor(format!("LaMA video ROI inpaint failed: {err}")))?;
        let progress = 8.0 + (((index + 1) as f32 / total as f32) * 84.0);
        ctx.progress.record_current_progress(
            Some(ctx.item.input_path.display().to_string()),
            progress,
            Some(format!(
                "LaMA high-quality inpaint frame {} / {}",
                index + 1,
                total
            )),
        );
    }
    Ok(())
}

fn compose_video(
    ffmpeg: &Path,
    input: &Path,
    fixed_dir: &Path,
    blend_mask: &Path,
    output: &Path,
    extension: &str,
    fps: &str,
    crop: CropBox,
    backend: EncoderBackend,
    ctx: &BatchItemContext<'_>,
) -> Result<(), BatchError> {
    ctx.progress.record_current_progress(
        Some(ctx.item.input_path.display().to_string()),
        96.0,
        Some(format!(
            "Compositing LaMA ROI back to video ({})",
            match backend {
                EncoderBackend::Nvidia => "NVENC",
                EncoderBackend::Software => "CPU",
            }
        )),
    );
    let pattern = fixed_dir.join("frame_%06d.png");
    let filter = format!(
        "[1:v]format=rgb24[roi];\
         [2:v]format=gray[mask];\
         [roi][mask]alphamerge=shortest=1[roi_alpha];\
         [0:v][roi_alpha]overlay={}:{}:shortest=1:format=auto[v]",
        crop.x, crop.y
    );
    let mut args = vec![
        "-hide_banner".into(),
        "-nostats".into(),
        "-loglevel".into(),
        "error".into(),
        "-threads".into(),
        "0".into(),
        "-i".into(),
        path_to_string(input)?,
        "-framerate".into(),
        fps.to_string(),
        "-start_number".into(),
        "1".into(),
        "-i".into(),
        path_to_string(&pattern)?,
        "-framerate".into(),
        fps.to_string(),
        "-loop".into(),
        "1".into(),
        "-i".into(),
        path_to_string(blend_mask)?,
        "-filter_complex".into(),
        filter,
        "-map".into(),
        "[v]".into(),
        "-map".into(),
        "0:a?".into(),
        "-shortest".into(),
    ];
    append_codec_args(extension, backend, &mut args);
    args.push("-f".into());
    args.push(ffmpeg_muxer(extension).into());
    args.push("-y".into());
    args.push(path_to_string(output)?);
    run_ffmpeg_with_cancel(ffmpeg, args, ctx, "Failed to compose LaMA ROI video")
}

fn run_ffmpeg_with_cancel(
    ffmpeg: &Path,
    args: Vec<String>,
    ctx: &BatchItemContext<'_>,
    failure_prefix: &str,
) -> Result<(), BatchError> {
    if ctx.cancel.is_cancelled() {
        return Err(BatchError::canceled());
    }
    let child = Command::new(ffmpeg)
        .args(&args)
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| BatchError::io(format!("Failed to start FFmpeg: {err}")))?;

    let shared_child = ctx.cancel.register_child(child);
    let wait_result = {
        let mut guard = shared_child
            .lock()
            .map_err(|_| BatchError::processor("FFmpeg process lock failed"))?;
        guard.wait()
    };
    ctx.cancel.forget_child(&shared_child);

    match wait_result {
        Ok(_) if ctx.cancel.is_cancelled() => Err(BatchError::canceled()),
        Ok(status) if status.success() => Ok(()),
        Ok(status) => Err(BatchError::deterministic(format!(
            "{failure_prefix}; FFmpeg exit code {:?}",
            status.code()
        ))),
        Err(err) => Err(BatchError::io(format!("{failure_prefix}: {err}"))),
    }
}

fn parse_options(options: &Value) -> Result<VideoWatermarkRemovalOptions, BatchError> {
    serde_json::from_value(options.clone()).map_err(|err| {
        BatchError::invalid_input(format!("Invalid video watermark removal options: {err}"))
    })
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
        return Err(BatchError::invalid_input(
            "Selected watermark region contains invalid numeric values",
        ));
    }
    if region.width <= 0.0 || region.height <= 0.0 {
        return Err(BatchError::invalid_input(
            "Selected watermark region width and height must be greater than 0",
        ));
    }
    if region.x < 0.0 || region.y < 0.0 || region.x > 100.0 || region.y > 100.0 {
        return Err(BatchError::invalid_input(
            "Selected watermark region coordinates must be within 0..100",
        ));
    }
    Ok(())
}

fn compute_crop_box(regions: &[RemovalRegion], dimensions: VideoDimensions) -> CropBox {
    let margin = ((dimensions.width.max(dimensions.height) as f32) * 0.06)
        .round()
        .clamp(72.0, 220.0) as i32;
    let mut left = dimensions.width as i32;
    let mut top = dimensions.height as i32;
    let mut right = 0i32;
    let mut bottom = 0i32;
    for region in regions {
        let x1 = ((region.x / 100.0) * dimensions.width as f32).round() as i32;
        let y1 = ((region.y / 100.0) * dimensions.height as f32).round() as i32;
        let x2 = (((region.x + region.width) / 100.0) * dimensions.width as f32).round() as i32;
        let y2 = (((region.y + region.height) / 100.0) * dimensions.height as f32).round() as i32;
        left = left.min(x1);
        top = top.min(y1);
        right = right.max(x2);
        bottom = bottom.max(y2);
    }
    left = (left - margin).max(0);
    top = (top - margin).max(0);
    right = (right + margin).min(dimensions.width as i32);
    bottom = (bottom + margin).min(dimensions.height as i32);
    let mut width = (right - left).max(2) as u32;
    let mut height = (bottom - top).max(2) as u32;
    if width % 2 != 0 {
        width = width.saturating_sub(1).max(2);
    }
    if height % 2 != 0 {
        height = height.saturating_sub(1).max(2);
    }
    CropBox {
        x: left as u32,
        y: top as u32,
        width,
        height,
    }
}

fn regions_to_roi_sidecar(
    regions: &[RemovalRegion],
    crop: CropBox,
    dimensions: VideoDimensions,
) -> Result<Vec<Value>, BatchError> {
    let mut out = Vec::with_capacity(regions.len());
    for region in regions {
        validate_region(region)?;
        let x = ((region.x / 100.0) * dimensions.width as f32) - crop.x as f32;
        let y = ((region.y / 100.0) * dimensions.height as f32) - crop.y as f32;
        let w = (region.width / 100.0) * dimensions.width as f32;
        let h = (region.height / 100.0) * dimensions.height as f32;
        out.push(serde_json::json!({
            "x": (x / crop.width as f32).clamp(0.0, 1.0),
            "y": (y / crop.height as f32).clamp(0.0, 1.0),
            "width": (w / crop.width as f32).clamp(0.0, 1.0),
            "height": (h / crop.height as f32).clamp(0.0, 1.0),
        }));
    }
    Ok(out)
}

fn write_roi_blend_mask(
    path: &Path,
    crop: CropBox,
    dimensions: VideoDimensions,
    regions: &[RemovalRegion],
) -> Result<(), BatchError> {
    let feather = ((crop.width.max(crop.height) as f32) * 0.035)
        .round()
        .clamp(18.0, 56.0);
    let opaque_pad = (feather * 0.45).round().max(8.0);
    let rects = region_rects_in_roi(regions, crop, dimensions, opaque_pad)?;
    let mut mask = GrayImage::new(crop.width, crop.height);

    for y in 0..crop.height {
        for x in 0..crop.width {
            let px = x as f32 + 0.5;
            let py = y as f32 + 0.5;
            let mut alpha = 0.0f32;
            for rect in &rects {
                let distance = distance_to_rect(px, py, *rect);
                let candidate = if distance <= 0.0 {
                    255.0
                } else if distance >= feather {
                    0.0
                } else {
                    let t = 1.0 - (distance / feather);
                    255.0 * t * t * (3.0 - 2.0 * t)
                };
                alpha = alpha.max(candidate);
                if alpha >= 255.0 {
                    break;
                }
            }
            mask.put_pixel(x, y, Luma([alpha.round().clamp(0.0, 255.0) as u8]));
        }
    }

    mask.save(path)
        .map_err(|err| BatchError::io(format!("Failed to write ROI blend mask: {err}")))?;
    Ok(())
}

fn region_rects_in_roi(
    regions: &[RemovalRegion],
    crop: CropBox,
    dimensions: VideoDimensions,
    pad: f32,
) -> Result<Vec<(f32, f32, f32, f32)>, BatchError> {
    let mut rects = Vec::with_capacity(regions.len());
    for region in regions {
        validate_region(region)?;
        let x1 = ((region.x / 100.0) * dimensions.width as f32) - crop.x as f32;
        let y1 = ((region.y / 100.0) * dimensions.height as f32) - crop.y as f32;
        let x2 = (((region.x + region.width) / 100.0) * dimensions.width as f32) - crop.x as f32;
        let y2 = (((region.y + region.height) / 100.0) * dimensions.height as f32) - crop.y as f32;
        rects.push((
            (x1 - pad).clamp(0.0, crop.width as f32),
            (y1 - pad).clamp(0.0, crop.height as f32),
            (x2 + pad).clamp(0.0, crop.width as f32),
            (y2 + pad).clamp(0.0, crop.height as f32),
        ));
    }
    Ok(rects)
}

fn distance_to_rect(x: f32, y: f32, rect: (f32, f32, f32, f32)) -> f32 {
    let (left, top, right, bottom) = rect;
    let dx = if x < left {
        left - x
    } else if x > right {
        x - right
    } else {
        0.0
    };
    let dy = if y < top {
        top - y
    } else if y > bottom {
        y - bottom
    } else {
        0.0
    };
    (dx * dx + dy * dy).sqrt()
}

fn probe_video_dimensions(ffprobe: &Path, input: &Path) -> Result<VideoDimensions, BatchError> {
    let out = Command::new(ffprobe)
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
        .map_err(|err| BatchError::io(format!("Failed to start ffprobe: {err}")))?;
    if !out.status.success() {
        return Err(BatchError::deterministic(format!(
            "ffprobe could not read video dimensions: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        )));
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let line = text.lines().next().unwrap_or("").trim();
    let mut parts = line.split('x');
    let width = parts
        .next()
        .and_then(|value| value.parse::<u32>().ok())
        .ok_or_else(|| BatchError::deterministic("Could not parse video width"))?;
    let height = parts
        .next()
        .and_then(|value| value.parse::<u32>().ok())
        .ok_or_else(|| BatchError::deterministic("Could not parse video height"))?;
    if width == 0 || height == 0 {
        return Err(BatchError::deterministic("Video dimensions are invalid"));
    }
    Ok(VideoDimensions { width, height })
}

fn probe_video_fps(ffprobe: &Path, input: &Path) -> Result<String, BatchError> {
    let out = Command::new(ffprobe)
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=avg_frame_rate",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            &path_to_string(input)?,
        ])
        .output()
        .map_err(|err| BatchError::io(format!("Failed to start ffprobe: {err}")))?;
    let value = String::from_utf8_lossy(&out.stdout)
        .lines()
        .next()
        .unwrap_or("")
        .trim()
        .to_string();
    if !out.status.success() || value.is_empty() || value == "0/0" {
        return Err(BatchError::deterministic("Could not read video frame rate"));
    }
    Ok(value)
}

fn list_frames(dir: &Path) -> Result<Vec<PathBuf>, BatchError> {
    let entries = fs::read_dir(dir)
        .map_err(|err| BatchError::io(format!("Failed to read ROI frames: {err}")))?;
    Ok(entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.eq_ignore_ascii_case("png"))
                .unwrap_or(false)
        })
        .collect())
}

fn unique_work_dir(stem: &str, index: usize) -> Result<PathBuf, BatchError> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    let dir = std::env::temp_dir().join(format!("desktop-toolbox-vw-{stem}-{index}-{millis}"));
    fs::create_dir_all(&dir)
        .map_err(|err| BatchError::io(format!("Failed to create video temp directory: {err}")))?;
    Ok(dir)
}

fn choose_encoder_backend(ffmpeg: &Path, ext: &str) -> EncoderBackend {
    if matches!(ext, "mp4" | "m4v" | "mov" | "mkv") && ffmpeg_supports_encoder(ffmpeg, "h264_nvenc")
    {
        EncoderBackend::Nvidia
    } else {
        EncoderBackend::Software
    }
}

fn ffmpeg_supports_encoder(ffmpeg: &Path, encoder: &str) -> bool {
    static ENCODERS: OnceLock<String> = OnceLock::new();
    let encoders = ENCODERS.get_or_init(|| {
        Command::new(ffmpeg)
            .args(["-hide_banner", "-encoders"])
            .output()
            .ok()
            .map(|out| String::from_utf8_lossy(&out.stdout).to_string())
            .unwrap_or_default()
    });
    encoders.contains(encoder)
}

fn append_codec_args(ext: &str, backend: EncoderBackend, args: &mut Vec<String>) {
    match (ext, backend) {
        ("mp4" | "m4v" | "mov" | "mkv", EncoderBackend::Nvidia) => args.extend(
            [
                "-c:v",
                "h264_nvenc",
                "-preset",
                "p5",
                "-cq",
                "18",
                "-b:v",
                "0",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "copy",
            ]
            .into_iter()
            .map(str::to_string),
        ),
        ("webm", _) => args.extend(
            [
                "-c:v",
                "libvpx-vp9",
                "-deadline",
                "good",
                "-cpu-used",
                "4",
                "-crf",
                "28",
                "-b:v",
                "0",
                "-c:a",
                "libopus",
            ]
            .into_iter()
            .map(str::to_string),
        ),
        ("avi", _) => args.extend(
            ["-c:v", "mpeg4", "-q:v", "3", "-c:a", "libmp3lame"]
                .into_iter()
                .map(str::to_string),
        ),
        ("wmv", _) => args.extend(
            ["-c:v", "wmv2", "-q:v", "3", "-c:a", "wmav2"]
                .into_iter()
                .map(str::to_string),
        ),
        ("mp4" | "m4v" | "mov", _) => args.extend(
            [
                "-c:v",
                "libx264",
                "-preset",
                "faster",
                "-crf",
                "18",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "copy",
                "-movflags",
                "+faststart",
            ]
            .into_iter()
            .map(str::to_string),
        ),
        _ => args.extend(
            [
                "-c:v", "libx264", "-preset", "faster", "-crf", "18", "-pix_fmt", "yuv420p",
                "-c:a", "copy",
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
        .ok_or_else(|| BatchError::invalid_input("Could not infer original video format"))
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
        .ok_or_else(|| BatchError::invalid_input("Path encoding is invalid"))
}
