use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
};
use tauri::{AppHandle, Emitter, State};

pub const APP_UPDATE_INSTALL_PROGRESS_EVENT: &str = "app-update-install-progress";

pub struct PreparedInstallerState(pub Mutex<Option<PathBuf>>);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadAppUpdatePayload {
    pub download_url: String,
    pub version: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadAppUpdateResult {
    pub installer_path: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateInstallProgressPayload {
    pub phase: &'static str,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

fn ensure_update_download_dir() -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join("tooliva-updates");
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    Ok(dir)
}

fn infer_installer_extension(download_url: &str) -> &'static str {
    let lower = download_url.to_ascii_lowercase();
    if lower.ends_with(".msi") {
        "msi"
    } else {
        "exe"
    }
}

fn sanitize_version(version: &str) -> String {
    version
        .trim()
        .trim_start_matches('v')
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() || ch == '.' || ch == '-' { ch } else { '_' })
        .collect()
}

fn emit_progress(app: &AppHandle, phase: &'static str, downloaded_bytes: u64, total_bytes: u64) {
    let _ = app.emit(
        APP_UPDATE_INSTALL_PROGRESS_EVENT,
        AppUpdateInstallProgressPayload {
            phase,
            downloaded_bytes,
            total_bytes,
        },
    );
}

fn cleanup_old_installers(dir: &Path, keep_file: &Path) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path == keep_file {
                continue;
            }
            let _ = fs::remove_file(path);
        }
    }
}

fn validate_installer_executable(path: &Path) -> Result<(), String> {
    use std::io::Read;

    let mut file = fs::File::open(path).map_err(|err| err.to_string())?;
    let mut magic = [0u8; 2];
    file.read_exact(&mut magic)
        .map_err(|_| "installer_invalid:downloaded_file_is_not_a_windows_executable".to_string())?;
    if magic != [0x4D, 0x5A] {
        let _ = fs::remove_file(path);
        return Err("installer_invalid:downloaded_file_is_not_a_windows_executable".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn download_app_update_installer(
    app: AppHandle,
    state: State<'_, PreparedInstallerState>,
    payload: DownloadAppUpdatePayload,
) -> Result<DownloadAppUpdateResult, String> {
    let download_dir = ensure_update_download_dir()?;
    let extension = infer_installer_extension(&payload.download_url);
    let version = sanitize_version(&payload.version);
    let installer_path = download_dir.join(format!("Tooliva_{}_setup.{}", version, extension));

    let response = reqwest::Client::new()
        .get(&payload.download_url)
        .send()
        .await
        .map_err(|err| format!("network_error:{err}"))?;

    if !response.status().is_success() {
        return Err(format!("network_error:http_{}", response.status().as_u16()));
    }

    let total_bytes = response.content_length().unwrap_or(0);
    emit_progress(&app, "downloading", 0, total_bytes);

    let mut file = std::fs::File::create(&installer_path).map_err(|err| err.to_string())?;
    let mut downloaded_bytes = 0_u64;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|err| format!("network_error:{err}"))?;
        use std::io::Write;
        file.write_all(&chunk).map_err(|err| err.to_string())?;
        downloaded_bytes += chunk.len() as u64;
        emit_progress(&app, "downloading", downloaded_bytes, total_bytes);
    }

    file.sync_all().map_err(|err| err.to_string())?;

    if total_bytes > 0 && downloaded_bytes != total_bytes {
        let _ = fs::remove_file(&installer_path);
        return Err(format!(
            "network_error:incomplete_download:{downloaded_bytes}/{total_bytes}"
        ));
    }

    validate_installer_executable(&installer_path)?;
    emit_progress(&app, "finished", downloaded_bytes, total_bytes);
    cleanup_old_installers(&download_dir, &installer_path);

    let mut guard = state.0.lock().map_err(|_| "installer_state_poisoned".to_string())?;
    *guard = Some(installer_path.clone());

    Ok(DownloadAppUpdateResult {
        installer_path: installer_path.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
pub fn launch_prepared_update_installer(
    state: State<'_, PreparedInstallerState>,
) -> Result<(), String> {
    let installer_path = {
        let guard = state.0.lock().map_err(|_| "installer_state_poisoned".to_string())?;
        guard
            .clone()
            .ok_or_else(|| "installer_not_prepared".to_string())?
    };

    if !installer_path.is_file() {
        return Err("installer_not_found".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        // NSIS 安装包为 GUI 子系统，需用 start 拉起；直接 spawn + CREATE_NO_WINDOW 可能失败。
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let path_arg = installer_path.to_string_lossy().into_owned();
        Command::new("cmd")
            .args(["/C", "start", "", &path_arg])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|err| format!("installer_launch_failed:{err}"))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new(&installer_path)
            .spawn()
            .map_err(|err| format!("installer_launch_failed:{err}"))?;
    }

    Ok(())
}
