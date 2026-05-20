use crate::ffmpeg_gif::types::{
    VideoGifQualityPreset, VideoGifSizePreset, VideoToGifCropRect, VideoToGifOptions,
};

fn escape_filter_label(label: &str) -> String {
    label
        .replace('\\', "\\\\")
        .replace(':', "\\:")
        .replace('[', "\\[")
        .replace(']', "\\]")
}

fn scale_fragment(opts: &VideoToGifOptions) -> Result<String, String> {
    match &opts.size_preset {
        VideoGifSizePreset::Original => Ok(
            "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos:force_original_aspect_ratio=disable"
                .to_string(),
        ),
        VideoGifSizePreset::P720 => Ok(
            "scale=w=-2:h='min(ih\\,720)':flags=lanczos:force_original_aspect_ratio=decrease"
                .to_string(),
        ),
        VideoGifSizePreset::P480 => Ok(
            "scale=w=-2:h='min(ih\\,480)':flags=lanczos:force_original_aspect_ratio=decrease"
                .to_string(),
        ),
        VideoGifSizePreset::P360 => Ok(
            "scale=w=-2:h='min(ih\\,360)':flags=lanczos:force_original_aspect_ratio=decrease"
                .to_string(),
        ),
        VideoGifSizePreset::Custom => {
            let w = opts.custom_width;
            let h = opts.custom_height;
            match (w, h) {
                (Some(w), Some(h)) if w >= 2 && h >= 2 => Ok(format!(
                    "scale={}:{}:flags=lanczos:force_original_aspect_ratio=disable",
                    (w / 2) * 2,
                    (h / 2) * 2
                )),
                (Some(w), None) if w >= 2 => Ok(format!(
                    "scale={}:-2:flags=lanczos:force_original_aspect_ratio=decrease",
                    (w / 2) * 2
                )),
                (None, Some(h)) if h >= 2 => Ok(format!(
                    "scale=-2:{}:flags=lanczos:force_original_aspect_ratio=decrease",
                    (h / 2) * 2
                )),
                _ => Err("自定义尺寸需提供有效的宽度或高度（至少≥2）".to_string()),
            }
        }
    }
}

fn palette_tuple(opts: &VideoToGifOptions) -> (String, u32, String, u32) {
    let defaults = match opts.quality {
        VideoGifQualityPreset::Low => ("single".to_string(), 192_u32, "none".to_string(), 2_u32),
        VideoGifQualityPreset::Medium => ("full".to_string(), 256_u32, "bayer".to_string(), 3_u32),
        VideoGifQualityPreset::High => (
            "diff".to_string(),
            256_u32,
            "floyd_steinberg".to_string(),
            3_u32,
        ),
    };
    let stats_mode = opts
        .palette_stats_mode
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| defaults.0.clone());
    let max_colors = opts.palette_max_colors.unwrap_or(defaults.1).clamp(32, 256);
    let dither = opts
        .dither
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| defaults.2.clone());
    let bayer_scale = opts.bayer_scale.unwrap_or(defaults.3).clamp(1, 5);
    (stats_mode, max_colors, dither, bayer_scale)
}

fn crop_prefix(crop: &VideoToGifCropRect) -> String {
    format!("crop={}:{}:{}:{}", crop.width, crop.height, crop.x, crop.y)
}

/// Builds `[0:v]` → GIF-ready filtered stream labels `[palette]` chain ending at paletteuse output label `gifv`.
pub fn build_filter_complex(opts: &VideoToGifOptions) -> Result<String, String> {
    let fps = opts.fps.max(1).min(60);
    let speed = opts.playback_speed.unwrap_or(1.0);
    if !(0.25..=4.0).contains(&speed) || !speed.is_finite() {
        return Err("播放速度必须在 0.25～4 之间".to_string());
    }

    let mut chain: Vec<String> = Vec::new();
    if let Some(ref c) = opts.crop {
        if c.width < 2 || c.height < 2 {
            return Err("裁剪区域的宽高无效".to_string());
        }
        chain.push(crop_prefix(c));
    }
    chain.push(scale_fragment(opts)?);
    chain.push(format!("setpts=PTS/{speed}"));
    chain.push(format!("fps={fps}"));

    let prep = chain.join(",");
    let (stats_mode, max_colors, dither, bayer_scale) = palette_tuple(opts);

    let palette_use_extra = if dither.eq_ignore_ascii_case("bayer") {
        format!("bayer_scale={bayer_scale}")
    } else {
        String::new()
    };

    let palette_use_opts = if palette_use_extra.is_empty() {
        format!("dither={}", escape_filter_label(&dither))
    } else {
        format!(
            "dither={}:{}",
            escape_filter_label(&dither),
            palette_use_extra
        )
    };

    Ok(format!(
        "[0:v]{prep},split[s0][s1];[s0]palettegen=stats_mode={stats_mode}:max_colors={max_colors}[p];[s1][p]paletteuse={palette_use_opts}[gifv]",
        prep = prep,
        stats_mode = escape_filter_label(&stats_mode),
        max_colors = max_colors,
        palette_use_opts = palette_use_opts,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ffmpeg_gif::types::{VideoGifQualityPreset, VideoGifSizePreset, VideoToGifOptions};

    fn base_opts() -> VideoToGifOptions {
        VideoToGifOptions {
            start_time_sec: None,
            end_time_sec: None,
            size_preset: VideoGifSizePreset::P720,
            custom_width: None,
            custom_height: None,
            fps: 15,
            quality: VideoGifQualityPreset::Medium,
            loop_playback: true,
            max_frames: None,
            playback_speed: Some(1.0),
            palette_stats_mode: None,
            palette_max_colors: None,
            dither: None,
            bayer_scale: None,
            crop: None,
            output_size_limit_bytes: None,
        }
    }

    #[test]
    fn filter_contains_palette_pipeline() {
        let g = build_filter_complex(&base_opts()).unwrap();
        assert!(g.contains("palettegen"));
        assert!(g.contains("paletteuse"));
        assert!(g.contains("fps=15"));
        assert!(g.contains("split[s0][s1]"));
    }

    #[test]
    fn filter_escapes_space_path_labels_not_needed_but_stats_mode_literal() {
        let mut o = base_opts();
        o.palette_stats_mode = Some("full".to_string());
        let g = build_filter_complex(&o).unwrap();
        assert!(g.contains("stats_mode=full"));
    }

    #[test]
    fn custom_size_even_rounding() {
        let mut o = base_opts();
        o.size_preset = VideoGifSizePreset::Custom;
        o.custom_width = Some(799);
        o.custom_height = Some(601);
        let g = build_filter_complex(&o).unwrap();
        assert!(g.contains("scale=798:600"));
    }

    #[test]
    fn crop_prepended_before_scale() {
        let mut o = base_opts();
        o.crop = Some(VideoToGifCropRect {
            x: 10,
            y: 20,
            width: 320,
            height: 240,
        });
        let g = build_filter_complex(&o).unwrap();
        assert!(g.starts_with("[0:v]crop=320:240:10:20"));
    }
}
