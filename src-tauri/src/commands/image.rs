use image::imageops::FilterType;
use image::ImageFormat;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const SUPPORTED_IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "bmp"];
const MAX_OUTPUT_SIDE: u32 = 12000;

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
    pub input_path: String,
    pub scale_factor: u8,
    pub output_directory: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartImageUpscaleResult {
    pub input_path: String,
    pub output_path: String,
    pub success: bool,
    pub error: Option<String>,
    pub original_width: u32,
    pub original_height: u32,
    pub output_width: u32,
    pub output_height: u32,
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
pub fn start_image_upscale(payload: StartImageUpscalePayload) -> Result<StartImageUpscaleResult, String> {
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

    let reader = image::io::Reader::open(&input_path)
        .map_err(|err| format!("读取图片失败：{err}"))?
        .with_guessed_format()
        .map_err(|err| format!("识别图片格式失败：{err}"))?;
    let format = reader.format().unwrap_or(ImageFormat::Png);
    let original = reader
        .decode()
        .map_err(|err| format!("解码图片失败：{err}"))?;

    let original_width = original.width();
    let original_height = original.height();
    let output_width = original_width.saturating_mul(scale as u32);
    let output_height = original_height.saturating_mul(scale as u32);
    if output_width > MAX_OUTPUT_SIDE || output_height > MAX_OUTPUT_SIDE {
        return Ok(StartImageUpscaleResult {
            input_path: input_path.display().to_string(),
            output_path: String::new(),
            success: false,
            error: Some(format!(
                "放大后尺寸 {}x{} 超过上限 {}x{}，请降低倍数后重试",
                output_width, output_height, MAX_OUTPUT_SIDE, MAX_OUTPUT_SIDE
            )),
            original_width,
            original_height,
            output_width,
            output_height,
        });
    }

    let output_file_path = resolve_output_path(
        &input_path,
        payload.output_directory.as_deref(),
        scale,
        format.extensions_str().first().copied().unwrap_or("png"),
    )?;
    ensure_parent_dir_exists(&output_file_path)?;

    let resized = original.resize(output_width, output_height, FilterType::Lanczos3);
    resized
        .save(&output_file_path)
        .map_err(|err| format!("写入放大图片失败：{err}"))?;

    Ok(StartImageUpscaleResult {
        input_path: input_path.display().to_string(),
        output_path: output_file_path.display().to_string(),
        success: true,
        error: None,
        original_width,
        original_height,
        output_width,
        output_height,
    })
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
