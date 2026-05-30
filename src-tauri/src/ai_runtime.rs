use serde::{Deserialize, Serialize};
use std::env;
use std::path::{Path, PathBuf};

pub const LAMA_MODEL_ID: &str = "lama";
pub const LAMA_MODEL_FILE: &str = "big-lama.pt";
pub const LAMA_MODEL_SIZE_BYTES: u64 = 196_000_000;

#[derive(Debug, Clone)]
pub struct AiRuntimePaths {
    pub runtime_root: PathBuf,
    pub python_exe: PathBuf,
    pub sidecar_script: PathBuf,
    pub runtime_manifest_path: PathBuf,
    pub versions_root: PathBuf,
    pub downloads_root: PathBuf,
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

pub fn resolve_ai_runtime_paths() -> Result<AiRuntimePaths, String> {
    let runtime_root = resolve_runtime_root()?;
    let python_exe = resolve_python_exe(&runtime_root);
    let sidecar_script = resolve_sidecar_script(&runtime_root);
    let runtime_manifest_path = resolve_runtime_manifest_path()?;
    let versions_root = resolve_versions_root()?;
    let downloads_root = resolve_downloads_root()?;
    let backup_root = resolve_backup_root()?;
    let models_root = resolve_models_root()?;
    let lama_model_file = models_root.join(LAMA_MODEL_ID).join(LAMA_MODEL_FILE);
    let torch_home = models_root.join("_torch");
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
        downloads_root,
        backup_root,
        models_root,
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
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    if paths.torch_lama_checkpoint.exists() {
        return Ok(());
    }
    std::fs::copy(&paths.lama_model_file, &paths.torch_lama_checkpoint)
        .map(|_| ())
        .map_err(|err| format!("Failed to prepare LaMA torch checkpoint: {err}"))
}

pub fn read_installed_runtime_state() -> Result<Option<InstalledAiRuntimeState>, String> {
    let path = resolve_runtime_manifest_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = std::fs::read_to_string(&path).map_err(|err| {
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
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let content = serde_json::to_string_pretty(state).map_err(|err| err.to_string())?;
    std::fs::write(&path, content).map_err(|err| {
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
    Ok(resolve_ai_runtime_home()?.join("current"))
}

pub fn resolve_ai_runtime_data_root() -> Result<PathBuf, String> {
    resolve_ai_runtime_home()
}

fn resolve_runtime_root() -> Result<PathBuf, String> {
    let current_dir = resolve_current_runtime_dir()?;
    if current_dir.exists() {
        return Ok(current_dir);
    }

    if let Some(state) = read_installed_runtime_state()? {
        if let Some(version) = state.current_version {
            let version_dir = resolve_runtime_version_dir(&version)?;
            if version_dir.exists() {
                return Ok(version_dir);
            }
        }
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
    Ok(resolve_ai_runtime_home()?.join("manifest.json"))
}

fn resolve_versions_root() -> Result<PathBuf, String> {
    Ok(resolve_ai_runtime_home()?.join("versions"))
}

fn resolve_downloads_root() -> Result<PathBuf, String> {
    Ok(resolve_ai_runtime_home()?.join("downloads"))
}

fn resolve_backup_root() -> Result<PathBuf, String> {
    Ok(resolve_ai_runtime_home()?.join("backup"))
}

fn resolve_ai_runtime_home() -> Result<PathBuf, String> {
    let local_app_data = if cfg!(target_os = "windows") {
        env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .ok_or_else(|| "LOCALAPPDATA is not set".to_string())?
            .join("DesktopToolbox")
    } else if cfg!(target_os = "macos") {
        env::var_os("HOME")
            .map(PathBuf::from)
            .ok_or_else(|| "HOME is not set".to_string())?
            .join("Library")
            .join("Application Support")
            .join("DesktopToolbox")
    } else {
        env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| {
                env::var_os("HOME").map(|home| PathBuf::from(home).join(".local").join("share"))
            })
            .ok_or_else(|| "Unable to resolve local data directory".to_string())?
            .join("DesktopToolbox")
    };
    Ok(local_app_data.join("ai-runtime"))
}

fn resolve_models_root() -> Result<PathBuf, String> {
    let app_data = if cfg!(target_os = "windows") {
        env::var_os("APPDATA")
            .map(PathBuf::from)
            .ok_or_else(|| "APPDATA is not set".to_string())?
            .join("DesktopToolbox")
    } else if cfg!(target_os = "macos") {
        env::var_os("HOME")
            .map(PathBuf::from)
            .ok_or_else(|| "HOME is not set".to_string())?
            .join("Library")
            .join("Application Support")
            .join("DesktopToolbox")
    } else {
        env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| {
                env::var_os("HOME").map(|home| PathBuf::from(home).join(".local").join("share"))
            })
            .ok_or_else(|| "Unable to resolve data directory".to_string())?
            .join("DesktopToolbox")
    };
    Ok(app_data.join("ai-models"))
}
