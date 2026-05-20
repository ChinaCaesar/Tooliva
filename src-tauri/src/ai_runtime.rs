use std::env;
use std::path::{Path, PathBuf};

pub const LAMA_MODEL_ID: &str = "lama";
pub const LAMA_MODEL_FILE: &str = "big-lama.pt";
pub const LAMA_MODEL_URL: &str =
    "https://github.com/Sanster/models/releases/download/add_big_lama/big-lama.pt";
pub const LAMA_MODEL_SIZE_BYTES: u64 = 196_000_000;

#[derive(Debug, Clone)]
pub struct AiRuntimePaths {
    pub runtime_root: PathBuf,
    pub python_exe: PathBuf,
    pub sidecar_script: PathBuf,
    pub models_root: PathBuf,
    pub lama_model_file: PathBuf,
    pub torch_home: PathBuf,
    pub torch_lama_checkpoint: PathBuf,
}

pub fn resolve_ai_runtime_paths() -> Result<AiRuntimePaths, String> {
    let runtime_root = resolve_runtime_root();
    let python_exe = resolve_python_exe(&runtime_root);
    let sidecar_script = resolve_sidecar_script(&runtime_root);
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

fn resolve_runtime_root() -> PathBuf {
    let dev_runtime = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("ai-runtime");
    if cfg!(debug_assertions) && dev_runtime.exists() {
        return dev_runtime;
    }

    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            for candidate in [
                exe_dir.join("resources").join("ai-runtime"),
                exe_dir.join("ai-runtime"),
                exe_dir.join("resources").join("bin").join("ai-runtime"),
            ] {
                if candidate.exists() {
                    return candidate;
                }
            }
        }
    }
    dev_runtime
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
