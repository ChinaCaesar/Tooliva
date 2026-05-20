mod ai_runtime;
mod ai_worker;
mod batch;
mod batch_processors;
mod commands;
mod ffmpeg_gif;
mod image_core;
mod image_processors;
mod runtime_bins;

use std::sync::Arc;

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
        .manage(batch::BatchTaskManagerState(Arc::new(
            batch::BatchTaskManager::new(batch_processors::build_default_batch_registry()),
        )))
        .invoke_handler(tauri::generate_handler![
            commands::system::ping_host,
            commands::system::get_path_metadata,
            commands::ai_models::get_ai_model_status,
            commands::ai_models::download_ai_model,
            commands::ai_models::warm_ai_inpaint_worker,
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
            commands::db::clear_local_user_data,
            commands::video_gif::start_video_to_gif,
            commands::video_gif::list_videos_from_directory,
            commands::batch::submit_batch_task,
            commands::batch::pause_batch_task,
            commands::batch::resume_batch_task,
            commands::batch::cancel_batch_task,
            commands::batch::get_batch_task_result,
            commands::batch::get_batch_task_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
