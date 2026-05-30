use serde::Deserialize;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

use crate::ai_runtime_manager::{
    check_ai_environment_impl, check_ai_runtime_status_impl, download_ai_runtime_impl,
    fetch_ai_runtime_manifest_impl, install_ai_runtime_package_impl, remove_ai_runtime_impl,
    update_ai_runtime_impl, verify_ai_runtime_package_impl, AiRuntimeProgressPayload,
    RemoteAiRuntimeManifest, AI_RUNTIME_PROGRESS_EVENT,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchAiRuntimeManifestPayload {
    pub manifest_url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckAiEnvironmentPayload {
    pub required_free_disk_gb: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadAiRuntimePayload {
    pub manifest: RemoteAiRuntimeManifest,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyAiRuntimePackagePayload {
    pub package_path: String,
    pub expected_sha256: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallAiRuntimePackagePayload {
    pub manifest: RemoteAiRuntimeManifest,
    pub package_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAiRuntimePayload {
    pub manifest: RemoteAiRuntimeManifest,
}

#[tauri::command]
pub async fn check_ai_runtime_status() -> Result<crate::ai_runtime_manager::AiRuntimeStatus, String>
{
    tauri::async_runtime::spawn_blocking(check_ai_runtime_status_impl)
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn fetch_ai_runtime_manifest(
    payload: FetchAiRuntimeManifestPayload,
) -> Result<RemoteAiRuntimeManifest, String> {
    tauri::async_runtime::spawn_blocking(move || fetch_ai_runtime_manifest_impl(&payload.manifest_url))
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
pub async fn download_ai_runtime(
    payload: DownloadAiRuntimePayload,
    app: AppHandle,
) -> Result<crate::ai_runtime_manager::RuntimeDownloadResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        download_ai_runtime_impl(&payload.manifest, |progress| emit_progress(&app, progress))
    })
    .await
    .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn verify_ai_runtime_package(
    payload: VerifyAiRuntimePackagePayload,
) -> Result<crate::ai_runtime_manager::RuntimePackageVerification, String> {
    tauri::async_runtime::spawn_blocking(move || {
        verify_ai_runtime_package_impl(PathBuf::from(payload.package_path).as_path(), &payload.expected_sha256)
    })
    .await
    .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn install_ai_runtime_package(
    payload: InstallAiRuntimePackagePayload,
) -> Result<crate::ai_runtime_manager::RuntimeInstallResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let package_path = PathBuf::from(payload.package_path);
        install_ai_runtime_package_impl(&payload.manifest, package_path.as_path())
    })
    .await
    .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn update_ai_runtime(
    payload: UpdateAiRuntimePayload,
    app: AppHandle,
) -> Result<crate::ai_runtime_manager::RuntimeInstallResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        update_ai_runtime_impl(&payload.manifest, |progress| emit_progress(&app, progress))
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

fn emit_progress(app: &AppHandle, payload: AiRuntimeProgressPayload) {
    let _ = app.emit(AI_RUNTIME_PROGRESS_EVENT, payload);
}
