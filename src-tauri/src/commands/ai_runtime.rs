use serde::Deserialize;

use crate::ai_runtime::{resolve_ai_runtime_data_root, resolve_ai_runtime_paths};
use crate::ai_runtime_manager::{
    check_ai_environment_impl, check_ai_runtime_status_impl, install_local_ai_runtime_package_impl,
    remove_ai_runtime_impl,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckAiEnvironmentPayload {
    pub required_free_disk_gb: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallLocalAiRuntimePackagePayload {
    pub package_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenLocalAiRuntimeDirectoryPayload {
    pub target: String,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalAiRuntimePathsPayload {
    pub runtime_root: String,
    pub models_root: String,
    pub current_runtime_path: String,
    pub versions_path: String,
    pub downloads_path: String,
    pub manifest_path: String,
    pub lama_model_path: String,
}

#[tauri::command]
pub async fn check_ai_runtime_status() -> Result<crate::ai_runtime_manager::AiRuntimeStatus, String>
{
    tauri::async_runtime::spawn_blocking(check_ai_runtime_status_impl)
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn check_ai_environment(
    payload: CheckAiEnvironmentPayload,
) -> Result<crate::ai_runtime_manager::AiEnvironmentStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        check_ai_environment_impl(payload.required_free_disk_gb)
    })
    .await
    .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn get_local_ai_runtime_paths() -> Result<LocalAiRuntimePathsPayload, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let data_root = resolve_ai_runtime_data_root()?;
        let paths = resolve_ai_runtime_paths()?;
        Ok(LocalAiRuntimePathsPayload {
            runtime_root: data_root.display().to_string(),
            models_root: paths.models_root.display().to_string(),
            current_runtime_path: paths.runtime_root.display().to_string(),
            versions_path: paths.versions_root.display().to_string(),
            downloads_path: paths.downloads_root.display().to_string(),
            manifest_path: paths.runtime_manifest_path.display().to_string(),
            lama_model_path: paths.lama_model_file.display().to_string(),
        })
    })
    .await
    .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn open_local_ai_runtime_directory(
    payload: OpenLocalAiRuntimeDirectoryPayload,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let paths = resolve_ai_runtime_paths()?;
        let data_root = resolve_ai_runtime_data_root()?;
        let target_path = match payload.target.as_str() {
            "runtime" => data_root,
            "models" => paths.models_root,
            "downloads" => paths.downloads_root,
            other => return Err(format!("Unsupported AI runtime directory target: {other}")),
        };

        std::fs::create_dir_all(&target_path).map_err(|err| {
            format!("Failed to create directory {}: {err}", target_path.display())
        })?;

        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("explorer")
                .arg(target_path.as_os_str())
                .spawn()
                .map_err(|err| format!("Failed to open directory {}: {err}", target_path.display()))?;
            return Ok(());
        }

        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(target_path.as_os_str())
                .spawn()
                .map_err(|err| format!("Failed to open directory {}: {err}", target_path.display()))?;
            return Ok(());
        }

        #[cfg(all(unix, not(target_os = "macos")))]
        {
            std::process::Command::new("xdg-open")
                .arg(target_path.as_os_str())
                .spawn()
                .map_err(|err| format!("Failed to open directory {}: {err}", target_path.display()))?;
            return Ok(());
        }
    })
    .await
    .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn install_local_ai_runtime_package(
    payload: InstallLocalAiRuntimePackagePayload,
) -> Result<crate::ai_runtime_manager::RuntimeInstallResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        install_local_ai_runtime_package_impl(std::path::PathBuf::from(payload.package_path).as_path())
    })
    .await
    .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn remove_ai_runtime() -> Result<crate::ai_runtime_manager::RuntimeRemovalResult, String>
{
    tauri::async_runtime::spawn_blocking(remove_ai_runtime_impl)
        .await
        .map_err(|err| err.to_string())?
}
