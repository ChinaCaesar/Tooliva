use serde::Serialize;
use tauri::AppHandle;

use crate::ai_runtime::{
    ensure_lama_torch_checkpoint, ensure_models_storage_writable, read_installed_runtime_state,
    resolve_ai_runtime_paths, LAMA_MODEL_FILE, LAMA_MODEL_ID, LAMA_MODEL_SIZE_BYTES,
};
use crate::ai_worker::{
    check_lama_runtime_health, ensure_lama_worker_ready, inpaint_image_with_lama, AiRuntimeHealth,
    InpaintImageRequest,
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModelStatus {
    pub model_id: String,
    pub display_name: String,
    pub downloaded: bool,
    pub size_bytes: u64,
    pub expected_size_bytes: u64,
    pub model_path: String,
    pub models_root: String,
    pub runtime_ready: bool,
    pub runtime_device: Option<String>,
    pub torch_version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModelImportResult {
    pub model_id: String,
    pub model_path: String,
    pub size_bytes: u64,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportAiModelPayload {
    pub file_path: String,
}

#[tauri::command]
pub async fn get_ai_model_status(_app: AppHandle) -> Result<AiModelStatus, String> {
    lama_status()
}

#[tauri::command]
pub async fn warm_ai_inpaint_worker() -> Result<AiRuntimeHealth, String> {
    tauri::async_runtime::spawn_blocking(warm_ai_inpaint_worker_blocking)
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn import_ai_model(payload: ImportAiModelPayload) -> Result<AiModelImportResult, String> {
    tauri::async_runtime::spawn_blocking(move || import_ai_model_blocking(payload.file_path))
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn remove_ai_model() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(remove_ai_model_blocking)
        .await
        .map_err(|err| err.to_string())?
}

fn warm_ai_inpaint_worker_blocking() -> Result<AiRuntimeHealth, String> {
    let health = ensure_lama_worker_ready(false)?;
    let warm_dir = std::env::temp_dir().join("tooliva-ai-warmup");
    std::fs::create_dir_all(&warm_dir).map_err(|err| err.to_string())?;
    let input_path = warm_dir.join("warmup.png");
    let output_path = warm_dir.join("warmup_out.png");
    if !input_path.exists() {
        let image = image::RgbImage::from_pixel(32, 32, image::Rgb([240, 240, 240]));
        image.save(&input_path).map_err(|err| err.to_string())?;
    }
    let _ = inpaint_image_with_lama(InpaintImageRequest {
        input_path,
        output_path,
        regions: vec![serde_json::json!({
            "x": 0.25,
            "y": 0.25,
            "width": 0.5,
            "height": 0.5,
        })],
        output_format: "png".to_string(),
        mode: "standard".to_string(),
    });
    Ok(health)
}

fn lama_status() -> Result<AiModelStatus, String> {
    ensure_models_storage_writable()?;
    let paths = resolve_ai_runtime_paths()?;
    let manifest = read_installed_runtime_state()?;
    let expected_size = manifest
        .as_ref()
        .and_then(|item| item.models.iter().find(|model| model.name == LAMA_MODEL_ID))
        .map(|model| model.size)
        .unwrap_or(LAMA_MODEL_SIZE_BYTES);
    let size = std::fs::metadata(&paths.lama_model_file)
        .map(|m| m.len())
        .unwrap_or(0);
    let runtime_health = check_lama_runtime_health().ok();
    Ok(AiModelStatus {
        model_id: LAMA_MODEL_ID.to_string(),
        display_name: "LaMA Inpainting".to_string(),
        downloaded: paths.lama_model_file.exists() && size > 0,
        size_bytes: size,
        expected_size_bytes: expected_size,
        model_path: paths.lama_model_file.display().to_string(),
        models_root: paths.models_root.display().to_string(),
        runtime_ready: runtime_health.as_ref().is_some_and(|health| health.ready),
        runtime_device: runtime_health
            .as_ref()
            .and_then(|health| health.device.clone()),
        torch_version: runtime_health.and_then(|health| health.torch_version),
    })
}

fn remove_ai_model_blocking() -> Result<(), String> {
    let paths = resolve_ai_runtime_paths()?;
    if paths.lama_model_file.exists() {
        std::fs::remove_file(&paths.lama_model_file).map_err(|err| {
            format!(
                "删除模型文件失败 {}: {err}",
                paths.lama_model_file.display()
            )
        })?;
    }
    if paths.torch_lama_checkpoint.exists() {
        std::fs::remove_file(&paths.torch_lama_checkpoint).map_err(|err| {
            format!(
                "删除模型缓存失败 {}: {err}",
                paths.torch_lama_checkpoint.display()
            )
        })?;
    }
    Ok(())
}

fn import_ai_model_blocking(file_path: String) -> Result<AiModelImportResult, String> {
    let source = std::path::PathBuf::from(&file_path);
    if !source.exists() {
        return Err(format!("模型文件不存在：{}", source.display()));
    }
    if !source.is_file() {
        return Err(format!("模型路径不是文件：{}", source.display()));
    }
    let file_name = source
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "无法识别模型文件名".to_string())?;
    if !file_name.eq_ignore_ascii_case(LAMA_MODEL_FILE) {
        return Err(format!("请选择 {} 文件。", LAMA_MODEL_FILE));
    }

    let paths = resolve_ai_runtime_paths()?;
    if let Some(parent) = paths.lama_model_file.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    std::fs::copy(&source, &paths.lama_model_file).map_err(|err| {
        format!(
            "导入模型文件失败 {} -> {}: {err}",
            source.display(),
            paths.lama_model_file.display()
        )
    })?;
    ensure_lama_torch_checkpoint(&paths)?;
    let size_bytes = std::fs::metadata(&paths.lama_model_file)
        .map(|meta| meta.len())
        .unwrap_or_default();

    Ok(AiModelImportResult {
        model_id: LAMA_MODEL_ID.to_string(),
        model_path: paths.lama_model_file.display().to_string(),
        size_bytes,
    })
}
