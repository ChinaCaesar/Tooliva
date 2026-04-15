mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(commands::transcode::TranscodeTaskRegistry::default())
        .invoke_handler(tauri::generate_handler![
            commands::system::ping_host,
            commands::transcode::start_webm_to_mp4,
            commands::transcode::cancel_webm_to_mp4,
            commands::transcode::save_as_converted_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
