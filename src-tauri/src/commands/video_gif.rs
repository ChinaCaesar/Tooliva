use crate::ffmpeg_gif::{
    compute_segment_duration, probe_duration_secs, resolve_ffmpeg_ffprobe, run_ffmpeg_video_to_gif,
    VideoToGifOptions, VideoToGifProgressEvent,
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

pub const VIDEO_TO_GIF_PROGRESS_EVENT: &str = "video-to-gif-progress";

const SUPPORTED_VIDEO_EXT: &[&str] = &["mp4", "webm", "mkv", "mov", "avi", "m4v", "wmv"];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartVideoToGifPayload {
    pub task_id: String,
    pub input_path: String,
    pub output_directory: Option<String>,
    pub options: VideoToGifOptions,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartVideoToGifResult {
    pub task_id: String,
    pub input_path: String,
    pub output_path: String,
    pub success: bool,
    pub error: Option<String>,
}

fn is_supported_video(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| SUPPORTED_VIDEO_EXT.iter().any(|s| s.eq_ignore_ascii_case(e)))
        .unwrap_or(false)
}

fn ensure_parent_dir_exists(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|err| format!("无法创建输出目录 {}：{err}", parent.display()))?;
    }
    Ok(())
}

fn ensure_unique_output_path(path: &Path) -> PathBuf {
    if !path.exists() {
        return path.to_path_buf();
    }
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let stem = path
        .file_stem()
        .and_then(|x| x.to_str())
        .unwrap_or("output");
    let ext = path.extension().and_then(|x| x.to_str()).unwrap_or("gif");
    for index in 1.. {
        let candidate = parent.join(format!("{stem}_{index}.{ext}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    path.to_path_buf()
}

fn resolve_gif_output_path(input_path: &Path, output_directory: Option<&str>) -> Result<PathBuf, String> {
    let stem = input_path
        .file_stem()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "输入文件名非法".to_string())?;
    let target_root = if let Some(dir) = output_directory {
        PathBuf::from(dir)
    } else {
        let parent = input_path
            .parent()
            .ok_or_else(|| "无法识别输入目录".to_string())?;
        parent.join("gif")
    };
    let initial = target_root.join(format!("{stem}.gif"));
    Ok(ensure_unique_output_path(&initial))
}

fn validate_options(opts: &VideoToGifOptions) -> Result<(), String> {
    if !(1..=60).contains(&opts.fps) {
        return Err("帧率必须在 1～60 之间".to_string());
    }
    if let Some(m) = opts.max_frames {
        if m < 1 {
            return Err("最大帧数必须≥1".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn start_video_to_gif(
    payload: StartVideoToGifPayload,
    app: AppHandle,
) -> Result<StartVideoToGifResult, String> {
    let input_path = PathBuf::from(payload.input_path.trim());
    if !input_path.exists() {
        return Err(format!("输入文件不存在：{}", input_path.display()));
    }
    if !input_path.is_file() {
        return Err(format!("输入路径不是文件：{}", input_path.display()));
    }
    if !is_supported_video(&input_path) {
        return Err("暂不支持该视频容器/扩展名；请使用 MP4、WEBM、MOV、MKV 等常见格式".to_string());
    }
    validate_options(&payload.options)?;

    let output_path = resolve_gif_output_path(&input_path, payload.output_directory.as_deref())?;
    ensure_parent_dir_exists(&output_path)?;

    let (ffmpeg, ffprobe) = resolve_ffmpeg_ffprobe()?;
    let full_duration = probe_duration_secs(&ffprobe, &input_path)?;
    let segment = compute_segment_duration(full_duration, &payload.options)?;

    let task_id = payload.task_id.clone();
    let input_display = input_path.display().to_string();
    let output_display = output_path.display().to_string();
    let options = payload.options.clone();

    let input_pb = input_path.clone();
    let output_pb = output_path.clone();
    let ffmpeg_pb = ffmpeg.clone();
    let app_emit = app.clone();

    let run_result = tauri::async_runtime::spawn_blocking(move || {
        run_ffmpeg_video_to_gif(
            &ffmpeg_pb,
            &input_pb,
            &output_pb,
            &options,
            segment,
            &task_id,
            |evt| {
                let _ = app_emit.emit(VIDEO_TO_GIF_PROGRESS_EVENT, evt);
            },
        )
    })
    .await
    .map_err(|err| format!("后台任务失败：{err}"))?;

    match run_result {
        Ok(()) => Ok(StartVideoToGifResult {
            task_id: payload.task_id,
            input_path: input_display,
            output_path: output_display,
            success: true,
            error: None,
        }),
        Err(message) => {
            let _ = app.emit(
                VIDEO_TO_GIF_PROGRESS_EVENT,
                VideoToGifProgressEvent {
                    task_id: payload.task_id.clone(),
                    progress: 100.0,
                    stage: "failed".to_string(),
                    message: Some(message.clone()),
                },
            );
            Ok(StartVideoToGifResult {
                task_id: payload.task_id,
                input_path: input_display,
                output_path: String::new(),
                success: false,
                error: Some(message),
            })
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListVideosFromDirectoryPayload {
    pub directory_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListVideosFromDirectoryResult {
    pub videos: Vec<String>,
}

fn walk_directory_collect_videos(dir_path: &Path, result: &mut Vec<String>) -> Result<(), String> {
    let entries = fs::read_dir(dir_path)
        .map_err(|err| format!("读取目录失败 {}: {err}", dir_path.display()))?;
    for entry in entries {
        let entry = entry.map_err(|err| format!("读取目录项失败：{err}"))?;
        let path = entry.path();
        if path.is_dir() {
            walk_directory_collect_videos(&path, result)?;
            continue;
        }
        if path.is_file() && is_supported_video(&path) {
            result.push(path.display().to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn list_videos_from_directory(
    payload: ListVideosFromDirectoryPayload,
) -> Result<ListVideosFromDirectoryResult, String> {
    let root_path = PathBuf::from(payload.directory_path.trim());
    if !root_path.exists() {
        return Err(format!("目录不存在：{}", root_path.display()));
    }
    if !root_path.is_dir() {
        return Err(format!("路径不是目录：{}", root_path.display()));
    }
    let mut videos = Vec::new();
    walk_directory_collect_videos(&root_path, &mut videos)?;
    videos.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(ListVideosFromDirectoryResult { videos })
}
