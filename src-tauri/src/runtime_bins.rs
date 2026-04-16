use std::env;
use std::path::PathBuf;

fn exe_name(binary: &str) -> String {
    if cfg!(target_os = "windows") {
        format!("{binary}.exe")
    } else {
        binary.to_string()
    }
}

pub fn resolve_binary(binary: &str) -> PathBuf {
    let file_name = exe_name(binary);
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates = [
                exe_dir.join(&file_name),
                exe_dir.join("resources").join(&file_name),
                exe_dir.join("resources").join("bin").join(&file_name),
                exe_dir.join("bin").join(&file_name),
            ];
            for path in candidates {
                if path.exists() {
                    return path;
                }
            }
        }
    }
    PathBuf::from(binary)
}
