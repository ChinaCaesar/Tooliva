use crate::ffmpeg_gif::filter::build_filter_complex;
use crate::ffmpeg_gif::types::{VideoToGifOptions, VideoToGifProgressEvent};
use crate::process_utils::hide_process_window;
use crate::runtime_bins::resolve_binary;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;

fn binary_missing_hint(name: &str) -> String {
    format!(
        "找不到可执行文件「{name}」。请将 {name} 加入 PATH，或在应用目录 resources/bin 下放置 {name}.exe（Windows）后再试。"
    )
}

pub fn resolve_ffmpeg_ffprobe() -> Result<(PathBuf, PathBuf), String> {
    Ok((resolve_binary("ffmpeg"), resolve_binary("ffprobe")))
}

pub fn probe_duration_secs(ffprobe: &Path, input: &Path) -> Result<f64, String> {
    let input_str = input
        .to_str()
        .ok_or_else(|| "输入路径编码无效".to_string())?;
    let mut command = Command::new(ffprobe);
    command.args([
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        input_str,
    ]);
    hide_process_window(&mut command);
    let out = command
        .output()
        .map_err(|err| format!("{} ({err})", binary_missing_hint("ffprobe")))?;
    if !out.status.success() {
        return Err(format!(
            "ffprobe 读取时长失败：{}",
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let line = text.lines().next().unwrap_or("").trim();
    line.parse::<f64>()
        .map_err(|_| format!("无法解析视频时长：{line:?}"))
}

pub fn compute_segment_duration(full_secs: f64, opts: &VideoToGifOptions) -> Result<f64, String> {
    let full_secs = full_secs.max(0.0);
    let start = opts.start_time_sec.unwrap_or(0.0).max(0.0);
    let end = opts.end_time_sec.unwrap_or(full_secs).min(full_secs);
    if !start.is_finite() || !end.is_finite() {
        return Err("时间裁剪参数无效".to_string());
    }
    if end <= start {
        return Err("结束时间必须大于起始时间".to_string());
    }
    Ok(end - start)
}

pub fn run_ffmpeg_video_to_gif<F>(
    ffmpeg: &Path,
    input: &Path,
    output: &Path,
    opts: &VideoToGifOptions,
    segment_duration_secs: f64,
    task_id: &str,
    mut on_progress: F,
) -> Result<(), String>
where
    F: FnMut(VideoToGifProgressEvent),
{
    let tid = task_id.to_string();
    let filter = build_filter_complex(opts)?;

    let mut args: Vec<String> = vec![
        "-hide_banner".into(),
        "-nostats".into(),
        "-loglevel".into(),
        "error".into(),
        "-progress".into(),
        "pipe:1".into(),
    ];

    if let Some(ss) = opts
        .start_time_sec
        .filter(|v| v.is_finite() && *v > f64::EPSILON)
    {
        args.push("-ss".into());
        args.push(format!("{ss:.6}"));
    }

    if let Some(to) = opts.end_time_sec.filter(|v| v.is_finite()) {
        args.push("-to".into());
        args.push(format!("{to:.6}"));
    }

    args.push("-i".into());
    args.push(
        input
            .to_str()
            .ok_or_else(|| "输入路径编码无效".to_string())?
            .to_string(),
    );

    args.push("-filter_complex".into());
    args.push(filter);
    args.push("-map".into());
    args.push("[gifv]".into());

    if let Some(max) = opts.max_frames.filter(|v| *v >= 1) {
        args.push("-frames:v".into());
        args.push(max.to_string());
    }

    if opts.loop_playback {
        args.push("-loop".into());
        args.push("0".into());
    } else {
        args.push("-loop".into());
        args.push("-1".into());
    }

    args.push("-y".into());
    args.push(
        output
            .to_str()
            .ok_or_else(|| "输出路径编码无效".to_string())?
            .to_string(),
    );

    on_progress(VideoToGifProgressEvent {
        task_id: tid.clone(),
        progress: 0.0,
        stage: "encoding".into(),
        message: Some("开始编码 GIF".into()),
    });

    let stderr_tail = Arc::new(Mutex::new(Vec::<String>::new()));
    let tail_clone = Arc::clone(&stderr_tail);

    let mut command = Command::new(ffmpeg);
    command
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    hide_process_window(&mut command);
    let mut child = command
        .spawn()
        .map_err(|err| format!("{} ({err})", binary_missing_hint("ffmpeg")))?;

    let stderr_pipe = child.stderr.take();
    thread::spawn(move || {
        if let Some(mut stderr) = stderr_pipe {
            let reader = BufReader::new(&mut stderr);
            for line in reader.lines().flatten() {
                if let Ok(mut g) = tail_clone.lock() {
                    g.push(line);
                    if g.len() > 40 {
                        let drain = g.len() - 40;
                        g.drain(0..drain);
                    }
                }
            }
        }
    });

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法读取 FFmpeg 输出".to_string())?;

    let duration_ms = (segment_duration_secs * 1000.0).max(1.0);
    let reader = BufReader::new(stdout);
    for line in reader.lines().flatten() {
        if let Some(rest) = line.strip_prefix("out_time_ms=") {
            if let Ok(ms) = rest.trim().parse::<u64>() {
                let pct = ((ms as f64 / duration_ms) * 100.0).clamp(0.0, 99.9);
                on_progress(VideoToGifProgressEvent {
                    task_id: tid.clone(),
                    progress: pct,
                    stage: "encoding".into(),
                    message: None,
                });
            }
        }
        if line.starts_with("progress=end") {
            on_progress(VideoToGifProgressEvent {
                task_id: tid.clone(),
                progress: 100.0,
                stage: "encoding".into(),
                message: None,
            });
        }
    }

    let status = child
        .wait()
        .map_err(|err| format!("等待 FFmpeg 结束失败：{err}"))?;
    if !status.success() {
        let tail = stderr_tail
            .lock()
            .map(|lines| lines.join("\n"))
            .unwrap_or_default();
        let hint = if tail.trim().is_empty() {
            String::new()
        } else {
            format!(" — FFmpeg：{}", tail.trim())
        };
        return Err(format!(
            "FFmpeg 退出码 {:?}；请确认滤镜参数与输入格式受支持。{}",
            status.code(),
            hint
        ));
    }

    on_progress(VideoToGifProgressEvent {
        task_id: tid,
        progress: 100.0,
        stage: "completed".into(),
        message: Some("GIF 已生成".into()),
    });
    Ok(())
}
