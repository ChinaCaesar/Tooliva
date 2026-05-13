//! GIF 重编码滤镜链：`fps` → `scale` → 单次 `palettegen` + `paletteuse`。
//!
//! 可选前置 `mpdecimate`（删除重复帧）。输入为已解码视频链 `[0:v]`。

use crate::batch_processors::gif_compress_config::{
    CompressQuality, DitherLevel, FpsPreset, GifCompressBatchOptions, ResizePolicy,
};

/// 由业务选项推导出的 FFmpeg 滤镜参数。
#[derive(Debug, Clone)]
pub struct GifRecompressFilterParams {
    pub chain_prefix: String,
    pub max_colors: u32,
    pub stats_mode: &'static str,
    pub dither: &'static str,
    pub bayer_scale: u32,
    pub reserve_transparent: u8,
}

pub fn build_filter_params(opts: &GifCompressBatchOptions) -> Result<GifRecompressFilterParams, String> {
    if opts.target_size_mb.is_some() {
        return Err("目标体积压缩尚未实现，请清空目标大小".to_string());
    }

    let mut parts: Vec<String> = Vec::new();
    // palettegen 需要足够「帧」供 mpdecimate 丢弃；先 format 再 scale/fps，再 mpdecimate，避免低帧率 GIF 被删成 0 帧。
    if opts.keep_transparency {
        parts.push("format=rgba".to_string());
    } else {
        parts.push("format=rgb24".to_string());
    }

    let scale = scale_fragment(opts)?;
    parts.push(scale);

    match opts.fps {
        FpsPreset::Source => {}
        FpsPreset::Fps15 => parts.push("fps=15".to_string()),
        FpsPreset::Fps12 => parts.push("fps=12".to_string()),
        FpsPreset::Fps10 => parts.push("fps=10".to_string()),
        FpsPreset::Fps8 => parts.push("fps=8".to_string()),
    }

    // 保持原帧率时不在此处做 mpdecimate：否则部分 GIF 解码帧极少会被删光，muxer 报 Invalid argument。
    let use_mpdecimate = opts.remove_duplicate_frames
        && !opts.fast_mode
        && !matches!(opts.fps, FpsPreset::Source);
    if use_mpdecimate {
        parts.push("mpdecimate".to_string());
    }

    let chain_prefix = parts.join(",");

    let max_colors = opts.max_colors_u32().clamp(32, 256);

    let stats_mode = match opts.quality {
        CompressQuality::Low => "single",
        CompressQuality::Medium => "diff",
        CompressQuality::High => "full",
    };

    let (dither, bayer_scale) = match opts.dither {
        DitherLevel::Off => ("none", 2_u32),
        DitherLevel::Low => ("bayer", 2_u32),
        DitherLevel::Medium => ("bayer", 3_u32),
        DitherLevel::High => ("floyd_steinberg", 3_u32),
    };

    let reserve_transparent: u8 = if opts.keep_transparency { 1 } else { 0 };

    Ok(GifRecompressFilterParams {
        chain_prefix,
        max_colors,
        stats_mode,
        dither,
        bayer_scale,
        reserve_transparent,
    })
}

fn scale_fragment(opts: &GifCompressBatchOptions) -> Result<String, String> {
    let s = match opts.resize {
        ResizePolicy::Keep => {
            "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos:force_original_aspect_ratio=disable".to_string()
        }
        ResizePolicy::P80 => "scale=trunc(iw*0.8/2)*2:trunc(ih*0.8/2)*2:flags=lanczos:force_original_aspect_ratio=disable".to_string(),
        ResizePolicy::P60 => "scale=trunc(iw*0.6/2)*2:trunc(ih*0.6/2)*2:flags=lanczos:force_original_aspect_ratio=disable".to_string(),
        ResizePolicy::P50 => "scale=trunc(iw*0.5/2)*2:trunc(ih*0.5/2)*2:flags=lanczos:force_original_aspect_ratio=disable".to_string(),
        ResizePolicy::CustomWidth => {
            let w = opts.custom_width.filter(|&v| v >= 2).ok_or_else(|| {
                "自定义输出宽度无效：请在选项中提供 ≥2 的 customWidth".to_string()
            })?;
            let w_even = (w / 2) * 2;
            format!("scale={w_even}:-2:flags=lanczos:force_original_aspect_ratio=decrease")
        }
    };
    Ok(s)
}

/// 完整 `-filter_complex` 字符串，输出流标签 `[gifout]`。
pub fn build_gif_recompress_filter_complex(opts: &GifCompressBatchOptions) -> Result<String, String> {
    let p = build_filter_params(opts)?;
    // [0:v] → 预处理链 → split → palettegen / paletteuse
    let mut fc = String::from("[0:v]");
    fc.push_str(&p.chain_prefix);
    fc.push_str(",split[s0][s1];[s0]palettegen=max_colors=");
    fc.push_str(&p.max_colors.to_string());
    fc.push_str(":reserve_transparent=");
    fc.push_str(&p.reserve_transparent.to_string());
    fc.push_str(":stats_mode=");
    fc.push_str(p.stats_mode);
    fc.push_str("[pal];[s1][pal]paletteuse=dither=");
    fc.push_str(p.dither);
    if p.dither == "bayer" {
        fc.push_str(":bayer_scale=");
        fc.push_str(&p.bayer_scale.to_string());
    }
    fc.push_str("[gifout]");
    Ok(fc)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::batch_processors::gif_compress_config::GifCompressBatchOptions;

    fn default_opts() -> GifCompressBatchOptions {
        GifCompressBatchOptions::default()
    }

    #[test]
    fn default_filter_contains_palettegen_and_paletteuse() {
        let fc = build_gif_recompress_filter_complex(&default_opts()).unwrap();
        assert!(fc.starts_with("[0:v]format=rgba,"));
        assert!(fc.contains("palettegen=max_colors=128"));
        assert!(fc.contains("stats_mode=diff"));
        assert!(fc.contains("paletteuse=dither=bayer"));
        assert!(fc.contains("fps=12"));
        assert!(fc.contains("mpdecimate"));
        assert!(fc.ends_with("[gifout]"));
    }

    #[test]
    fn fast_mode_skips_mpdecimate() {
        let mut o = default_opts();
        o.fast_mode = true;
        let fc = build_gif_recompress_filter_complex(&o).unwrap();
        assert!(!fc.contains("mpdecimate"));
    }

    #[test]
    fn preserve_fps_omits_fps_and_mpdecimate() {
        let mut o = default_opts();
        o.fps = FpsPreset::Source;
        let fc = build_gif_recompress_filter_complex(&o).unwrap();
        assert!(!fc.contains("fps=12"));
        assert!(!fc.contains("fps=15"));
        assert!(!fc.contains("mpdecimate"));
    }

    #[test]
    fn target_size_returns_error() {
        let mut o = default_opts();
        o.target_size_mb = Some(2.0);
        assert!(build_gif_recompress_filter_complex(&o).is_err());
    }
}
