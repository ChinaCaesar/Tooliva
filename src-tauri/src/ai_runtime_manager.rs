use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::os::windows::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::ai_runtime::{
    read_installed_runtime_state, resolve_ai_runtime_data_root, resolve_ai_runtime_paths,
    resolve_current_runtime_dir, resolve_runtime_version_dir, write_installed_runtime_state,
    AiRuntimeModel, InstalledAiRuntimeState,
};

pub const AI_RUNTIME_PROGRESS_EVENT: &str = "ai-runtime-progress";

const PLACEHOLDER_SHA256_VALUES: &[&str] = &[
    "",
    "REAL_SHA256",
    "PLEASE_REPLACE_WITH_REAL_SHA256",
    "SKIPPED",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRuntimeRequirements {
    pub os: String,
    #[serde(alias = "min_memory_gb")]
    pub min_memory_gb: u64,
    #[serde(alias = "recommended_memory_gb")]
    pub recommended_memory_gb: u64,
    pub cpu: String,
    #[serde(alias = "avx_required")]
    pub avx_required: bool,
    #[serde(alias = "avx2_recommended")]
    pub avx2_recommended: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteAiRuntimeManifest {
    pub channel: String,
    #[serde(alias = "runtime_version")]
    pub runtime_version: String,
    #[serde(alias = "min_app_version")]
    pub min_app_version: String,
    pub platform: String,
    #[serde(alias = "package_size")]
    pub package_size: u64,
    #[serde(alias = "package_sha256")]
    pub package_sha256: String,
    #[serde(alias = "package_url")]
    pub package_url: String,
    #[serde(alias = "required_free_disk_gb")]
    pub required_free_disk_gb: u64,
    pub requirements: AiRuntimeRequirements,
    #[serde(default)]
    pub models: Vec<AiRuntimeModel>,
    #[serde(default)]
    #[serde(alias = "release_notes")]
    pub release_notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRuntimeStatus {
    pub installed: bool,
    pub available: bool,
    pub current_version: Option<String>,
    pub install_path: String,
    pub current_path: String,
    pub versions_path: String,
    pub downloads_path: String,
    pub manifest_path: String,
    pub missing_reason: Option<String>,
    pub package_channel: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiEnvironmentStatus {
    pub allowed: bool,
    pub os_version: String,
    pub is_64_bit: bool,
    pub available_memory_gb: f64,
    pub available_disk_gb: f64,
    pub cpu_arch: String,
    pub avx: String,
    pub avx2: String,
    #[serde(default)]
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimePackageVerification {
    pub success: bool,
    pub sha256: String,
    pub package_path: String,
    pub expected_sha256: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInstallResult {
    pub version: String,
    pub install_path: String,
    pub current_path: String,
    pub manifest_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeDownloadResult {
    pub package_path: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub resumed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeRemovalResult {
    pub removed: bool,
    pub runtime_root: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRuntimeProgressPayload {
    pub stage: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percent: u8,
    pub bytes_per_second: u64,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgressLine {
    event: String,
    downloaded_bytes: Option<u64>,
    total_bytes: Option<u64>,
    bytes_per_second: Option<u64>,
}

pub fn check_ai_runtime_status_impl() -> Result<AiRuntimeStatus, String> {
    let paths = resolve_ai_runtime_paths()?;
    let state = read_installed_runtime_state()?;
    let available = paths.python_exe.exists() && paths.sidecar_script.exists();
    let missing_reason = if available {
        None
    } else if !paths.runtime_root.exists() {
        Some("未检测到 AI 运行时目录，请先安装 AI 增强组件。".to_string())
    } else if !paths.python_exe.exists() {
        Some("AI 运行时缺少 Python 解释器。".to_string())
    } else if !paths.sidecar_script.exists() {
        Some("AI 运行时缺少 lama_inpaint.py。".to_string())
    } else {
        Some("AI 运行时文件不完整。".to_string())
    };

    Ok(AiRuntimeStatus {
        installed: state
            .as_ref()
            .and_then(|item| item.current_version.clone())
            .is_some(),
        available,
        current_version: state.as_ref().and_then(|item| item.current_version.clone()),
        install_path: paths
            .runtime_root
            .parent()
            .unwrap_or(&paths.runtime_root)
            .display()
            .to_string(),
        current_path: paths.runtime_root.display().to_string(),
        versions_path: paths.versions_root.display().to_string(),
        downloads_path: paths.downloads_root.display().to_string(),
        manifest_path: paths.runtime_manifest_path.display().to_string(),
        missing_reason,
        package_channel: state.and_then(|item| item.channel),
    })
}

pub fn fetch_ai_runtime_manifest_impl(manifest_url: &str) -> Result<RemoteAiRuntimeManifest, String> {
    let content = run_powershell(&format!(
        "$ProgressPreference='SilentlyContinue'; (Invoke-WebRequest -UseBasicParsing -Uri '{}').Content",
        ps_escape(manifest_url)
    ))?;
    let manifest = serde_json::from_str::<RemoteAiRuntimeManifest>(content.trim())
        .map_err(|err| format!("Failed to parse AI runtime manifest: {err}"))?;
    validate_remote_manifest(&manifest)?;
    Ok(manifest)
}

pub fn check_ai_environment_impl(required_free_disk_gb: u64) -> Result<AiEnvironmentStatus, String> {
    let runtime_root = resolve_ai_runtime_paths()?
        .runtime_root
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| "Unable to resolve AI runtime root".to_string())?;
    let disk_bytes = get_available_disk_bytes(&runtime_root)?;
    let memory_bytes = get_available_memory_bytes()?;
    let is_64_bit = cfg!(target_pointer_width = "64");
    let os_version = query_os_version();
    let avx_supported = std::is_x86_feature_detected!("avx");
    let avx2_supported = std::is_x86_feature_detected!("avx2");
    let mut reasons = Vec::new();

    if !cfg!(target_os = "windows") {
        reasons.push("当前仅支持 Windows 10/11 64 位环境安装 AI 增强组件。".to_string());
    }
    if !is_64_bit {
        reasons.push("AI 增强组件仅支持 64 位系统。".to_string());
    }
    if memory_bytes < 8 * 1024 * 1024 * 1024 {
        reasons.push("可用内存不足 8 GB，无法安装 AI 增强组件。".to_string());
    }
    if disk_bytes < required_free_disk_gb * 1024 * 1024 * 1024 {
        reasons.push(format!(
            "可用磁盘空间不足 {} GB，无法安装 AI 增强组件。",
            required_free_disk_gb
        ));
    }

    Ok(AiEnvironmentStatus {
        allowed: reasons.is_empty(),
        os_version,
        is_64_bit,
        available_memory_gb: bytes_to_gb(memory_bytes),
        available_disk_gb: bytes_to_gb(disk_bytes),
        cpu_arch: std::env::consts::ARCH.to_string(),
        avx: if avx_supported { "supported" } else { "unknown" }.to_string(),
        avx2: if avx2_supported { "supported" } else { "unknown" }.to_string(),
        reasons,
    })
}

pub fn download_ai_runtime_impl<F>(
    manifest: &RemoteAiRuntimeManifest,
    mut emit: F,
) -> Result<RuntimeDownloadResult, String>
where
    F: FnMut(AiRuntimeProgressPayload),
{
    validate_remote_manifest(manifest)?;

    let paths = resolve_ai_runtime_paths()?;
    fs::create_dir_all(&paths.downloads_root).map_err(|err| err.to_string())?;
    let package_path = paths
        .downloads_root
        .join(format!("ai-runtime-{}-{}.zip", manifest.platform, manifest.runtime_version));
    let temp_package_path = package_path.with_extension("zip.download");
    if temp_package_path.exists() {
        fs::remove_file(&temp_package_path).map_err(|err| {
            format!(
                "Failed to remove stale AI runtime package temp file {}: {err}",
                temp_package_path.display()
            )
        })?;
    }

    emit(AiRuntimeProgressPayload {
        stage: "downloading".to_string(),
        downloaded_bytes: 0,
        total_bytes: manifest.package_size,
        percent: compute_percent(0, manifest.package_size),
        bytes_per_second: 0,
        message: Some("开始下载 AI 增强组件".to_string()),
    });

    let script = build_download_script(&manifest.package_url, &temp_package_path);
    let mut child = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| format!("Failed to start PowerShell downloader: {err}"))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture downloader stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture downloader stderr".to_string())?;

    let mut resolved_total_bytes = manifest.package_size;
    let mut resolved_downloaded_bytes = 0u64;
    let mut resolved_speed = 0u64;

    for line in BufReader::new(stdout).lines() {
        let line = line.map_err(|err| format!("Failed to read downloader progress: {err}"))?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let progress = serde_json::from_str::<DownloadProgressLine>(trimmed)
            .map_err(|err| format!("Failed to parse downloader progress line: {err}. Raw: {trimmed}"))?;
        resolved_downloaded_bytes = progress.downloaded_bytes.unwrap_or(resolved_downloaded_bytes);
        resolved_total_bytes = progress
            .total_bytes
            .filter(|value| *value > 0)
            .unwrap_or(resolved_total_bytes);
        resolved_speed = progress.bytes_per_second.unwrap_or(resolved_speed);

        emit(AiRuntimeProgressPayload {
            stage: "downloading".to_string(),
            downloaded_bytes: resolved_downloaded_bytes,
            total_bytes: resolved_total_bytes,
            percent: compute_percent(resolved_downloaded_bytes, resolved_total_bytes),
            bytes_per_second: resolved_speed,
            message: Some(if progress.event == "done" {
                "AI 增强组件下载完成".to_string()
            } else {
                "正在下载 AI 增强组件".to_string()
            }),
        });
    }

    let status = child
        .wait()
        .map_err(|err| format!("Failed to wait for PowerShell downloader: {err}"))?;
    let mut stderr_output = String::new();
    BufReader::new(stderr)
        .read_to_string(&mut stderr_output)
        .map_err(|err| format!("Failed to read downloader stderr: {err}"))?;
    if !status.success() {
        let _ = fs::remove_file(&temp_package_path);
        return Err(if stderr_output.trim().is_empty() {
            format!("PowerShell downloader failed with status {status}")
        } else {
            stderr_output.trim().to_string()
        });
    }

    let downloaded_bytes = fs::metadata(&temp_package_path)
        .map(|meta| meta.len())
        .map_err(|err| {
            format!(
                "Failed to read downloaded AI runtime package {}: {err}",
                temp_package_path.display()
            )
        })?;
    let total_bytes = resolved_total_bytes.max(downloaded_bytes);

    if package_path.exists() {
        fs::remove_file(&package_path).map_err(|err| {
            format!(
                "Failed to replace existing AI runtime package {}: {err}",
                package_path.display()
            )
        })?;
    }
    fs::rename(&temp_package_path, &package_path).map_err(|err| {
        format!(
            "Failed to finalize AI runtime package {}: {err}",
            package_path.display()
        )
    })?;

    Ok(RuntimeDownloadResult {
        package_path: package_path.display().to_string(),
        downloaded_bytes,
        total_bytes,
        resumed: false,
    })
}

pub fn verify_ai_runtime_package_impl(
    package_path: &Path,
    expected_sha256: &str,
) -> Result<RuntimePackageVerification, String> {
    validate_sha256_field(
        expected_sha256,
        "packageSha256",
        "请先替换为 ai-runtime.zip 的真实 SHA256。",
    )?;

    let actual = run_powershell(&format!(
        "(Get-FileHash -Algorithm SHA256 -LiteralPath '{}').Hash",
        ps_escape(&package_path.display().to_string())
    ))?;
    let actual = actual.trim().to_ascii_lowercase();
    if !actual.eq_ignore_ascii_case(expected_sha256) {
        let _ = fs::remove_file(package_path);
        return Err(format!(
            "AI runtime package SHA256 校验失败。期望 {}，实际 {}。",
            expected_sha256, actual
        ));
    }
    Ok(RuntimePackageVerification {
        success: true,
        sha256: actual,
        package_path: package_path.display().to_string(),
        expected_sha256: expected_sha256.to_string(),
    })
}

pub fn install_ai_runtime_package_impl(
    manifest: &RemoteAiRuntimeManifest,
    package_path: &Path,
) -> Result<RuntimeInstallResult, String> {
    let paths = resolve_ai_runtime_paths()?;
    let runtime_data_root = resolve_ai_runtime_data_root()?;
    fs::create_dir_all(&paths.versions_root).map_err(|err| err.to_string())?;
    fs::create_dir_all(&paths.backup_root).map_err(|err| err.to_string())?;
    let target_dir = resolve_runtime_version_dir(&manifest.runtime_version)?;
    let staging_dir = target_dir.with_extension("tmp");
    let current_dir = resolve_current_runtime_dir()?;

    if is_path_inside(&target_dir, &current_dir) || is_path_inside(&staging_dir, &current_dir) {
        return Err(format!(
            "Refusing to install AI runtime into an invalid directory. target={}, current={}",
            target_dir.display(),
            current_dir.display()
        ));
    }
    if staging_dir.exists() {
        fs::remove_dir_all(&staging_dir).map_err(|err| err.to_string())?;
    }
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir).map_err(|err| err.to_string())?;
    }
    fs::create_dir_all(&staging_dir).map_err(|err| err.to_string())?;

    run_powershell(&format!(
        "$ProgressPreference='SilentlyContinue'; Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
        ps_escape(&package_path.display().to_string()),
        ps_escape(&staging_dir.display().to_string())
    ))?;

    let runtime_root = normalize_extracted_runtime_root(&staging_dir)?;
    validate_runtime_layout(&runtime_root)?;

    if target_dir.exists() {
        fs::remove_dir_all(&target_dir).map_err(|err| err.to_string())?;
    }
    fs::rename(&runtime_root, &target_dir).map_err(|err| {
        format!(
            "Failed to finalize AI runtime version directory {}: {err}",
            target_dir.display()
        )
    })?;
    let _ = fs::remove_dir_all(&staging_dir);

    if !is_path_inside(&target_dir, &runtime_data_root) || !is_path_inside(&current_dir, &runtime_data_root) {
        return Err(format!(
            "Refusing to sync AI runtime outside data root. dataRoot={}, target={}, current={}",
            runtime_data_root.display(),
            target_dir.display(),
            current_dir.display()
        ));
    }
    sync_current_runtime(&target_dir, &current_dir)?;

    let installed_at_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|item| item.as_millis() as u64)
        .unwrap_or_default();
    write_installed_runtime_state(&InstalledAiRuntimeState {
        current_version: Some(manifest.runtime_version.clone()),
        channel: Some(manifest.channel.clone()),
        package_sha256: Some(manifest.package_sha256.clone()),
        package_url: Some(manifest.package_url.clone()),
        models: manifest.models.clone(),
        installed_at_ms: Some(installed_at_ms),
        current_path: Some(current_dir.display().to_string()),
    })?;

    Ok(RuntimeInstallResult {
        version: manifest.runtime_version.clone(),
        install_path: target_dir.display().to_string(),
        current_path: current_dir.display().to_string(),
        manifest_path: paths.runtime_manifest_path.display().to_string(),
    })
}

pub fn update_ai_runtime_impl<F>(
    manifest: &RemoteAiRuntimeManifest,
    mut emit: F,
) -> Result<RuntimeInstallResult, String>
where
    F: FnMut(AiRuntimeProgressPayload),
{
    validate_remote_manifest(manifest)?;

    let download = download_ai_runtime_impl(manifest, &mut emit)?;
    emit(AiRuntimeProgressPayload {
        stage: "verifying".to_string(),
        downloaded_bytes: download.downloaded_bytes,
        total_bytes: download.total_bytes,
        percent: 100,
        bytes_per_second: 0,
        message: Some("正在校验 AI 增强组件".to_string()),
    });
    verify_ai_runtime_package_impl(Path::new(&download.package_path), &manifest.package_sha256)?;
    emit(AiRuntimeProgressPayload {
        stage: "installing".to_string(),
        downloaded_bytes: download.downloaded_bytes,
        total_bytes: download.total_bytes,
        percent: 100,
        bytes_per_second: 0,
        message: Some("正在安装 AI 增强组件".to_string()),
    });
    install_ai_runtime_package_impl(manifest, Path::new(&download.package_path))
}

pub fn remove_ai_runtime_impl() -> Result<RuntimeRemovalResult, String> {
    let runtime_root = resolve_ai_runtime_data_root()?;
    if runtime_root.exists() {
        fs::remove_dir_all(&runtime_root).map_err(|err| {
            format!(
                "Failed to remove AI runtime directory {}: {err}",
                runtime_root.display()
            )
        })?;
    }
    Ok(RuntimeRemovalResult {
        removed: true,
        runtime_root: runtime_root.display().to_string(),
    })
}

fn normalize_extracted_runtime_root(staging_dir: &Path) -> Result<PathBuf, String> {
    let direct_python = staging_dir.join("python");
    let direct_sidecars = staging_dir.join("sidecars");
    if direct_python.exists() && direct_sidecars.exists() {
        return Ok(staging_dir.to_path_buf());
    }

    let entries = fs::read_dir(staging_dir)
        .map_err(|err| err.to_string())?
        .filter_map(|item| item.ok())
        .map(|item| item.path())
        .filter(|path| path.is_dir())
        .collect::<Vec<_>>();
    if entries.len() == 1 {
        return Ok(entries[0].clone());
    }
    Err("AI 运行时压缩包目录结构不正确。".to_string())
}

fn is_path_inside(path: &Path, parent: &Path) -> bool {
    let path_components = path.components().collect::<Vec<_>>();
    let parent_components = parent.components().collect::<Vec<_>>();
    path_components.len() >= parent_components.len()
        && path_components
            .iter()
            .zip(parent_components.iter())
            .all(|(path_part, parent_part)| path_part == parent_part)
}

fn validate_runtime_layout(target_dir: &Path) -> Result<(), String> {
    let python = target_dir.join("python").join("python.exe");
    let python_alt = target_dir.join("python").join("Scripts").join("python.exe");
    let sidecar = target_dir.join("sidecars").join("lama_inpaint.py");
    if !(python.exists() || python_alt.exists()) {
        return Err("AI 运行时安装包缺少 Python 解释器。".to_string());
    }
    if !sidecar.exists() {
        return Err("AI 运行时安装包缺少 lama_inpaint.py。".to_string());
    }
    Ok(())
}

fn sync_current_runtime(version_dir: &Path, current_dir: &Path) -> Result<(), String> {
    if current_dir.exists() {
        fs::remove_dir_all(current_dir).map_err(|err| err.to_string())?;
    }
    copy_dir_recursive(version_dir, current_dir)
}

fn copy_dir_recursive(from: &Path, to: &Path) -> Result<(), String> {
    fs::create_dir_all(to).map_err(|err| err.to_string())?;
    for entry in fs::read_dir(from).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let source = entry.path();
        let target = to.join(entry.file_name());
        if source.is_dir() {
            copy_dir_recursive(&source, &target)?;
        } else {
            fs::copy(&source, &target).map_err(|err| {
                format!(
                    "Failed to copy AI runtime file {} -> {}: {err}",
                    source.display(),
                    target.display()
                )
            })?;
        }
    }
    Ok(())
}

fn run_powershell(script: &str) -> Result<String, String> {
    let output = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script])
        .output()
        .map_err(|err| format!("Failed to start PowerShell: {err}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("PowerShell command failed with status {}", output.status)
        } else {
            stderr
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn build_download_script(url: &str, target_path: &Path) -> String {
    format!(
        r#"$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http
$uri = '{url}'
$target = '{target}'
$targetDir = Split-Path -Parent $target
if (-not (Test-Path -LiteralPath $targetDir)) {{
  New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}}
$handler = New-Object System.Net.Http.HttpClientHandler
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromHours(1)
$response = $client.GetAsync($uri, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
if (-not $response.IsSuccessStatusCode) {{
  throw ('Failed to download AI runtime package: HTTP ' + [int]$response.StatusCode + ' ' + $response.ReasonPhrase)
}}
$total = $response.Content.Headers.ContentLength
$stream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
$fileStream = [System.IO.File]::Open($target, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
try {{
  $buffer = New-Object byte[] 262144
  $downloaded = 0L
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $lastMs = 0L
  $lastBytes = 0L
  while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {{
    $fileStream.Write($buffer, 0, $read)
    $downloaded += [int64]$read
    if (($sw.ElapsedMilliseconds - $lastMs) -ge 150) {{
      $elapsedMs = [Math]::Max(1, $sw.ElapsedMilliseconds - $lastMs)
      $deltaBytes = $downloaded - $lastBytes
      $bps = [int64][Math]::Round(($deltaBytes * 1000.0) / $elapsedMs)
      [Console]::Out.WriteLine(([ordered]@{{
        event = 'progress'
        downloadedBytes = $downloaded
        totalBytes = $(if ($null -ne $total) {{ [int64]$total }} else {{ 0 }})
        bytesPerSecond = $bps
      }} | ConvertTo-Json -Compress))
      $lastMs = $sw.ElapsedMilliseconds
      $lastBytes = $downloaded
    }}
  }}
  $fileStream.Flush()
  $overallMs = [Math]::Max(1, $sw.ElapsedMilliseconds)
  $overallBps = [int64][Math]::Round(($downloaded * 1000.0) / $overallMs)
  [Console]::Out.WriteLine(([ordered]@{{
    event = 'done'
    downloadedBytes = $downloaded
    totalBytes = $(if ($null -ne $total) {{ [int64]$total }} else {{ 0 }})
    bytesPerSecond = $overallBps
  }} | ConvertTo-Json -Compress))
}} finally {{
  if ($stream) {{ $stream.Dispose() }}
  if ($fileStream) {{ $fileStream.Dispose() }}
  if ($response) {{ $response.Dispose() }}
  if ($client) {{ $client.Dispose() }}
  if ($handler) {{ $handler.Dispose() }}
}}"#,
        url = ps_escape(url),
        target = ps_escape(&target_path.display().to_string())
    )
}

fn validate_remote_manifest(manifest: &RemoteAiRuntimeManifest) -> Result<(), String> {
    if manifest.package_url.trim().is_empty() {
        return Err("AI runtime manifest 配置不完整：packageUrl 不能为空。".to_string());
    }
    validate_sha256_field(
        &manifest.package_sha256,
        "packageSha256",
        "请先替换为 ai-runtime.zip 的真实 SHA256。",
    )?;

    for (index, model) in manifest.models.iter().enumerate() {
        if model.url.trim().is_empty() {
            return Err(format!(
                "AI runtime manifest 配置不完整：models[{index}].url 不能为空。"
            ));
        }
        validate_sha256_field(
            &model.sha256,
            &format!("models[{index}].sha256"),
            &format!("请先替换为 {} 的真实 SHA256。", model.file_name),
        )?;
    }

    Ok(())
}

fn validate_sha256_field(value: &str, field_name: &str, fix_hint: &str) -> Result<(), String> {
    let normalized = normalize_sha256(value);
    if PLACEHOLDER_SHA256_VALUES
        .iter()
        .any(|placeholder| placeholder.eq_ignore_ascii_case(normalized.as_str()))
    {
        return Err(format!(
            "AI runtime manifest 配置不完整：{field_name} 仍为占位值，{fix_hint}"
        ));
    }
    if normalized.len() != 64 || !normalized.chars().all(|ch| ch.is_ascii_hexdigit()) {
        return Err(format!(
            "AI runtime manifest 配置不完整：{field_name} 不是合法的 SHA256，必须为 64 位十六进制字符串。"
        ));
    }
    Ok(())
}

fn normalize_sha256(value: &str) -> String {
    value.trim().to_ascii_uppercase()
}

fn compute_percent(downloaded_bytes: u64, total_bytes: u64) -> u8 {
    if total_bytes == 0 {
        return 0;
    }
    ((downloaded_bytes.min(total_bytes) as f64 / total_bytes as f64) * 100.0)
        .round()
        .clamp(0.0, 100.0) as u8
}

fn ps_escape(value: &str) -> String {
    value.replace('\'', "''")
}

fn bytes_to_gb(bytes: u64) -> f64 {
    ((bytes as f64 / 1024.0 / 1024.0 / 1024.0) * 100.0).round() / 100.0
}

fn query_os_version() -> String {
    Command::new("cmd")
        .args(["/C", "ver"])
        .output()
        .ok()
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "Windows".to_string())
}

fn get_available_memory_bytes() -> Result<u64, String> {
    #[repr(C)]
    struct MemoryStatusEx {
        dw_length: u32,
        dw_memory_load: u32,
        ull_total_phys: u64,
        ull_avail_phys: u64,
        ull_total_page_file: u64,
        ull_avail_page_file: u64,
        ull_total_virtual: u64,
        ull_avail_virtual: u64,
        ull_avail_extended_virtual: u64,
    }

    #[link(name = "Kernel32")]
    extern "system" {
        fn GlobalMemoryStatusEx(lp_buffer: *mut MemoryStatusEx) -> i32;
    }

    let mut status = MemoryStatusEx {
        dw_length: std::mem::size_of::<MemoryStatusEx>() as u32,
        dw_memory_load: 0,
        ull_total_phys: 0,
        ull_avail_phys: 0,
        ull_total_page_file: 0,
        ull_avail_page_file: 0,
        ull_total_virtual: 0,
        ull_avail_virtual: 0,
        ull_avail_extended_virtual: 0,
    };
    let ok = unsafe { GlobalMemoryStatusEx(&mut status) };
    if ok == 0 {
        return Err("Failed to query available memory".to_string());
    }
    Ok(status.ull_avail_phys)
}

fn get_available_disk_bytes(path: &Path) -> Result<u64, String> {
    #[link(name = "Kernel32")]
    extern "system" {
        fn GetDiskFreeSpaceExW(
            lp_directory_name: *const u16,
            lp_free_bytes_available_to_caller: *mut u64,
            lp_total_number_of_bytes: *mut u64,
            lp_total_number_of_free_bytes: *mut u64,
        ) -> i32;
    }

    let wide: Vec<u16> = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let mut free_bytes = 0u64;
    let ok = unsafe {
        GetDiskFreeSpaceExW(
            wide.as_ptr(),
            &mut free_bytes,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        )
    };
    if ok == 0 {
        return Err(format!(
            "Failed to query available disk space for {}",
            path.display()
        ));
    }
    Ok(free_bytes)
}
