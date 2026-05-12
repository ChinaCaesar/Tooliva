use serde::{Deserialize, Serialize};
use std::{
    borrow::Cow,
    collections::HashMap,
    fs,
    io::Read,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tauri::{AppHandle, Emitter, State};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use crate::runtime_bins::resolve_binary;

const WEBM_TO_MP4_PROGRESS_EVENT: &str = "webm-to-mp4-progress";
const WEBM_TO_MOV_PROGRESS_EVENT: &str = "webm-to-mov-progress";
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Default)]
pub struct TranscodeTaskRegistry {
    flags: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartWebmToMp4Payload {
    pub task_id: String,
    pub input_path: String,
    pub output_mode: String,
    pub output_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartWebmToMovPayload {
    pub task_id: String,
    pub input_path: String,
    pub output_mode: String,
    pub output_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelWebmToMp4Payload {
    pub task_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelWebmToMovPayload {
    pub task_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAsConvertedFilePayload {
    pub source_path: String,
    pub target_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartWebmToMp4Result {
    pub task_id: String,
    pub output_path: String,
    pub success: bool,
    pub cancelled: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartWebmToMovResult {
    pub task_id: String,
    pub output_path: String,
    pub success: bool,
    pub cancelled: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WebmToMp4ProgressEvent {
    pub task_id: String,
    pub progress: u8,
    pub out_time_ms: u64,
    pub speed: Option<String>,
    pub status: String,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WebmToMovProgressEvent {
    pub task_id: String,
    pub progress: u8,
    pub out_time_ms: u64,
    pub speed: Option<String>,
    pub status: String,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProbeFormatPayload {
    duration: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProbePayload {
    format: Option<ProbeFormatPayload>,
}

#[tauri::command]
pub fn cancel_webm_to_mp4(
    payload: CancelWebmToMp4Payload,
    registry: State<'_, TranscodeTaskRegistry>,
) -> Result<(), String> {
    let mut guard = registry
        .flags
        .lock()
        .map_err(|_| "任务注册器状态异常".to_string())?;
    if let Some(flag) = guard.remove(&payload.task_id) {
        flag.store(true, Ordering::SeqCst);
        return Ok(());
    }
    Err(format!("未找到任务：{}", payload.task_id))
}

#[tauri::command]
pub fn cancel_webm_to_mov(
    payload: CancelWebmToMovPayload,
    registry: State<'_, TranscodeTaskRegistry>,
) -> Result<(), String> {
    let mut guard = registry
        .flags
        .lock()
        .map_err(|_| "任务注册器状态异常".to_string())?;
    if let Some(flag) = guard.remove(&payload.task_id) {
        flag.store(true, Ordering::SeqCst);
        return Ok(());
    }
    Err(format!("未找到任务：{}", payload.task_id))
}

#[tauri::command]
pub fn save_as_converted_file(payload: SaveAsConvertedFilePayload) -> Result<String, String> {
    let source = PathBuf::from(payload.source_path);
    if !source.exists() {
        return Err("原始转换文件不存在，请先完成转换".to_string());
    }

    let mut target = PathBuf::from(payload.target_path);
    target.set_extension("mp4");
    ensure_parent_dir_exists(&target)?;

    fs::copy(&source, &target).map_err(|err| format!("另存为复制失败：{err}"))?;
    Ok(target.display().to_string())
}

#[tauri::command]
pub fn save_as_converted_mov_file(payload: SaveAsConvertedFilePayload) -> Result<String, String> {
    let source = PathBuf::from(payload.source_path);
    if !source.exists() {
        return Err("原始转换文件不存在，请先完成转换".to_string());
    }

    let mut target = PathBuf::from(payload.target_path);
    target.set_extension("mov");
    ensure_parent_dir_exists(&target)?;

    fs::copy(&source, &target).map_err(|err| format!("另存为复制失败：{err}"))?;
    Ok(target.display().to_string())
}

#[tauri::command]
pub fn start_webm_to_mp4(
    payload: StartWebmToMp4Payload,
    app: AppHandle,
    registry: State<'_, TranscodeTaskRegistry>,
) -> Result<StartWebmToMp4Result, String> {
    ensure_binary_exists("ffmpeg")?;
    ensure_binary_exists("ffprobe")?;

    let input_path = PathBuf::from(payload.input_path.as_str());
    if !input_path.exists() {
        return Err(format!("输入文件不存在：{}", input_path.display()));
    }

    let (resolved_output_path, use_unique_name) = resolve_output_path(
        &input_path,
        payload.output_mode.as_str(),
        payload.output_path.as_deref(),
        "mp4",
    )?;
    ensure_parent_dir_exists(&resolved_output_path)?;
    let output_path = if use_unique_name {
        ensure_unique_output_path(&resolved_output_path)
    } else {
        resolved_output_path
    };
    let duration_ms = probe_duration_ms(&input_path)?;

    let cancel_flag = Arc::new(AtomicBool::new(false));
    {
        let mut guard = registry
            .flags
            .lock()
            .map_err(|_| "任务注册器状态异常".to_string())?;
        guard.insert(payload.task_id.clone(), Arc::clone(&cancel_flag));
    }

    let ffmpeg_bin = resolve_binary("ffmpeg");
    let mut command = Command::new(ffmpeg_bin);
    command
        .arg("-y")
        .arg("-i")
        .arg(&input_path)
        .arg("-c:v")
        .arg("libx264")
        .arg("-c:a")
        .arg("aac")
        .arg("-movflags")
        .arg("+faststart")
        .arg("-progress")
        .arg("pipe:1")
        .arg("-nostats")
        .arg(&output_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = command
        .spawn()
        .map_err(|err| format!("启动 ffmpeg 失败：{err}"))?;

    let stderr_cache = Arc::new(Mutex::new(String::new()));
    let stderr_cache_for_thread = Arc::clone(&stderr_cache);
    let mut stderr_reader_handle = child.stderr.take().map(|stderr| {
        std::thread::spawn(move || {
            let mut reader = std::io::BufReader::new(stderr);
            let mut content = String::new();
            if reader.read_to_string(&mut content).is_ok() {
                if let Ok(mut cache) = stderr_cache_for_thread.lock() {
                    *cache = content;
                }
            }
        })
    });

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法读取 ffmpeg 标准输出".to_string())?;
    let mut reader = std::io::BufReader::new(stdout);
    let mut line = String::new();
    let mut latest_out_time_ms: u64 = 0;
    let mut latest_speed: Option<String> = None;

    loop {
        if cancel_flag.load(Ordering::SeqCst) {
            let _ = child.kill();
            let _ = child.wait();
            if let Some(handle) = stderr_reader_handle.take() {
                let _ = handle.join();
            }
            remove_registry_flag(&registry, payload.task_id.as_str());
            let cancelled_result = StartWebmToMp4Result {
                task_id: payload.task_id.clone(),
                output_path: output_path.display().to_string(),
                success: false,
                cancelled: true,
                error: Some("任务已取消".to_string()),
            };
            let _ = app.emit(
                WEBM_TO_MP4_PROGRESS_EVENT,
                WebmToMp4ProgressEvent {
                    task_id: payload.task_id.clone(),
                    progress: 0,
                    out_time_ms: latest_out_time_ms,
                    speed: latest_speed,
                    status: "cancelled".to_string(),
                    message: Some("任务已取消".to_string()),
                },
            );
            return Ok(cancelled_result);
        }

        line.clear();
        let bytes = std::io::BufRead::read_line(&mut reader, &mut line)
            .map_err(|err| format!("读取 ffmpeg 输出失败：{err}"))?;
        if bytes == 0 {
            if let Some(status) = child.try_wait().map_err(|err| err.to_string())? {
                let success = status.success();
                remove_registry_flag(&registry, payload.task_id.as_str());
                if success {
                    if let Some(handle) = stderr_reader_handle.take() {
                        let _ = handle.join();
                    }
                    let _ = app.emit(
                        WEBM_TO_MP4_PROGRESS_EVENT,
                        WebmToMp4ProgressEvent {
                            task_id: payload.task_id.clone(),
                            progress: 100,
                            out_time_ms: duration_ms,
                            speed: latest_speed.clone(),
                            status: "completed".to_string(),
                            message: Some("转换完成".to_string()),
                        },
                    );
                    return Ok(StartWebmToMp4Result {
                        task_id: payload.task_id,
                        output_path: output_path.display().to_string(),
                        success: true,
                        cancelled: false,
                        error: None,
                    });
                }

                if let Some(handle) = stderr_reader_handle.take() {
                    let _ = handle.join();
                }
                let stderr_text = read_cached_stderr(&stderr_cache);
                let error_message = if stderr_text.trim().is_empty() {
                    format!("ffmpeg 退出码：{:?}", status.code())
                } else {
                    extract_meaningful_ffmpeg_error(stderr_text)
                };

                let _ = app.emit(
                    WEBM_TO_MP4_PROGRESS_EVENT,
                    WebmToMp4ProgressEvent {
                        task_id: payload.task_id.clone(),
                        progress: progress_from_time(latest_out_time_ms, duration_ms),
                        out_time_ms: latest_out_time_ms,
                        speed: latest_speed,
                        status: "failed".to_string(),
                        message: Some(error_message.clone()),
                    },
                );
                return Ok(StartWebmToMp4Result {
                    task_id: payload.task_id,
                    output_path: output_path.display().to_string(),
                    success: false,
                    cancelled: false,
                    error: Some(error_message),
                });
            }
            std::thread::sleep(Duration::from_millis(20));
            continue;
        }

        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("out_time_ms=") {
            if let Ok(parsed) = value.parse::<u64>() {
                latest_out_time_ms = parsed;
                let progress = progress_from_time(parsed, duration_ms);
                let _ = app.emit(
                    WEBM_TO_MP4_PROGRESS_EVENT,
                    WebmToMp4ProgressEvent {
                        task_id: payload.task_id.clone(),
                        progress,
                        out_time_ms: parsed,
                        speed: latest_speed.clone(),
                        status: "running".to_string(),
                        message: None,
                    },
                );
            }
        } else if let Some(value) = trimmed.strip_prefix("speed=") {
            latest_speed = Some(value.to_string());
        }
    }
}

#[tauri::command]
pub fn start_webm_to_mov(
    payload: StartWebmToMovPayload,
    app: AppHandle,
    registry: State<'_, TranscodeTaskRegistry>,
) -> Result<StartWebmToMovResult, String> {
    ensure_binary_exists("ffmpeg")?;
    ensure_binary_exists("ffprobe")?;

    let input_path = PathBuf::from(payload.input_path.as_str());
    if !input_path.exists() {
        return Err(format!("输入文件不存在：{}", input_path.display()));
    }

    let (resolved_output_path, use_unique_name) = resolve_output_path(
        &input_path,
        payload.output_mode.as_str(),
        payload.output_path.as_deref(),
        "mov",
    )?;
    ensure_parent_dir_exists(&resolved_output_path)?;
    let output_path = if use_unique_name {
        ensure_unique_output_path(&resolved_output_path)
    } else {
        resolved_output_path
    };
    let duration_ms = probe_duration_ms(&input_path)?;

    let cancel_flag = Arc::new(AtomicBool::new(false));
    {
        let mut guard = registry
            .flags
            .lock()
            .map_err(|_| "任务注册器状态异常".to_string())?;
        guard.insert(payload.task_id.clone(), Arc::clone(&cancel_flag));
    }

    let ffmpeg_bin = resolve_binary("ffmpeg");
    let mut command = Command::new(ffmpeg_bin);
    command
        .arg("-y")
        .arg("-i")
        .arg(&input_path)
        .arg("-map")
        .arg("0:v:0")
        .arg("-map")
        .arg("0:a?")
        .arg("-c:v")
        .arg("prores_ks")
        .arg("-profile:v")
        .arg("4")
        .arg("-pix_fmt")
        .arg("yuva444p10le")
        .arg("-c:a")
        .arg("aac")
        .arg("-progress")
        .arg("pipe:1")
        .arg("-nostats")
        .arg(&output_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = command
        .spawn()
        .map_err(|err| format!("启动 ffmpeg 失败：{err}"))?;

    let stderr_cache = Arc::new(Mutex::new(String::new()));
    let stderr_cache_for_thread = Arc::clone(&stderr_cache);
    let mut stderr_reader_handle = child.stderr.take().map(|stderr| {
        std::thread::spawn(move || {
            let mut reader = std::io::BufReader::new(stderr);
            let mut content = String::new();
            if reader.read_to_string(&mut content).is_ok() {
                if let Ok(mut cache) = stderr_cache_for_thread.lock() {
                    *cache = content;
                }
            }
        })
    });

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法读取 ffmpeg 标准输出".to_string())?;
    let mut reader = std::io::BufReader::new(stdout);
    let mut line = String::new();
    let mut latest_out_time_ms: u64 = 0;
    let mut latest_speed: Option<String> = None;

    loop {
        if cancel_flag.load(Ordering::SeqCst) {
            let _ = child.kill();
            let _ = child.wait();
            if let Some(handle) = stderr_reader_handle.take() {
                let _ = handle.join();
            }
            remove_registry_flag(&registry, payload.task_id.as_str());
            let cancelled_result = StartWebmToMovResult {
                task_id: payload.task_id.clone(),
                output_path: output_path.display().to_string(),
                success: false,
                cancelled: true,
                error: Some("任务已取消".to_string()),
            };
            let _ = app.emit(
                WEBM_TO_MOV_PROGRESS_EVENT,
                WebmToMovProgressEvent {
                    task_id: payload.task_id.clone(),
                    progress: 0,
                    out_time_ms: latest_out_time_ms,
                    speed: latest_speed,
                    status: "cancelled".to_string(),
                    message: Some("任务已取消".to_string()),
                },
            );
            return Ok(cancelled_result);
        }

        line.clear();
        let bytes = std::io::BufRead::read_line(&mut reader, &mut line)
            .map_err(|err| format!("读取 ffmpeg 输出失败：{err}"))?;
        if bytes == 0 {
            if let Some(status) = child.try_wait().map_err(|err| err.to_string())? {
                let success = status.success();
                remove_registry_flag(&registry, payload.task_id.as_str());
                if success {
                    if let Some(handle) = stderr_reader_handle.take() {
                        let _ = handle.join();
                    }
                    let _ = app.emit(
                        WEBM_TO_MOV_PROGRESS_EVENT,
                        WebmToMovProgressEvent {
                            task_id: payload.task_id.clone(),
                            progress: 100,
                            out_time_ms: duration_ms,
                            speed: latest_speed.clone(),
                            status: "completed".to_string(),
                            message: Some("转换完成".to_string()),
                        },
                    );
                    return Ok(StartWebmToMovResult {
                        task_id: payload.task_id,
                        output_path: output_path.display().to_string(),
                        success: true,
                        cancelled: false,
                        error: None,
                    });
                }

                if let Some(handle) = stderr_reader_handle.take() {
                    let _ = handle.join();
                }
                let stderr_text = read_cached_stderr(&stderr_cache);
                let error_message = if stderr_text.trim().is_empty() {
                    format!("ffmpeg 退出码：{:?}", status.code())
                } else {
                    extract_meaningful_ffmpeg_error(stderr_text)
                };

                let _ = app.emit(
                    WEBM_TO_MOV_PROGRESS_EVENT,
                    WebmToMovProgressEvent {
                        task_id: payload.task_id.clone(),
                        progress: progress_from_time(latest_out_time_ms, duration_ms),
                        out_time_ms: latest_out_time_ms,
                        speed: latest_speed,
                        status: "failed".to_string(),
                        message: Some(error_message.clone()),
                    },
                );
                return Ok(StartWebmToMovResult {
                    task_id: payload.task_id,
                    output_path: output_path.display().to_string(),
                    success: false,
                    cancelled: false,
                    error: Some(error_message),
                });
            }
            std::thread::sleep(Duration::from_millis(20));
            continue;
        }

        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("out_time_ms=") {
            if let Ok(parsed) = value.parse::<u64>() {
                latest_out_time_ms = parsed;
                let progress = progress_from_time(parsed, duration_ms);
                let _ = app.emit(
                    WEBM_TO_MOV_PROGRESS_EVENT,
                    WebmToMovProgressEvent {
                        task_id: payload.task_id.clone(),
                        progress,
                        out_time_ms: parsed,
                        speed: latest_speed.clone(),
                        status: "running".to_string(),
                        message: None,
                    },
                );
            }
        } else if let Some(value) = trimmed.strip_prefix("speed=") {
            latest_speed = Some(value.to_string());
        }
    }
}

fn remove_registry_flag(registry: &State<'_, TranscodeTaskRegistry>, task_id: &str) {
    if let Ok(mut guard) = registry.flags.lock() {
        guard.remove(task_id);
    }
}

fn ensure_binary_exists(binary: &str) -> Result<(), String> {
    let binary_path = resolve_binary(binary);
    let display_name: Cow<'_, str> = if binary_path.as_os_str() == binary {
        Cow::Borrowed(binary)
    } else {
        Cow::Owned(binary_path.display().to_string())
    };
    let mut command = Command::new(&binary_path);
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);
    let status = command
        .arg("-version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|_| format!("未检测到 {binary}（当前查找：{display_name}）"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("{binary} 不可用，请检查安装和 PATH"))
    }
}

fn ensure_parent_dir_exists(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| format!("无法创建输出目录 {}：{err}", parent.display()))?;
    }
    Ok(())
}

fn resolve_output_path(
    input_path: &Path,
    output_mode: &str,
    output_path: Option<&str>,
    target_extension: &str,
) -> Result<(PathBuf, bool), String> {
    let stem = input_path
        .file_stem()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "输入文件名非法".to_string())?;

    match output_mode {
        "sameAsInput" => Ok((input_path.with_extension(target_extension), true)),
        "globalDirectory" => {
            let target_dir = output_path.ok_or_else(|| "缺少全局输出目录".to_string())?;
            Ok((
                Path::new(target_dir).join(format!("{stem}.{target_extension}")),
                true,
            ))
        }
        "customFilePath" => {
            let target_file = output_path.ok_or_else(|| "缺少另存为路径".to_string())?;
            let mut path = PathBuf::from(target_file);
            path.set_extension(target_extension);
            Ok((path, false))
        }
        _ => Err(format!("未知输出模式：{output_mode}")),
    }
}

fn ensure_unique_output_path(path: &Path) -> PathBuf {
    if !path.exists() {
        return path.to_path_buf();
    }

    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let stem = path.file_stem().and_then(|x| x.to_str()).unwrap_or("output");
    let ext = path.extension().and_then(|x| x.to_str()).unwrap_or("mp4");

    for index in 1.. {
        let candidate = parent.join(format!("{stem}_{index}.{ext}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    path.to_path_buf()
}

fn probe_duration_ms(input_path: &Path) -> Result<u64, String> {
    let ffprobe_bin = resolve_binary("ffprobe");
    let mut command = Command::new(ffprobe_bin);
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);
    let output = command
        .arg("-v")
        .arg("error")
        .arg("-show_format")
        .arg("-of")
        .arg("json")
        .arg(input_path)
        .output()
        .map_err(|err| format!("调用 ffprobe 失败：{err}"))?;
    if !output.status.success() {
        return Err("ffprobe 无法探测该文件".to_string());
    }

    let payload: ProbePayload = serde_json::from_slice(&output.stdout)
        .map_err(|err| format!("解析 ffprobe 输出失败：{err}"))?;
    let duration_text = payload
        .format
        .and_then(|format| format.duration)
        .ok_or_else(|| "ffprobe 未返回时长".to_string())?;
    let duration_sec = duration_text
        .parse::<f64>()
        .map_err(|_| "时长字段格式错误".to_string())?;
    let duration_ms = (duration_sec * 1000.0).round();
    if duration_ms <= 0.0 {
        return Err("时长无效，无法计算进度".to_string());
    }
    Ok(duration_ms as u64)
}

fn progress_from_time(out_time_ms: u64, duration_ms: u64) -> u8 {
    if duration_ms == 0 {
        return 0;
    }
    let ratio = (out_time_ms as f64) / (duration_ms as f64);
    let clamped = ratio.clamp(0.0, 1.0);
    (clamped * 100.0).round() as u8
}

fn read_cached_stderr(cache: &Arc<Mutex<String>>) -> String {
    if let Ok(content) = cache.lock() {
        return content.clone();
    }
    String::new()
}

fn extract_meaningful_ffmpeg_error(content: String) -> String {
    let lines: Vec<&str> = content
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect();

    for line in lines.iter().rev() {
        if line.starts_with("ffmpeg version")
            || line.starts_with("built with")
            || line.starts_with("configuration:")
            || line.starts_with("libav")
        {
            continue;
        }
        return (*line).to_string();
    }

    lines
        .last()
        .map(|line| (*line).to_string())
        .unwrap_or_else(|| "未知错误".to_string())
}
