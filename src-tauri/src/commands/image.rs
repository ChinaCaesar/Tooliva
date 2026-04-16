use base64::Engine;
use crate::image_core::executor::run_blocking;
use crate::image_core::pipeline::ImagePipeline;
use crate::image_core::progress::CallbackProgressReporter;
use crate::image_core::tile::TileEngine;
use crate::image_core::types::{LoadedImage, ProcessContext, ProcessingLimits, ProgressEvent, TileConfig};
use crate::image_processors::compress::processor::CompressProcessor;
use crate::image_processors::upscale::processor::{UpscaleBackend, UpscaleProcessor, UpscaleQualityMode};
use crate::image_processors::watermark::processor::{compute_watermark_preview_geometry, WatermarkProcessor};
use image::ImageFormat;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

const IMAGE_UPSCALE_PROGRESS_EVENT: &str = "image-upscale-progress";
const IMAGE_COMPRESS_PROGRESS_EVENT: &str = "image-compress-progress";
const IMAGE_WATERMARK_PROGRESS_EVENT: &str = "image-watermark-progress";
const SUPPORTED_IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "bmp"];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListImagesFromDirectoryPayload {
    pub directory_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListImagesFromDirectoryResult {
    pub images: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartImageUpscalePayload {
    pub task_id: String,
    pub input_path: String,
    pub scale_factor: u8,
    pub output_directory: Option<String>,
    pub quality_mode: Option<UpscaleQualityMode>,
    pub backend_preference: Option<UpscaleBackend>,
    pub max_output_pixels: Option<u64>,
    pub max_memory_mb: Option<u64>,
    pub tile_size: Option<u32>,
    pub tile_overlap: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartImageUpscaleResult {
    pub task_id: String,
    pub input_path: String,
    pub output_path: String,
    pub success: bool,
    pub error: Option<String>,
    pub original_width: u32,
    pub original_height: u32,
    pub output_width: u32,
    pub output_height: u32,
    pub backend_used: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartImageCompressPayload {
    pub task_id: String,
    pub input_path: String,
    pub quality: u8,
    pub output_directory: Option<String>,
    pub target_format: Option<String>,
    pub max_output_pixels: Option<u64>,
    pub max_memory_mb: Option<u64>,
    pub tile_size: Option<u32>,
    pub tile_overlap: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartImageCompressResult {
    pub task_id: String,
    pub input_path: String,
    pub output_path: String,
    pub success: bool,
    pub error: Option<String>,
    pub original_width: u32,
    pub original_height: u32,
    pub output_width: u32,
    pub output_height: u32,
    pub backend_used: String,
    pub input_bytes: u64,
    pub output_bytes: u64,
    pub compression_ratio: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartImageWatermarkPayload {
    pub task_id: String,
    pub input_path: String,
    pub output_directory: Option<String>,
    pub mode: String,
    pub position: String,
    pub opacity: u8,
    pub margin: u32,
    pub rotation: f32,
    pub offset_x_ratio: Option<f32>,
    pub offset_y_ratio: Option<f32>,
    pub offset_x_px_on_original: Option<u32>,
    pub offset_y_px_on_original: Option<u32>,
    pub text: Option<String>,
    pub font_size: Option<u32>,
    pub text_color: Option<String>,
    pub image_path: Option<String>,
    pub image_scale_percent: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetImageWatermarkPreviewGeometryPayload {
    pub input_path: String,
    pub mode: String,
    pub position: String,
    pub opacity: u8,
    pub margin: u32,
    pub rotation: f32,
    pub offset_x_ratio: Option<f32>,
    pub offset_y_ratio: Option<f32>,
    pub offset_x_px_on_original: Option<u32>,
    pub offset_y_px_on_original: Option<u32>,
    pub text: Option<String>,
    pub font_size: Option<u32>,
    pub text_color: Option<String>,
    pub image_path: Option<String>,
    pub image_scale_percent: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetImageWatermarkPreviewGeometryResult {
    pub base_width_px: u32,
    pub base_height_px: u32,
    pub overlay_width_px: u32,
    pub overlay_height_px: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartImageWatermarkResult {
    pub task_id: String,
    pub input_path: String,
    pub output_path: String,
    pub success: bool,
    pub error: Option<String>,
    pub original_width: u32,
    pub original_height: u32,
    pub output_width: u32,
    pub output_height: u32,
    pub backend_used: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetImagePreviewPayload {
    pub file_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetImagePreviewResult {
    pub data_url: String,
    pub mime_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenDirectoryPayload {
    pub directory_path: String,
}

#[tauri::command]
pub fn list_images_from_directory(
    payload: ListImagesFromDirectoryPayload,
) -> Result<ListImagesFromDirectoryResult, String> {
    let root_path = PathBuf::from(payload.directory_path);
    if !root_path.exists() {
        return Err(format!("目录不存在：{}", root_path.display()));
    }
    if !root_path.is_dir() {
        return Err(format!("路径不是目录：{}", root_path.display()));
    }

    let mut images = Vec::new();
    walk_directory_collect_images(&root_path, &mut images)?;
    images.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(ListImagesFromDirectoryResult { images })
}

#[tauri::command]
pub fn get_image_preview_data_url(payload: GetImagePreviewPayload) -> Result<GetImagePreviewResult, String> {
    let file_path = PathBuf::from(payload.file_path);
    if !file_path.exists() {
        return Err(format!("预览文件不存在：{}", file_path.display()));
    }
    if !file_path.is_file() {
        return Err(format!("预览路径不是文件：{}", file_path.display()));
    }
    if !is_supported_image_file(&file_path) {
        return Err("预览仅支持 PNG/JPG/JPEG/WEBP/BMP 格式".to_string());
    }

    let bytes = fs::read(&file_path)
        .map_err(|err| format!("读取预览文件失败 {}: {err}", file_path.display()))?;
    let mime_type = resolve_image_mime_type(&file_path);
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(GetImagePreviewResult {
        data_url: format!("data:{mime_type};base64,{encoded}"),
        mime_type: mime_type.to_string(),
    })
}

#[tauri::command]
pub fn open_directory_in_file_manager(payload: OpenDirectoryPayload) -> Result<(), String> {
    let directory_path = PathBuf::from(payload.directory_path);
    if !directory_path.exists() {
        return Err(format!("目录不存在：{}", directory_path.display()));
    }
    if !directory_path.is_dir() {
        return Err(format!("路径不是目录：{}", directory_path.display()));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(directory_path.as_os_str())
            .spawn()
            .map_err(|err| format!("打开目录失败：{err}"))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(directory_path.as_os_str())
            .spawn()
            .map_err(|err| format!("打开目录失败：{err}"))?;
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(directory_path.as_os_str())
            .spawn()
            .map_err(|err| format!("打开目录失败：{err}"))?;
        return Ok(());
    }
}

#[tauri::command]
pub fn get_image_watermark_preview_geometry(
    payload: GetImageWatermarkPreviewGeometryPayload,
) -> Result<GetImageWatermarkPreviewGeometryResult, String> {
    let input_path = PathBuf::from(payload.input_path.clone());
    if !input_path.exists() {
        return Err(format!("输入文件不存在：{}", input_path.display()));
    }
    if !input_path.is_file() {
        return Err(format!("输入路径不是文件：{}", input_path.display()));
    }
    if !is_supported_image_file(&input_path) {
        return Err("仅支持 PNG/JPG/JPEG/WEBP/BMP 格式".to_string());
    }

    let decoded = image::ImageReader::open(&input_path)
        .map_err(|err| format!("读取图片失败：{err}"))?
        .decode()
        .map_err(|err| format!("解码图片失败：{err}"))?;
    let format = ImageFormat::from_path(&input_path).unwrap_or(ImageFormat::Png);
    let loaded = LoadedImage { image: decoded, format };
    let params = json!({
        "mode": payload.mode,
        "position": payload.position,
        "opacity": payload.opacity,
        "margin": payload.margin,
        "rotation": payload.rotation,
        "offsetXRatio": payload.offset_x_ratio,
        "offsetYRatio": payload.offset_y_ratio,
        "offsetXPxOnOriginal": payload.offset_x_px_on_original,
        "offsetYPxOnOriginal": payload.offset_y_px_on_original,
        "text": payload.text,
        "fontSize": payload.font_size,
        "textColor": payload.text_color,
        "imagePath": payload.image_path,
        "imageScalePercent": payload.image_scale_percent
    });
    let geometry = compute_watermark_preview_geometry(&loaded, &params).map_err(|err| err.to_string())?;
    Ok(GetImageWatermarkPreviewGeometryResult {
        base_width_px: geometry.base_width,
        base_height_px: geometry.base_height,
        overlay_width_px: geometry.overlay_width,
        overlay_height_px: geometry.overlay_height,
    })
}

#[tauri::command]
pub async fn start_image_upscale(payload: StartImageUpscalePayload, app: AppHandle) -> Result<StartImageUpscaleResult, String> {
    let input_path = PathBuf::from(payload.input_path.clone());
    if !input_path.exists() {
        return Err(format!("输入文件不存在：{}", input_path.display()));
    }
    if !input_path.is_file() {
        return Err(format!("输入路径不是文件：{}", input_path.display()));
    }
    if !is_supported_image_file(&input_path) {
        return Err("仅支持 PNG/JPG/JPEG/WEBP/BMP 格式".to_string());
    }

    let scale = match payload.scale_factor {
        2 | 4 | 8 => payload.scale_factor,
        _ => return Err("仅支持 2 / 4 / 8 倍放大".to_string()),
    };

    let output_file_path = resolve_output_path(
        &input_path,
        payload.output_directory.as_deref(),
        scale,
        input_path.extension().and_then(|x| x.to_str()).unwrap_or("png"),
    )?;
    ensure_parent_dir_exists(&output_file_path)?;

    let task_id = payload.task_id.clone();
    let quality_mode = payload.quality_mode.unwrap_or_default();
    let backend_preference = payload.backend_preference.unwrap_or_default();
    let context = ProcessContext {
        task_id: task_id.clone(),
        processor_key: "upscale".to_string(),
        input_path: input_path.clone(),
        output_path: output_file_path.clone(),
        output_format: input_path
            .extension()
            .and_then(|x| x.to_str())
            .map(|x| x.to_string()),
        params: json!({
            "scaleFactor": scale,
            "qualityMode": format!("{:?}", quality_mode).to_lowercase(),
            "backendPreference": format!("{:?}", backend_preference).to_lowercase()
        }),
        limits: ProcessingLimits {
            max_output_side: 12_000,
            max_output_pixels: payload.max_output_pixels.unwrap_or(60_000_000),
            max_memory_mb: payload.max_memory_mb.unwrap_or(768),
        },
        tile: TileConfig {
            tile_size: payload.tile_size.unwrap_or(1024),
            tile_overlap: payload.tile_overlap.unwrap_or(16),
        },
    };
    let app_for_emit = app.clone();
    let reporter = CallbackProgressReporter::new(Arc::new(move |event: ProgressEvent| {
        let _ = app_for_emit.emit(IMAGE_UPSCALE_PROGRESS_EVENT, event);
    }));
    let result = run_blocking(move || {
        let pipeline = ImagePipeline::new(TileEngine {
            tile_size: context.tile.tile_size,
            tile_overlap: context.tile.tile_overlap,
        })
        .with_progress_reporter(Arc::new(reporter));
        pipeline.execute(&UpscaleProcessor, &context)
    })
    .await;

    let original = image::ImageReader::open(&input_path)
        .map_err(|err| format!("读取图片失败：{err}"))?
        .decode()
        .map_err(|err| format!("解码图片失败：{err}"))?;
    let original_width = original.width();
    let original_height = original.height();

    match result {
        Ok((outcome, _summary)) => {
            let _ = app.emit(
                IMAGE_UPSCALE_PROGRESS_EVENT,
                ProgressEvent {
                    task_id: task_id.clone(),
                    processor_key: "upscale".to_string(),
                    progress: 100,
                    stage: "completed".to_string(),
                    backend: Some(outcome.backend_used.clone()),
                    message: Some("处理完成".to_string()),
                },
            );
            Ok(StartImageUpscaleResult {
                task_id,
                input_path: input_path.display().to_string(),
                output_path: outcome.output_path.display().to_string(),
                success: true,
                error: None,
                original_width,
                original_height,
                output_width: outcome.output_width,
                output_height: outcome.output_height,
                backend_used: outcome.backend_used,
            })
        }
        Err(error) => {
            let output_width = original_width.saturating_mul(scale as u32);
            let output_height = original_height.saturating_mul(scale as u32);
            let _ = app.emit(
                IMAGE_UPSCALE_PROGRESS_EVENT,
                ProgressEvent {
                    task_id: task_id.clone(),
                    processor_key: "upscale".to_string(),
                    progress: 100,
                    stage: "failed".to_string(),
                    backend: Some("none".to_string()),
                    message: Some(error.to_string()),
                },
            );
            Ok(StartImageUpscaleResult {
                task_id,
                input_path: input_path.display().to_string(),
                output_path: String::new(),
                success: false,
                error: Some(error.to_string()),
                original_width,
                original_height,
                output_width,
                output_height,
                backend_used: "none".to_string(),
            })
        }
    }
}

#[tauri::command]
pub async fn start_image_compress(payload: StartImageCompressPayload, app: AppHandle) -> Result<StartImageCompressResult, String> {
    let input_path = PathBuf::from(payload.input_path.clone());
    if !input_path.exists() {
        return Err(format!("输入文件不存在：{}", input_path.display()));
    }
    if !input_path.is_file() {
        return Err(format!("输入路径不是文件：{}", input_path.display()));
    }
    if !is_supported_image_file(&input_path) {
        return Err("仅支持 PNG/JPG/JPEG/WEBP/BMP 格式".to_string());
    }
    if !(1..=100).contains(&payload.quality) {
        return Err("压缩质量仅支持 1..100".to_string());
    }

    let extension = resolve_compress_extension(
        payload.target_format.as_deref(),
        input_path.extension().and_then(|x| x.to_str()),
    )?;
    let output_file_path = resolve_compress_output_path(&input_path, payload.output_directory.as_deref(), extension)?;
    ensure_parent_dir_exists(&output_file_path)?;

    let task_id = payload.task_id.clone();
    let context = ProcessContext {
        task_id: task_id.clone(),
        processor_key: "compress".to_string(),
        input_path: input_path.clone(),
        output_path: output_file_path.clone(),
        output_format: Some(extension.to_string()),
        params: json!({
            "quality": payload.quality,
            "targetFormat": extension
        }),
        limits: ProcessingLimits {
            max_output_side: 12_000,
            max_output_pixels: payload.max_output_pixels.unwrap_or(60_000_000),
            max_memory_mb: payload.max_memory_mb.unwrap_or(768),
        },
        tile: TileConfig {
            tile_size: payload.tile_size.unwrap_or(1024),
            tile_overlap: payload.tile_overlap.unwrap_or(16),
        },
    };
    let app_for_emit = app.clone();
    let reporter = CallbackProgressReporter::new(Arc::new(move |event: ProgressEvent| {
        let _ = app_for_emit.emit(IMAGE_COMPRESS_PROGRESS_EVENT, event);
    }));
    let result = run_blocking(move || {
        let pipeline = ImagePipeline::new(TileEngine {
            tile_size: context.tile.tile_size,
            tile_overlap: context.tile.tile_overlap,
        })
        .with_progress_reporter(Arc::new(reporter));
        pipeline.execute(&CompressProcessor, &context)
    })
    .await;

    let original = image::ImageReader::open(&input_path)
        .map_err(|err| format!("读取图片失败：{err}"))?
        .decode()
        .map_err(|err| format!("解码图片失败：{err}"))?;
    let original_width = original.width();
    let original_height = original.height();
    let input_bytes = fs::metadata(&input_path)
        .map(|meta| meta.len())
        .map_err(|err| format!("读取源文件大小失败：{err}"))?;

    match result {
        Ok((outcome, _summary)) => {
            let output_bytes = fs::metadata(&outcome.output_path)
                .map(|meta| meta.len())
                .map_err(|err| format!("读取输出文件大小失败：{err}"))?;
            let compression_ratio = calc_compression_ratio(input_bytes, output_bytes);
            let _ = app.emit(
                IMAGE_COMPRESS_PROGRESS_EVENT,
                ProgressEvent {
                    task_id: task_id.clone(),
                    processor_key: "compress".to_string(),
                    progress: 100,
                    stage: "completed".to_string(),
                    backend: Some(outcome.backend_used.clone()),
                    message: Some("处理完成".to_string()),
                },
            );
            Ok(StartImageCompressResult {
                task_id,
                input_path: input_path.display().to_string(),
                output_path: outcome.output_path.display().to_string(),
                success: true,
                error: None,
                original_width,
                original_height,
                output_width: outcome.output_width,
                output_height: outcome.output_height,
                backend_used: outcome.backend_used,
                input_bytes,
                output_bytes,
                compression_ratio,
            })
        }
        Err(error) => {
            let _ = app.emit(
                IMAGE_COMPRESS_PROGRESS_EVENT,
                ProgressEvent {
                    task_id: task_id.clone(),
                    processor_key: "compress".to_string(),
                    progress: 100,
                    stage: "failed".to_string(),
                    backend: Some("none".to_string()),
                    message: Some(error.to_string()),
                },
            );
            Ok(StartImageCompressResult {
                task_id,
                input_path: input_path.display().to_string(),
                output_path: String::new(),
                success: false,
                error: Some(error.to_string()),
                original_width,
                original_height,
                output_width: original_width,
                output_height: original_height,
                backend_used: "none".to_string(),
                input_bytes,
                output_bytes: 0,
                compression_ratio: 0.0,
            })
        }
    }
}

#[tauri::command]
pub async fn start_image_watermark(
    payload: StartImageWatermarkPayload,
    app: AppHandle,
) -> Result<StartImageWatermarkResult, String> {
    let input_path = PathBuf::from(payload.input_path.clone());
    if !input_path.exists() {
        return Err(format!("输入文件不存在：{}", input_path.display()));
    }
    if !input_path.is_file() {
        return Err(format!("输入路径不是文件：{}", input_path.display()));
    }
    if !is_supported_image_file(&input_path) {
        return Err("仅支持 PNG/JPG/JPEG/WEBP/BMP 格式".to_string());
    }
    if !(1..=100).contains(&payload.opacity) {
        return Err("透明度仅支持 1..100".to_string());
    }

    if payload.mode == "text" {
        if payload.text.as_deref().map(|value| value.trim().is_empty()).unwrap_or(true) {
            return Err("文字水印内容不能为空".to_string());
        }
    } else if payload.mode == "image" {
        let image_path = payload
            .image_path
            .as_deref()
            .ok_or_else(|| "图片水印模式必须提供水印图片".to_string())?;
        let watermark_path = PathBuf::from(image_path);
        if !watermark_path.exists() || !watermark_path.is_file() {
            return Err(format!("水印图片不存在：{}", watermark_path.display()));
        }
        if !is_supported_image_file(&watermark_path) {
            return Err("水印图片仅支持 PNG/JPG/JPEG/WEBP/BMP 格式".to_string());
        }
    } else {
        return Err("水印模式仅支持 text 或 image".to_string());
    }

    let extension = input_path.extension().and_then(|x| x.to_str()).unwrap_or("png");
    let output_file_path = resolve_watermark_output_path(&input_path, payload.output_directory.as_deref(), extension)?;
    ensure_parent_dir_exists(&output_file_path)?;

    let task_id = payload.task_id.clone();
    let context = ProcessContext {
        task_id: task_id.clone(),
        processor_key: "watermark".to_string(),
        input_path: input_path.clone(),
        output_path: output_file_path.clone(),
        output_format: Some(extension.to_string()),
        params: json!({
            "mode": payload.mode,
            "position": payload.position,
            "opacity": payload.opacity,
            "margin": payload.margin,
            "rotation": payload.rotation,
            "offsetXRatio": payload.offset_x_ratio,
            "offsetYRatio": payload.offset_y_ratio,
            "offsetXPxOnOriginal": payload.offset_x_px_on_original,
            "offsetYPxOnOriginal": payload.offset_y_px_on_original,
            "text": payload.text,
            "fontSize": payload.font_size,
            "textColor": payload.text_color,
            "imagePath": payload.image_path,
            "imageScalePercent": payload.image_scale_percent
        }),
        limits: ProcessingLimits {
            max_output_side: 12_000,
            max_output_pixels: 60_000_000,
            max_memory_mb: 768,
        },
        tile: TileConfig {
            tile_size: 1024,
            tile_overlap: 16,
        },
    };
    let app_for_emit = app.clone();
    let reporter = CallbackProgressReporter::new(Arc::new(move |event: ProgressEvent| {
        let _ = app_for_emit.emit(IMAGE_WATERMARK_PROGRESS_EVENT, event);
    }));
    let result = run_blocking(move || {
        let pipeline = ImagePipeline::new(TileEngine {
            tile_size: context.tile.tile_size,
            tile_overlap: context.tile.tile_overlap,
        })
        .with_progress_reporter(Arc::new(reporter));
        pipeline.execute(&WatermarkProcessor, &context)
    })
    .await;

    let original = image::ImageReader::open(&input_path)
        .map_err(|err| format!("读取图片失败：{err}"))?
        .decode()
        .map_err(|err| format!("解码图片失败：{err}"))?;
    let original_width = original.width();
    let original_height = original.height();

    match result {
        Ok((outcome, _summary)) => {
            let _ = app.emit(
                IMAGE_WATERMARK_PROGRESS_EVENT,
                ProgressEvent {
                    task_id: task_id.clone(),
                    processor_key: "watermark".to_string(),
                    progress: 100,
                    stage: "completed".to_string(),
                    backend: Some(outcome.backend_used.clone()),
                    message: Some("处理完成".to_string()),
                },
            );
            Ok(StartImageWatermarkResult {
                task_id,
                input_path: input_path.display().to_string(),
                output_path: outcome.output_path.display().to_string(),
                success: true,
                error: None,
                original_width,
                original_height,
                output_width: outcome.output_width,
                output_height: outcome.output_height,
                backend_used: outcome.backend_used,
            })
        }
        Err(error) => {
            let _ = app.emit(
                IMAGE_WATERMARK_PROGRESS_EVENT,
                ProgressEvent {
                    task_id: task_id.clone(),
                    processor_key: "watermark".to_string(),
                    progress: 100,
                    stage: "failed".to_string(),
                    backend: Some("none".to_string()),
                    message: Some(error.to_string()),
                },
            );
            Ok(StartImageWatermarkResult {
                task_id,
                input_path: input_path.display().to_string(),
                output_path: String::new(),
                success: false,
                error: Some(error.to_string()),
                original_width,
                original_height,
                output_width: original_width,
                output_height: original_height,
                backend_used: "none".to_string(),
            })
        }
    }
}

fn walk_directory_collect_images(dir_path: &Path, result: &mut Vec<String>) -> Result<(), String> {
    let entries = fs::read_dir(dir_path).map_err(|err| format!("读取目录失败 {}: {err}", dir_path.display()))?;
    for entry in entries {
        let entry = entry.map_err(|err| format!("读取目录项失败：{err}"))?;
        let path = entry.path();
        if path.is_dir() {
            walk_directory_collect_images(&path, result)?;
            continue;
        }
        if path.is_file() && is_supported_image_file(&path) {
            result.push(path.display().to_string());
        }
    }
    Ok(())
}

fn is_supported_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_IMAGE_EXTENSIONS.iter().any(|item| item.eq_ignore_ascii_case(ext)))
        .unwrap_or(false)
}

fn ensure_parent_dir_exists(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| format!("无法创建输出目录 {}：{err}", parent.display()))?;
    }
    Ok(())
}

fn resolve_output_path(
    input_path: &Path,
    output_directory: Option<&str>,
    scale: u8,
    extension: &str,
) -> Result<PathBuf, String> {
    let stem = input_path
        .file_stem()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "输入文件名非法".to_string())?;
    let target_root = if let Some(output_dir) = output_directory {
        PathBuf::from(output_dir)
    } else {
        let input_parent = input_path.parent().ok_or_else(|| "无法识别输入目录".to_string())?;
        input_parent.join("compress")
    };
    let initial = target_root.join(format!("{stem}_x{scale}.{extension}"));
    Ok(ensure_unique_output_path(&initial))
}

fn ensure_unique_output_path(path: &Path) -> PathBuf {
    if !path.exists() {
        return path.to_path_buf();
    }
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let stem = path.file_stem().and_then(|x| x.to_str()).unwrap_or("output");
    let ext = path.extension().and_then(|x| x.to_str()).unwrap_or("png");
    for index in 1.. {
        let candidate = parent.join(format!("{stem}_{index}.{ext}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    path.to_path_buf()
}

fn resolve_compress_extension(requested: Option<&str>, input_ext: Option<&str>) -> Result<&'static str, String> {
    if let Some(format) = requested {
        return match format.to_ascii_lowercase().as_str() {
            "jpg" | "jpeg" => Ok("jpg"),
            "png" => Ok("png"),
            "webp" => Ok("webp"),
            _ => Err("输出格式仅支持 jpg/jpeg/png/webp".to_string()),
        };
    }
    let ext = input_ext.unwrap_or("jpg").to_ascii_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => Ok("jpg"),
        "png" => Ok("png"),
        "webp" => Ok("webp"),
        _ => Ok("jpg"),
    }
}

fn resolve_compress_output_path(input_path: &Path, output_directory: Option<&str>, extension: &str) -> Result<PathBuf, String> {
    let stem = input_path
        .file_stem()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "输入文件名非法".to_string())?;
    let target_root = if let Some(output_dir) = output_directory {
        PathBuf::from(output_dir)
    } else {
        let input_parent = input_path.parent().ok_or_else(|| "无法识别输入目录".to_string())?;
        input_parent.join("compress")
    };
    let initial = target_root.join(format!("{stem}_compressed.{extension}"));
    Ok(ensure_unique_output_path(&initial))
}

fn resolve_watermark_output_path(input_path: &Path, output_directory: Option<&str>, extension: &str) -> Result<PathBuf, String> {
    let stem = input_path
        .file_stem()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "输入文件名非法".to_string())?;
    let target_root = if let Some(output_dir) = output_directory {
        PathBuf::from(output_dir)
    } else {
        let input_parent = input_path.parent().ok_or_else(|| "无法识别输入目录".to_string())?;
        input_parent.join("water")
    };
    let initial = target_root.join(format!("{stem}_watermark.{extension}"));
    Ok(ensure_unique_output_path(&initial))
}

fn calc_compression_ratio(input_bytes: u64, output_bytes: u64) -> f64 {
    if input_bytes == 0 {
        return 0.0;
    }
    let saved = input_bytes as f64 - output_bytes as f64;
    saved / input_bytes as f64
}

fn resolve_image_mime_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        _ => "application/octet-stream",
    }
}
