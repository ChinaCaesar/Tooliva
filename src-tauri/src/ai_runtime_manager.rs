use serde::Serialize;
use std::fs;
use std::os::windows::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::ai_runtime::{
    ensure_runtime_storage_writable, read_installed_runtime_state, resolve_ai_runtime_data_root,
    resolve_ai_runtime_paths, resolve_current_runtime_dir, resolve_runtime_version_dir,
    write_installed_runtime_state, InstalledAiRuntimeState,
};
use crate::process_utils::hide_process_window;
use crate::runtime_bins::resolve_binary;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRuntimeStatus {
    pub installed: bool,
    pub available: bool,
    pub current_version: Option<String>,
    pub install_path: String,
    pub current_path: String,
    pub versions_path: String,
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
pub struct RuntimeInstallResult {
    pub version: String,
    pub install_path: String,
    pub current_path: String,
    pub manifest_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeRemovalResult {
    pub removed: bool,
    pub runtime_root: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RuntimeSourceLayout {
    Portable,
    BaseBundle,
}

pub fn check_ai_runtime_status_impl() -> Result<AiRuntimeStatus, String> {
    let _ = cleanup_stale_current_runtime_dir();
    let paths = resolve_ai_runtime_paths()?;
    let state = read_installed_runtime_state()?;
    let available = paths.python_exe.exists() && paths.sidecar_script.exists();
    let installed = available
        || state
            .as_ref()
            .and_then(|item| item.current_version.clone())
            .is_some();
    let missing_reason = if available {
        None
    } else if !paths.runtime_root.exists() {
        Some("未检测到 AI 运行时目录，请先导入本地 AI 组件包。".to_string())
    } else if !paths.python_exe.exists() {
        Some("AI 运行时缺少 Python 解释器。".to_string())
    } else if !paths.sidecar_script.exists() {
        Some("AI 运行时缺少 lama_inpaint.py。".to_string())
    } else {
        Some("AI 运行时文件不完整。".to_string())
    };

    Ok(AiRuntimeStatus {
        installed,
        available,
        current_version: state.as_ref().and_then(|item| item.current_version.clone()),
        install_path: resolve_ai_runtime_data_root()?.display().to_string(),
        current_path: paths.runtime_root.display().to_string(),
        versions_path: paths.versions_root.display().to_string(),
        manifest_path: paths.runtime_manifest_path.display().to_string(),
        missing_reason,
        package_channel: state.and_then(|item| item.channel),
    })
}

pub fn check_ai_environment_impl(
    required_free_disk_gb: u64,
) -> Result<AiEnvironmentStatus, String> {
    let runtime_root = resolve_ai_runtime_data_root()?;
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
        avx: if avx_supported {
            "supported"
        } else {
            "unknown"
        }
        .to_string(),
        avx2: if avx2_supported {
            "supported"
        } else {
            "unknown"
        }
        .to_string(),
        reasons,
    })
}

pub fn install_local_ai_runtime_package_impl(
    package_path: &Path,
) -> Result<RuntimeInstallResult, String> {
    if !package_path.exists() {
        return Err(format!("AI 组件包不存在：{}", package_path.display()));
    }
    if !package_path.is_file() {
        return Err(format!("AI 组件包路径不是文件：{}", package_path.display()));
    }

    ensure_runtime_storage_writable()?;

    let package_size = fs::metadata(package_path)
        .map(|meta| meta.len())
        .unwrap_or_default();
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|item| item.as_secs())
        .unwrap_or_default();
    let file_stem = package_path
        .file_stem()
        .and_then(|item| item.to_str())
        .unwrap_or("ai-runtime");
    let runtime_version = format!(
        "manual-{}-{}",
        sanitize_version_segment(file_stem),
        timestamp
    );

    install_ai_runtime_package_impl(&runtime_version, "manual", package_size, package_path)
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

fn install_ai_runtime_package_impl(
    runtime_version: &str,
    channel: &str,
    _package_size: u64,
    package_path: &Path,
) -> Result<RuntimeInstallResult, String> {
    let paths = resolve_ai_runtime_paths()?;
    let runtime_data_root = resolve_ai_runtime_data_root()?;
    fs::create_dir_all(&paths.versions_root).map_err(|err| err.to_string())?;
    fs::create_dir_all(&paths.backup_root).map_err(|err| err.to_string())?;
    let target_dir = resolve_runtime_version_dir(runtime_version)?;
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

    extract_runtime_archive(package_path, &staging_dir)?;

    let runtime_root = normalize_extracted_runtime_root(&staging_dir)?;
    let layout = detect_runtime_source_layout(&runtime_root)?;

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

    match layout {
        RuntimeSourceLayout::Portable => {
            validate_portable_python_runtime(&target_dir)?;
        }
        RuntimeSourceLayout::BaseBundle => {
            materialize_runtime_from_bundle(&target_dir)?;
        }
    }
    validate_runtime_layout(&target_dir)?;

    if !is_path_inside(&target_dir, &runtime_data_root) {
        return Err(format!(
            "Refusing to install AI runtime outside data root. dataRoot={}, target={}",
            runtime_data_root.display(),
            target_dir.display(),
        ));
    }
    cleanup_legacy_current_runtime(&current_dir, runtime_version)?;

    let installed_at_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|item| item.as_millis() as u64)
        .unwrap_or_default();
    write_installed_runtime_state(&InstalledAiRuntimeState {
        current_version: Some(runtime_version.to_string()),
        channel: Some(channel.to_string()),
        package_sha256: None,
        package_url: Some(package_path.display().to_string()),
        models: Vec::new(),
        installed_at_ms: Some(installed_at_ms),
        current_path: Some(target_dir.display().to_string()),
    })?;

    Ok(RuntimeInstallResult {
        version: runtime_version.to_string(),
        install_path: target_dir.display().to_string(),
        current_path: target_dir.display().to_string(),
        manifest_path: paths.runtime_manifest_path.display().to_string(),
    })
}

fn normalize_extracted_runtime_root(staging_dir: &Path) -> Result<PathBuf, String> {
    let direct_python = staging_dir.join("python");
    let direct_python_base = staging_dir.join("python-base");
    let direct_python_site_packages = staging_dir.join("python-site-packages");
    let direct_sidecars = staging_dir.join("sidecars");
    if direct_python.exists() && direct_sidecars.exists() {
        return Ok(staging_dir.to_path_buf());
    }
    if direct_python_base.exists()
        && direct_python_site_packages.exists()
        && direct_sidecars.exists()
    {
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

fn detect_runtime_source_layout(target_dir: &Path) -> Result<RuntimeSourceLayout, String> {
    let sidecar = target_dir.join("sidecars").join("lama_inpaint.py");
    if !sidecar.exists() {
        return Err("AI 运行时安装包缺少 sidecars\\lama_inpaint.py。".to_string());
    }

    let python_root = target_dir.join("python");
    if python_root.exists() {
        validate_portable_python_runtime(target_dir)?;
        return Ok(RuntimeSourceLayout::Portable);
    }

    let base_python_root = target_dir.join("python-base");
    let bundled_site_packages = target_dir.join("python-site-packages");
    if base_python_root.exists() && bundled_site_packages.exists() {
        validate_base_python_root(&base_python_root)?;
        return Ok(RuntimeSourceLayout::BaseBundle);
    }

    Err("AI 运行时安装包目录结构不正确。请重新导入由发布脚本生成的 AI 组件包。".to_string())
}

fn validate_portable_python_runtime(target_dir: &Path) -> Result<(), String> {
    let python_root = target_dir.join("python");
    let portable_python = python_root.join("python.exe");
    let pyvenv_cfg = python_root.join("pyvenv.cfg");

    if pyvenv_cfg.exists() {
        return Err(
            "AI 运行时安装包包含 Python 虚拟环境（检测到 pyvenv.cfg），该环境依赖打包机器上的绝对路径，无法在新电脑上直接运行。请重新导入包含便携式 Python 的 AI 运行时包。".to_string(),
        );
    }

    if !portable_python.exists() {
        return Err(
            "AI 运行时安装包缺少 python\\python.exe。当前包看起来像开发环境产物，不是可分发的便携式 Python 运行时。".to_string(),
        );
    }

    Ok(())
}

fn validate_base_python_root(base_python_root: &Path) -> Result<(), String> {
    let base_python = base_python_root.join("python.exe");
    let pyvenv_cfg = base_python_root.join("pyvenv.cfg");
    if pyvenv_cfg.exists() {
        return Err(
            "AI 运行时安装包中的 python-base 仍然是虚拟环境，不能用于稳定发布。".to_string(),
        );
    }
    if !base_python.exists() {
        return Err(
            "AI 运行时安装包缺少 python-base\\python.exe，无法在本机重建运行环境。".to_string(),
        );
    }
    Ok(())
}

fn materialize_runtime_from_bundle(target_dir: &Path) -> Result<(), String> {
    let base_python_root = target_dir.join("python-base");
    let base_python_exe = base_python_root.join("python.exe");
    let bundled_site_packages = target_dir.join("python-site-packages");
    let runtime_python = target_dir.join("python");

    validate_base_python_root(&base_python_root)?;
    if !bundled_site_packages.exists() {
        return Err("AI 运行时安装包缺少 python-site-packages 目录。".to_string());
    }

    if runtime_python.exists() {
        fs::remove_dir_all(&runtime_python).map_err(|err| {
            format!(
                "Failed to reset materialized AI runtime at {}: {err}",
                runtime_python.display()
            )
        })?;
    }

    let mut create_venv = Command::new(&base_python_exe);
    create_venv.arg("-m").arg("venv").arg(&runtime_python);
    hide_process_window(&mut create_venv);
    let output = create_venv.output().map_err(|err| {
        format!("Failed to start bundled base Python while creating AI runtime environment: {err}")
    })?;
    if !output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!(
            "Failed to create local AI runtime environment. stdout: {}; stderr: {}",
            stdout, stderr
        ));
    }

    let target_site_packages = runtime_python.join("Lib").join("site-packages");
    if !target_site_packages.exists() {
        return Err(format!(
            "Materialized AI runtime site-packages directory was not created: {}",
            target_site_packages.display()
        ));
    }

    copy_dir_contents(&bundled_site_packages, &target_site_packages)?;
    validate_materialized_runtime(target_dir)
}

fn validate_materialized_runtime(target_dir: &Path) -> Result<(), String> {
    let python_exe = resolve_python_executable_in_dir(target_dir)?;
    let sidecar_script = target_dir.join("sidecars").join("lama_inpaint.py");
    if !sidecar_script.exists() {
        return Err(format!(
            "Materialized AI runtime is missing sidecar entrypoint: {}",
            sidecar_script.display()
        ));
    }

    let torch_home = resolve_ai_runtime_paths()?.torch_home;
    let mut command = Command::new(&python_exe);
    command
        .arg(&sidecar_script)
        .arg("check-runtime")
        .arg("--torch-home")
        .arg(&torch_home)
        .env("TORCH_HOME", &torch_home)
        .env("PYTHONNOUSERSITE", "1")
        .env("PYTHONUTF8", "1")
        .env("PYTHONIOENCODING", "utf-8");
    hide_process_window(&mut command);

    let output = command.output().map_err(|err| {
        format!(
            "Failed to start materialized AI runtime validation with {}: {err}",
            python_exe.display()
        )
    })?;
    if output.status.success() {
        return Ok(());
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    Err(format!(
        "Materialized AI runtime validation failed. stdout: {}; stderr: {}",
        stdout, stderr
    ))
}

fn resolve_python_executable_in_dir(target_dir: &Path) -> Result<PathBuf, String> {
    let direct_python = target_dir.join("python").join("python.exe");
    if direct_python.exists() {
        return Ok(direct_python);
    }

    let venv_python = target_dir.join("python").join("Scripts").join("python.exe");
    if venv_python.exists() {
        return Ok(venv_python);
    }

    Err(format!(
        "Materialized AI runtime is missing a Python executable under {}",
        target_dir.join("python").display()
    ))
}

fn sanitize_version_segment(input: &str) -> String {
    let sanitized = input
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '.' || ch == '-' || ch == '_' {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>();
    sanitized.trim_matches('-').to_string()
}

fn cleanup_legacy_current_runtime(current_dir: &Path, runtime_version: &str) -> Result<(), String> {
    if !current_dir.exists() {
        return Ok(());
    }
    let current_version_dir = resolve_runtime_version_dir(runtime_version)?;
    if current_dir == current_version_dir {
        return Ok(());
    }
    fs::remove_dir_all(current_dir).map_err(|err| {
        format!(
            "Failed to remove legacy duplicated AI runtime directory {}: {err}",
            current_dir.display()
        )
    })
}

fn cleanup_stale_current_runtime_dir() -> Result<(), String> {
    let Some(state) = read_installed_runtime_state()? else {
        return Ok(());
    };
    let Some(version) = state.current_version.as_deref() else {
        return Ok(());
    };
    let current_dir = resolve_current_runtime_dir()?;
    if !current_dir.exists() {
        return Ok(());
    }
    cleanup_legacy_current_runtime(&current_dir, version)
}

fn extract_runtime_archive(package_path: &Path, destination_dir: &Path) -> Result<(), String> {
    let extension = package_path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .unwrap_or_default();

    match extension.as_str() {
        "zip" => run_powershell(&format!(
            "$ProgressPreference='SilentlyContinue'; Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
            ps_escape(&package_path.display().to_string()),
            ps_escape(&destination_dir.display().to_string())
        ))
        .map(|_| ()),
        "7z" => extract_with_7zip(package_path, destination_dir),
        other => Err(format!(
            "Unsupported AI runtime package format: .{other}. Please import a .7z or .zip package."
        )),
    }
}

fn extract_with_7zip(package_path: &Path, destination_dir: &Path) -> Result<(), String> {
    let seven_zip = resolve_7zip_executable()?;
    let mut command = Command::new(&seven_zip);
    command
        .arg("x")
        .arg(package_path)
        .arg(format!("-o{}", destination_dir.display()))
        .arg("-y");
    hide_process_window(&mut command);
    let output = command.output().map_err(|err| {
        format!(
            "Failed to start 7-Zip extractor {}: {err}",
            seven_zip.display()
        )
    })?;
    if output.status.success() {
        return Ok(());
    }
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    Err(format!(
        "7-Zip extraction failed. stdout: {}; stderr: {}",
        stdout, stderr
    ))
}

fn resolve_7zip_executable() -> Result<PathBuf, String> {
    let candidates = [
        resolve_binary("7za"),
        resolve_binary("7z"),
        PathBuf::from(r"C:\Program Files\7-Zip\7z.exe"),
        PathBuf::from(r"C:\Program Files (x86)\7-Zip\7z.exe"),
        PathBuf::from(r"C:\Program Files (x86)\Adobe\Adobe Creative Cloud\Utils\zip\7za.exe"),
        PathBuf::from(r"C:\Program Files\NVIDIA Corporation\NVIDIA GeForce Experience\7z.exe"),
    ];
    for candidate in candidates {
        if candidate.exists() {
            return Ok(candidate);
        }
    }
    Err(
        "No 7-Zip executable was found. The app expected a bundled 7za/7z binary under resources/bin, but it was missing."
            .to_string(),
    )
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

fn copy_dir_contents(from: &Path, to: &Path) -> Result<(), String> {
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
    let mut command = Command::new("powershell");
    command.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
    ]);
    hide_process_window(&mut command);

    let output = command
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

fn ps_escape(value: &str) -> String {
    value.replace('\'', "''")
}

fn bytes_to_gb(bytes: u64) -> f64 {
    ((bytes as f64 / 1024.0 / 1024.0 / 1024.0) * 100.0).round() / 100.0
}

fn query_os_version() -> String {
    let mut command = Command::new("cmd");
    command.args(["/C", "ver"]);
    hide_process_window(&mut command);
    command
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

    let query_path = resolve_disk_query_path(path);
    let wide: Vec<u16> = query_path
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
            query_path.display()
        ));
    }
    Ok(free_bytes)
}

fn resolve_disk_query_path(path: &Path) -> PathBuf {
    if path.exists() {
        return path.to_path_buf();
    }

    let mut current = path.to_path_buf();
    while let Some(parent) = current.parent() {
        if parent.exists() {
            return parent.to_path_buf();
        }
        current = parent.to_path_buf();
    }

    #[cfg(target_os = "windows")]
    {
        let path_string = path.display().to_string();
        if path_string.len() >= 2 && path_string.as_bytes()[1] == b':' {
            return PathBuf::from(format!("{}\\", &path_string[..2]));
        }
        PathBuf::from("C:\\")
    }

    #[cfg(not(target_os = "windows"))]
    {
        PathBuf::from("/")
    }
}
