use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
pub struct PathMetadataResponse {
    pub size: u64,
}

#[derive(Serialize)]
pub struct TempDirectoryResponse {
    pub path: String,
}

#[tauri::command]
pub fn get_path_metadata(path: String) -> Result<PathMetadataResponse, String> {
    let trimmed = path.trim();
    let p = Path::new(trimmed);
    if !p.exists() {
        return Err("路径不存在".to_string());
    }
    if !p.is_file() {
        return Err("路径不是文件".to_string());
    }
    let meta = std::fs::metadata(p).map_err(|e| e.to_string())?;
    Ok(PathMetadataResponse { size: meta.len() })
}

#[tauri::command]
pub fn get_temp_directory() -> Result<TempDirectoryResponse, String> {
    let path = std::env::temp_dir();
    Ok(TempDirectoryResponse {
        path: path.to_string_lossy().into_owned(),
    })
}

#[derive(Serialize)]
pub struct PingResponse {
    message: String,
}

#[tauri::command]
pub fn ping_host(name: String) -> PingResponse {
    PingResponse {
        message: format!("Hello, {}! Tauri host is reachable.", name),
    }
}
