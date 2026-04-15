use crate::image_core::executor::run_blocking;
use crate::image_core::pipeline::ImagePipeline;
use crate::image_core::progress::CallbackProgressReporter;
use crate::image_core::tile::TileEngine;
use crate::image_core::types::{ProcessContext, ProcessingLimits, ProgressEvent, TileConfig};
use crate::image_processors::upscale::processor::{UpscaleBackend, UpscaleProcessor, UpscaleQualityMode};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

const IMAGE_UPSCALE_PROGRESS_EVENT: &str = "image-upscale-progress";
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
