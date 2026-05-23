mod ai_runtime;
mod ai_worker;
mod batch;
mod batch_processors;
mod commands;
mod debug_log;
mod ffmpeg_gif;
mod image_core;
mod image_processors;
mod runtime_bins;

use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {
            // Windows/Linux：二次唤起时由 single-instance + deep-link 特性转发 URL 到已有实例。
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                // 开发模式未安装 MSI 时，将 tooliva:// 注册到当前 debug 可执行文件。
                app.deep_link().register_all()?;
            }

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
