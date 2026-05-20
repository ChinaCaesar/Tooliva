use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

use crate::ai_runtime::{
    ensure_lama_torch_checkpoint, resolve_ai_runtime_paths, LAMA_MODEL_FILE, LAMA_MODEL_ID,
    LAMA_MODEL_SIZE_BYTES, LAMA_MODEL_URL,
};
use crate::ai_worker::{
    check_lama_runtime_health, ensure_lama_worker_ready, inpaint_image_with_lama, AiRuntimeHealth,
    InpaintImageRequest,
};

pub const AI_MODEL_PROGRESS_EVENT: &str = "ai-model-progress";

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
pub struct AiModelProgressPayload {
    pub model_id: String,
    pub stage: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percent: u8,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadAiModelPayload {
    pub model_id: String,
}

#[derive(Debug, Deserialize)]
struct SidecarProgressLine {
    event: Option<String>,
    stage: Option<String>,
    downloaded_bytes: Option<u64>,
    total_bytes: Option<u64>,
    message: Option<String>,
}

#[tauri::command]
pub async fn get_ai_model_status(app: AppHandle) -> Result<AiModelStatus, String> {
    lama_status(&app)
}

#[tauri::command]
pub async fn download_ai_model(
    payload: DownloadAiModelPayload,
    app: AppHandle,
) -> Result<AiModelStatus, String> {
    if payload.model_id != LAMA_MODEL_ID {
        return Err(format!("Unsupported AI model: {}", payload.model_id));
    }
    let app_for_task = app.clone();
    tauri::async_runtime::spawn_blocking(move || download_lama_model_blocking(app_for_task))
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn warm_ai_inpaint_worker() -> Result<AiRuntimeHealth, String> {
    tauri::async_runtime::spawn_blocking(warm_ai_inpaint_worker_blocking)
        .await
        .map_err(|err| err.to_string())?
}

fn warm_ai_inpaint_worker_blocking() -> Result<AiRuntimeHealth, String> {
    let health = ensure_lama_worker_ready(false)?;
    let warm_dir = std::env::temp_dir().join("desktop-toolbox-ai-warmup");
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

fn lama_status(_app: &AppHandle) -> Result<AiModelStatus, String> {
    let paths = resolve_ai_runtime_paths()?;
    let size = std::fs::metadata(&paths.lama_model_file)
        .map(|m| m.len())
        .unwrap_or(0);
    let runtime_health = check_lama_runtime_health().ok();
    Ok(AiModelStatus {
        model_id: LAMA_MODEL_ID.to_string(),
        display_name: "LaMA Inpainting".to_string(),
        downloaded: paths.lama_model_file.exists() && size > 0,
        size_bytes: size,
        expected_size_bytes: LAMA_MODEL_SIZE_BYTES,
        model_path: paths.lama_model_file.display().to_string(),
        models_root: paths.models_root.display().to_string(),
        runtime_ready: runtime_health.as_ref().is_some_and(|health| health.ready),
        runtime_device: runtime_health
            .as_ref()
            .and_then(|health| health.device.clone()),
        torch_version: runtime_health.and_then(|health| health.torch_version),
    })
}

fn download_lama_model_blocking(app: AppHandle) -> Result<AiModelStatus, String> {
    let paths = resolve_ai_runtime_paths()?;
    append_download_log(
        &paths,
        &format!(
            "download requested; runtime_root={}; python={}; sidecar={}; model={}",
            paths.runtime_root.display(),
            paths.python_exe.display(),
            paths.sidecar_script.display(),
            paths.lama_model_file.display()
        ),
    );
    if paths.lama_model_file.exists() {
        let size = std::fs::metadata(&paths.lama_model_file)
            .map(|meta| meta.len())
            .unwrap_or(0);
        if size == 0 {
            let _ = std::fs::remove_file(&paths.lama_model_file);
        } else {
            ensure_lama_torch_checkpoint(&paths)?;
            emit_progress(
                &app,
                "ready",
                size,
                size,
                Some("LaMA model already exists".to_string()),
            );
            return lama_status(&app);
        }
    }
    if !paths.sidecar_script.exists() {
        let message = format!(
            "AI sidecar script not found: {}",
            paths.sidecar_script.display()
        );
        append_download_log(&paths, &message);
        return Err(message);
    }
    let python_version = check_python_available(&paths)?;
    append_download_log(&paths, &format!("python available: {python_version}"));
    if let Some(parent) = paths.lama_model_file.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    emit_progress(&app, "starting", 0, LAMA_MODEL_SIZE_BYTES, None);
    let mut child = Command::new(&paths.python_exe)
        .arg(&paths.sidecar_script)
        .arg("download-model")
        .arg("--model-url")
        .arg(LAMA_MODEL_URL)
        .arg("--model-path")
        .arg(&paths.lama_model_file)
        .arg("--torch-home")
        .arg(&paths.torch_home)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| {
            let message = format!(
                "Failed to start AI runtime {}: {err}",
                paths.python_exe.display()
            );
            append_download_log(&paths, &message);
            message
        })?;

    let stderr_handle = child.stderr.take().map(|mut stderr| {
        std::thread::spawn(move || {
            let mut buf = String::new();
            let _ = stderr.read_to_string(&mut buf);
            buf
        })
    });

    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            if let Ok(progress) = serde_json::from_str::<SidecarProgressLine>(&line) {
                if progress.event.as_deref() == Some("progress") {
                    emit_progress(
                        &app,
                        progress.stage.as_deref().unwrap_or("downloading"),
                        progress.downloaded_bytes.unwrap_or(0),
                        progress
                            .total_bytes
                            .filter(|total| *total > 0)
                            .unwrap_or(LAMA_MODEL_SIZE_BYTES),
                        progress.message,
                    );
                }
            }
        }
    }

    let status = child.wait().map_err(|err| err.to_string())?;
    let stderr_text = stderr_handle
        .and_then(|handle| handle.join().ok())
        .unwrap_or_default();
    if !status.success() {
        let detail = stderr_text.trim();
        let message = if detail.is_empty() {
            format!("LaMA model download failed with status {status}")
        } else {
            format!("LaMA model download failed with status {status}: {detail}")
        };
        append_download_log(&paths, &message);
        return Err(message);
    }
    ensure_lama_torch_checkpoint(&paths)?;
    emit_progress(
        &app,
        "ready",
        LAMA_MODEL_SIZE_BYTES,
        LAMA_MODEL_SIZE_BYTES,
        Some(format!("{LAMA_MODEL_FILE} is ready")),
    );
    lama_status(&app)
}

fn check_python_available(paths: &crate::ai_runtime::AiRuntimePaths) -> Result<String, String> {
    let output = Command::new(&paths.python_exe)
        .arg("--version")
        .output()
        .map_err(|err| {
            let message = format!(
                "AI runtime Python unavailable: {} ({err}). Expected project runtime under {}. Run scripts/setup-ai-runtime.ps1 before using AI watermark removal.",
                paths.python_exe.display(),
                paths.runtime_root.join("python").display()
            );
            append_download_log(paths, &message);
            message
        })?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let message = if detail.is_empty() {
            format!(
                "AI runtime Python check failed with status {}",
                output.status
            )
        } else {
            format!("AI runtime Python check failed: {detail}")
        };
        append_download_log(paths, &message);
        return Err(message);
    }
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    Ok(if stdout.is_empty() { stderr } else { stdout })
}

fn append_download_log(paths: &crate::ai_runtime::AiRuntimePaths, message: &str) {
    let log_dir = paths.models_root.join("_logs");
    if std::fs::create_dir_all(&log_dir).is_err() {
        return;
    }
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    let line = format!("[{ts}] {message}\n");
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_dir.join("ai-model-download.log"))
        .and_then(|mut file| std::io::Write::write_all(&mut file, line.as_bytes()));
}

fn emit_progress(
    app: &AppHandle,
    stage: &str,
    downloaded_bytes: u64,
    total_bytes: u64,
    message: Option<String>,
) {
    let total = total_bytes.max(1);
    let percent = ((downloaded_bytes.min(total) as f64 / total as f64) * 100.0).round() as u8;
    let _ = app.emit(
        AI_MODEL_PROGRESS_EVENT,
        AiModelProgressPayload {
            model_id: LAMA_MODEL_ID.to_string(),
            stage: stage.to_string(),
            downloaded_bytes,
            total_bytes,
            percent,
            message,
        },
    );
}
