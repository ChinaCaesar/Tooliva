use std::path::Path;
use std::process::{Command, Stdio};

pub fn is_available() -> bool {
    let ffmpeg_ok = Command::new("ffmpeg")
        .arg("-version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|x| x.success())
        .unwrap_or(false);
    if !ffmpeg_ok {
        return false;
    }

    let output = Command::new("ffmpeg")
        .arg("-hide_banner")
        .arg("-encoders")
        .output();
    match output {
        Ok(result) => {
            let text = String::from_utf8_lossy(&result.stdout);
            text.contains("h264_nvenc") || text.contains("hevc_nvenc")
        }
        Err(_) => false,
    }
}

pub fn upscale_with_cuda(
    input_path: &Path,
    output_path: &Path,
    output_width: u32,
    output_height: u32,
) -> Result<(), String> {
    let filter = format!(
        "hwupload_cuda,scale_cuda={}:{}:interp_algo=lanczos,hwdownload,format=rgba",
        output_width, output_height
    );
    let status = Command::new("ffmpeg")
        .arg("-y")
        .arg("-i")
        .arg(input_path)
        .arg("-vf")
        .arg(filter)
        .arg("-frames:v")
        .arg("1")
        .arg("-update")
        .arg("1")
        .arg(output_path)
        .status()
        .map_err(|err| format!("调用 ffmpeg GPU 放大失败：{err}"))?;
    if !status.success() {
        return Err(format!("GPU 放大失败，ffmpeg 退出码：{:?}", status.code()));
    }
    Ok(())
}
