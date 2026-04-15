use serde::Serialize;

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
