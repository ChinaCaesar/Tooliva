mod commands;
mod image_core;
mod image_processors;
mod runtime_bins;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            commands::db::apply_saved_window_size(app.handle())?;
            Ok(())
        })
        .manage(commands::image_jobs::ImageProcessorRegistryState(
            image_processors::registry::build_default_registry(),
        ))
        .invoke_handler(tauri::generate_handler![
            commands::system::ping_host,
            commands::image::list_images_from_directory,
            commands::image::get_image_preview_data_url,
            commands::image::get_image_watermark_preview_geometry,
            commands::image::get_image_watermark_overlay_preview_data_url,
            commands::image::open_directory_in_file_manager,
            commands::image::start_image_upscale,
            commands::image::start_image_compress,
            commands::image::start_image_watermark,
            commands::image_jobs::start_image_job,
            commands::db::get_app_settings,
            commands::db::save_app_settings,
            commands::db::record_tool_usage,
            commands::db::get_home_dashboard,
            commands::db::clear_local_user_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
