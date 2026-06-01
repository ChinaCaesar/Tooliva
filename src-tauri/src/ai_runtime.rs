use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{OnceLock, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

pub const LAMA_MODEL_ID: &str = "lama";
pub const LAMA_MODEL_FILE: &str = "big-lama.pt";
pub const LAMA_MODEL_SIZE_BYTES: u64 = 196_000_000;
pub const DEFAULT_AI_ROOT_DIR_NAME: &str = "ToolivaAI";
pub const AI_PATH_MODE_DEFAULT: &str = "default";
pub const AI_PATH_MODE_CUSTOM: &str = "custom";

static AI_PATH_CONFIG: OnceLock<RwLock<AiPathConfig>> = OnceLock::new();

#[derive(Debug, Clone)]
pub struct AiRuntimePaths {
    pub runtime_root: PathBuf,
    pub python_exe: PathBuf,
    pub sidecar_script: PathBuf,
    pub runtime_manifest_path: PathBuf,
    pub versions_root: PathBuf,
    pub backup_root: PathBuf,
    pub models_root: PathBuf,
    pub lama_model_file: PathBuf,
    pub torch_home: PathBuf,
    pub torch_lama_checkpoint: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct InstalledAiRuntimeState {
    #[serde(alias = "current_version")]
    pub current_version: Option<String>,
    pub channel: Option<String>,
    #[serde(alias = "package_sha256")]
    pub package_sha256: Option<String>,
    #[serde(alias = "package_url")]
    pub package_url: Option<String>,
    #[serde(default)]
    pub models: Vec<AiRuntimeModel>,
    #[serde(alias = "installed_at_ms")]
    pub installed_at_ms: Option<u64>,
    #[serde(alias = "current_path")]
    pub current_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRuntimeModel {
    pub name: String,
    pub version: String,
    #[serde(alias = "file_name")]
    pub file_name: String,
    pub size: u64,
    pub sha256: String,
    pub url: String,
}

#[derive(Debug, Clone, Default)]
pub struct AiPathSettingsInput {
    pub mode: String,
    pub runtime_root: String,
    pub models_root: String,
}

#[derive(Debug, Clone)]
pub struct ResolvedAiPathConfig {
    pub mode: String,
    pub runtime_root: PathBuf,
    pub models_root: PathBuf,
    pub default_runtime_root: PathBuf,
    pub default_models_root: PathBuf,
    pub runtime_uses_default: bool,
    pub models_uses_default: bool,
}

#[derive(Debug, Clone)]
struct AiPathConfig {
    mode: AiPathMode,
    runtime_root: String,
    models_root: String,
}

impl Default for AiPathConfig {
    fn default() -> Self {
        Self {
            mode: AiPathMode::Default,
            runtime_root: String::new(),
            models_root: String::new(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AiPathMode {
    Default,
    Custom,
}

impl AiPathMode {
    fn from_str(value: &str) -> Self {
        if value.eq_ignore_ascii_case(AI_PATH_MODE_CUSTOM) {
            Self::Custom
        } else {
            Self::Default
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Default => AI_PATH_MODE_DEFAULT,
            Self::Custom => AI_PATH_MODE_CUSTOM,
        }
    }
}

pub fn apply_ai_path_settings(input: AiPathSettingsInput) {
    let config = AiPathConfig {
        mode: AiPathMode::from_str(&input.mode),
        runtime_root: normalize_optional_path(&input.runtime_root),
        models_root: normalize_optional_path(&input.models_root),
    };
    let lock = AI_PATH_CONFIG.get_or_init(|| RwLock::new(AiPathConfig::default()));
    if let Ok(mut guard) = lock.write() {
        *guard = config;
    }
}

pub fn resolve_ai_path_config() -> Result<ResolvedAiPathConfig, String> {
    let snapshot = {
        let lock = AI_PATH_CONFIG.get_or_init(|| RwLock::new(AiPathConfig::default()));
        lock.read()
            .map(|guard| guard.clone())
            .unwrap_or_else(|_| AiPathConfig::default())
    };
    let (default_runtime_root, default_models_root) = resolve_default_ai_storage_roots()?;

    let runtime_root = if snapshot.mode == AiPathMode::Custom && !snapshot.runtime_root.is_empty() {
        PathBuf::from(&snapshot.runtime_root)
    } else {
        default_runtime_root.clone()
    };
    let models_root = if snapshot.mode == AiPathMode::Custom && !snapshot.models_root.is_empty() {
        PathBuf::from(&snapshot.models_root)
    } else {
        default_models_root.clone()
    };

    Ok(ResolvedAiPathConfig {
        mode: snapshot.mode.as_str().to_string(),
        runtime_uses_default: runtime_root == default_runtime_root,
        models_uses_default: models_root == default_models_root,
        runtime_root,
        models_root,
        default_runtime_root,
        default_models_root,
    })
}

pub fn resolve_default_ai_storage_roots() -> Result<(PathBuf, PathBuf), String> {
    let exe_path = env::current_exe()
        .map_err(|err| format!("Failed to resolve current executable path: {err}"))?;
    let install_dir = exe_path.parent().ok_or_else(|| {
        format!(
            "Failed to resolve application install directory from {}",
            exe_path.display()
        )
    })?;
    let ai_root = install_dir.join(DEFAULT_AI_ROOT_DIR_NAME);
    Ok((ai_root.join("runtime"), ai_root.join("models")))
}

pub fn resolve_ai_runtime_paths() -> Result<AiRuntimePaths, String> {
    let config = resolve_ai_path_config()?;
    let runtime_root = resolve_runtime_root()?;
    let python_exe = resolve_python_exe(&runtime_root);
    let sidecar_script = resolve_sidecar_script(&runtime_root);
    let runtime_manifest_path = resolve_runtime_manifest_path()?;
    let versions_root = resolve_versions_root()?;
    let backup_root = resolve_backup_root()?;
    let lama_model_file = config.models_root.join(LAMA_MODEL_ID).join(LAMA_MODEL_FILE);
    let torch_home = config.models_root.join("_torch");
    let torch_lama_checkpoint = torch_home
        .join("hub")
        .join("checkpoints")
        .join(LAMA_MODEL_FILE);
    Ok(AiRuntimePaths {
        runtime_root,
        python_exe,
        sidecar_script,
        runtime_manifest_path,
        versions_root,
        backup_root,
        models_root: config.models_root,
        lama_model_file,
        torch_home,
        torch_lama_checkpoint,
    })
}

pub fn ensure_lama_torch_checkpoint(paths: &AiRuntimePaths) -> Result<(), String> {
    if !paths.lama_model_file.exists() {
        return Err("LaMA model is not downloaded".to_string());
    }
    if let Some(parent) = paths.torch_lama_checkpoint.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    if paths.torch_lama_checkpoint.exists() {
        return Ok(());
    }
    fs::copy(&paths.lama_model_file, &paths.torch_lama_checkpoint)
        .map(|_| ())
        .map_err(|err| format!("Failed to prepare LaMA torch checkpoint: {err}"))
}

pub fn ensure_runtime_storage_writable() -> Result<PathBuf, String> {
    let config = resolve_ai_path_config()?;
    ensure_ai_storage_root_writable(
        &config.runtime_root,
        "AI 运行时目录",
        config.runtime_uses_default,
    )?;
    Ok(config.runtime_root)
}

pub fn ensure_models_storage_writable() -> Result<PathBuf, String> {
    let config = resolve_ai_path_config()?;
    ensure_ai_storage_root_writable(
        &config.models_root,
        "AI 模型目录",
        config.models_uses_default,
    )?;
    Ok(config.models_root)
}

pub fn read_installed_runtime_state() -> Result<Option<InstalledAiRuntimeState>, String> {
    let path = resolve_runtime_manifest_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|err| {
        format!(
            "Failed to read AI runtime manifest at {}: {err}",
            path.display()
        )
    })?;
    serde_json::from_str::<InstalledAiRuntimeState>(&raw)
        .map(Some)
        .map_err(|err| format!("Failed to parse AI runtime manifest: {err}"))
}

pub fn write_installed_runtime_state(state: &InstalledAiRuntimeState) -> Result<(), String> {
    let path = resolve_runtime_manifest_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let content = serde_json::to_string_pretty(state).map_err(|err| err.to_string())?;
    fs::write(&path, content).map_err(|err| {
        format!(
            "Failed to write AI runtime manifest at {}: {err}",
            path.display()
        )
    })
}

pub fn resolve_runtime_version_dir(version: &str) -> Result<PathBuf, String> {
    Ok(resolve_versions_root()?.join(version))
}

pub fn resolve_current_runtime_dir() -> Result<PathBuf, String> {
    Ok(resolve_ai_runtime_data_root()?.join("current"))
}

pub fn resolve_ai_runtime_data_root() -> Result<PathBuf, String> {
    Ok(resolve_ai_path_config()?.runtime_root)
}

fn resolve_runtime_root() -> Result<PathBuf, String> {
    if let Some(state) = read_installed_runtime_state()? {
        if let Some(version) = state.current_version {
            let version_dir = resolve_runtime_version_dir(&version)?;
            if version_dir.exists() {
                return Ok(version_dir);
            }
        }
    }

    let current_dir = resolve_current_runtime_dir()?;
    if current_dir.exists() {
        return Ok(current_dir);
    }

    if cfg!(debug_assertions) {
        let dev_runtime = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("ai-runtime");
        if dev_runtime.exists() {
            return Ok(dev_runtime);
        }
    }

    Ok(current_dir)
}

fn resolve_python_exe(runtime_root: &Path) -> PathBuf {
    let windows = runtime_root.join("python").join("python.exe");
    if windows.exists() {
        return windows;
    }
    let windows_venv = runtime_root
        .join("python")
        .join("Scripts")
        .join("python.exe");
    if windows_venv.exists() {
        return windows_venv;
    }
    let unix = runtime_root.join("python").join("bin").join("python");
    if unix.exists() {
        return unix;
    }
    if cfg!(target_os = "windows") {
        runtime_root.join("python").join("python.exe")
    } else {
        runtime_root.join("python").join("bin").join("python")
    }
}

fn resolve_sidecar_script(runtime_root: &Path) -> PathBuf {
    runtime_root.join("sidecars").join("lama_inpaint.py")
}

fn resolve_runtime_manifest_path() -> Result<PathBuf, String> {
    Ok(resolve_ai_runtime_data_root()?.join("manifest.json"))
}

fn resolve_versions_root() -> Result<PathBuf, String> {
    Ok(resolve_ai_runtime_data_root()?.join("versions"))
}

fn resolve_backup_root() -> Result<PathBuf, String> {
    Ok(resolve_ai_runtime_data_root()?.join("backup"))
}

fn ensure_ai_storage_root_writable(
    path: &Path,
    label: &str,
    uses_default: bool,
) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|err| {
        if uses_default {
            format!(
                "{}不可写，无法创建默认目录 {}：{err}。请在设置中改为自定义位置，或以管理员权限重新运行软件后重试。",
                label,
                path.display()
            )
        } else {
            format!(
                "{}不可写，无法创建目录 {}：{err}。请在设置中改用其他可写目录，或调整该目录权限后重试。",
                label,
                path.display()
            )
        }
    })?;

    let probe_name = format!(
        ".tooliva-write-test-{}-{}.tmp",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|item| item.as_millis())
            .unwrap_or_default()
    );
    let probe_path = path.join(probe_name);
    fs::write(&probe_path, b"tooliva").map_err(|err| {
        if uses_default {
            format!(
                "{}当前不可写：{}。请在设置中改为自定义位置，或以管理员权限重新运行软件后重试。详细信息：{}",
                label,
                path.display(),
                err
            )
        } else {
            format!(
                "{}当前不可写：{}。请在设置中改用其他可写目录，或调整该目录权限后重试。详细信息：{}",
                label,
                path.display(),
                err
            )
        }
    })?;
    let _ = fs::remove_file(&probe_path);
    Ok(())
}

fn normalize_optional_path(value: &str) -> String {
    value.trim().trim_matches('"').to_string()
}
