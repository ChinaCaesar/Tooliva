use crate::image_core::error::ImagePipelineError;
use crate::image_core::pipeline::ProcessRuntime;
use crate::image_core::processor::ImageProcessor;
use crate::image_core::types::{LoadedImage, ProcessContext, ProcessOutput, ProcessPlan, ProgressEvent};
use image::imageops::{overlay, resize, FilterType};
use image::{DynamicImage, ImageBuffer, ImageFormat, Rgba, RgbaImage};
use serde::Deserialize;
use serde_json::Value;
use std::fs;

const CHAR_WIDTH: u32 = 5;
const CHAR_HEIGHT: u32 = 7;
const CHAR_SPACING: u32 = 1;
const LINE_SPACING: u32 = 2;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WatermarkParams {
    mode: String,
    position: String,
    opacity: u8,
    margin: u32,
    rotation: f32,
    offset_x_ratio: Option<f32>,
    offset_y_ratio: Option<f32>,
    offset_x_px_on_original: Option<u32>,
    offset_y_px_on_original: Option<u32>,
    text: Option<String>,
    font_size: Option<u32>,
    text_color: Option<String>,
    image_path: Option<String>,
    image_scale_percent: Option<u32>,
}

#[derive(Debug, Clone)]
pub struct WatermarkPreviewGeometry {
    pub base_width: u32,
    pub base_height: u32,
    pub overlay_width: u32,
    pub overlay_height: u32,
}

#[derive(Debug, Clone, Copy)]
enum WatermarkMode {
    Text,
    Image,
}

#[derive(Debug, Clone, Copy)]
enum WatermarkPosition {
    TopLeft,
    TopRight,
    Center,
    BottomLeft,
    BottomRight,
}

pub struct WatermarkProcessor;

impl ImageProcessor for WatermarkProcessor {
    fn key(&self) -> &'static str {
        "watermark"
    }

    fn plan(&self, ctx: &ProcessContext, input: &LoadedImage) -> Result<ProcessPlan, ImagePipelineError> {
        let _ = parse_params(&ctx.params)?;
        Ok(ProcessPlan {
            input_width: input.image.width(),
            input_height: input.image.height(),
            output_width: input.image.width(),
            output_height: input.image.height(),
            estimated_memory_mb: 96,
            total_steps: 100,
        })
    }

    fn process(
        &self,
        ctx: &ProcessContext,
        input: &LoadedImage,
        _plan: &ProcessPlan,
        runtime: &ProcessRuntime,
    ) -> Result<ProcessOutput, ImagePipelineError> {
        let params = parse_params(&ctx.params)?;
        runtime.progress.emit(ProgressEvent::stage(
            &ctx.task_id,
            &ctx.processor_key,
            "processing",
            35,
            Some("生成水印图层".to_string()),
        ));

        let mut canvas = input.image.to_rgba8();
        let overlay_image = match normalize_mode(&params.mode)? {
            WatermarkMode::Text => build_text_overlay(input, &params)?,
            WatermarkMode::Image => build_image_overlay(input, &params)?,
        };

        runtime.progress.emit(ProgressEvent::stage(
            &ctx.task_id,
            &ctx.processor_key,
            "processing",
            70,
            Some("合成水印中".to_string()),
        ));

        let (pos_x, pos_y) = resolve_position(
            canvas.width(),
            canvas.height(),
            overlay_image.width(),
            overlay_image.height(),
            normalize_position(&params.position),
            params.margin,
            params.offset_x_px_on_original,
            params.offset_y_px_on_original,
            params.offset_x_ratio,
            params.offset_y_ratio,
        );
        overlay(&mut canvas, &overlay_image, pos_x.into(), pos_y.into());

        runtime.progress.emit(ProgressEvent::stage(
            &ctx.task_id,
            &ctx.processor_key,
            "saving",
            88,
            Some("写入文件中".to_string()),
        ));

        runtime.io.ensure_parent_dir(&ctx.output_path)?;
        save_output_image(&canvas, &ctx.output_path, input.format)?;

        Ok(ProcessOutput {
            output_path: ctx.output_path.clone(),
            output_width: canvas.width(),
            output_height: canvas.height(),
            backend_used: "cpu".to_string(),
            metadata: serde_json::json!({
                "mode": params.mode,
                "position": params.position,
                "opacity": params.opacity
            }),
        })
    }
}

/**
 * 解析并校验水印参数，供导出与预览共用同一逻辑。
 */
fn parse_params(params_value: &Value) -> Result<WatermarkParams, ImagePipelineError> {
    let params: WatermarkParams = serde_json::from_value(params_value.clone())
        .map_err(|err| ImagePipelineError::InvalidInput(format!("水印参数不合法：{err}")))?;
    if !(1..=100).contains(&params.opacity) {
        return Err(ImagePipelineError::InvalidInput("透明度仅支持 1..100".to_string()));
    }
    if matches!(normalize_mode(&params.mode)?, WatermarkMode::Text)
        && params.text.as_deref().map(|value| value.trim().is_empty()).unwrap_or(true)
    {
        return Err(ImagePipelineError::InvalidInput("文字水印内容不能为空".to_string()));
    }
    if params.font_size.unwrap_or(24) < 8 {
        return Err(ImagePipelineError::InvalidInput("文字字号不能小于 8".to_string()));
    }
    if let Some(scale_percent) = params.image_scale_percent {
        if !(5..=60).contains(&scale_percent) {
            return Err(ImagePipelineError::InvalidInput("图片缩放比例仅支持 5..60".to_string()));
        }
    }
    Ok(params)
}

/**
 * 供命令层复用：基于当前参数生成最终会参与合成的水印图层尺寸。
 */
pub fn compute_watermark_preview_geometry(
    input: &LoadedImage,
    params_value: &Value,
) -> Result<WatermarkPreviewGeometry, ImagePipelineError> {
    let params = parse_params(params_value)?;
    let overlay_image = match normalize_mode(&params.mode)? {
        WatermarkMode::Text => build_text_overlay(input, &params)?,
        WatermarkMode::Image => build_image_overlay(input, &params)?,
    };
    Ok(WatermarkPreviewGeometry {
        base_width: input.image.width(),
        base_height: input.image.height(),
        overlay_width: overlay_image.width(),
        overlay_height: overlay_image.height(),
    })
}

fn normalize_mode(value: &str) -> Result<WatermarkMode, ImagePipelineError> {
    match value {
        "text" => Ok(WatermarkMode::Text),
        "image" => Ok(WatermarkMode::Image),
        _ => Err(ImagePipelineError::InvalidInput("水印模式仅支持 text 或 image".to_string())),
    }
}

fn normalize_position(value: &str) -> WatermarkPosition {
    match value {
        "topLeft" => WatermarkPosition::TopLeft,
        "topRight" => WatermarkPosition::TopRight,
        "center" => WatermarkPosition::Center,
        "bottomLeft" => WatermarkPosition::BottomLeft,
        _ => WatermarkPosition::BottomRight,
    }
}

fn build_text_overlay(input: &LoadedImage, params: &WatermarkParams) -> Result<RgbaImage, ImagePipelineError> {
    let content = params
        .text
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ImagePipelineError::InvalidInput("文字水印内容不能为空".to_string()))?;
    let font_size = params.font_size.unwrap_or(24).max(8);
    let scale = (font_size / CHAR_HEIGHT.max(1)).max(1);
    let lines: Vec<&str> = content.lines().collect();
    let max_line_chars = lines.iter().map(|line| line.chars().count()).max().unwrap_or(0) as u32;
    let text_width = max_line_chars.saturating_mul((CHAR_WIDTH + CHAR_SPACING) * scale).max(scale);
    let text_height = (lines.len() as u32)
        .saturating_mul((CHAR_HEIGHT + LINE_SPACING) * scale)
        .max(scale);
    let mut overlay_image = ImageBuffer::from_pixel(
        text_width.max(1),
        text_height.max(1),
        Rgba([255, 255, 255, 0]),
    );
    let color = parse_hex_rgba(params.text_color.as_deref().unwrap_or("#FFFFFF"), params.opacity)?;
    for (line_index, line) in lines.iter().enumerate() {
        let line_y = (line_index as u32) * (CHAR_HEIGHT + LINE_SPACING) * scale;
        draw_text_line(&mut overlay_image, line, 0, line_y, scale, color);
    }
    if params.rotation.abs() > 0.1 {
        return Ok(rotate_rgba(&overlay_image, params.rotation));
    }
    let max_overlay_width = input.image.width().saturating_mul(80) / 100;
    if overlay_image.width() > max_overlay_width && max_overlay_width > 0 {
        let resized_height = overlay_image.height().saturating_mul(max_overlay_width) / overlay_image.width().max(1);
        return Ok(resize(
            &overlay_image,
            max_overlay_width,
            resized_height.max(1),
            FilterType::Lanczos3,
        ));
    }
    Ok(overlay_image)
}

fn build_image_overlay(input: &LoadedImage, params: &WatermarkParams) -> Result<RgbaImage, ImagePipelineError> {
    let watermark_path = params
        .image_path
        .as_deref()
        .ok_or_else(|| ImagePipelineError::InvalidInput("图片水印模式必须提供水印图片".to_string()))?;
    let bytes = fs::read(watermark_path)
        .map_err(|err| ImagePipelineError::IoFailed(format!("读取水印图片失败：{err}")))?;
    let source = image::load_from_memory(&bytes)
        .map_err(|err| ImagePipelineError::DecodeFailed(format!("解码水印图片失败：{err}")))?;
    let source_rgba = source.to_rgba8();
    let scale_percent = params.image_scale_percent.unwrap_or(15).clamp(5, 60);
    let target_width = (input.image.width().saturating_mul(scale_percent) / 100).max(1);
    let target_height = source_rgba.height().saturating_mul(target_width) / source_rgba.width().max(1);
    let mut resized = resize(&source_rgba, target_width, target_height.max(1), FilterType::Lanczos3);
    apply_opacity(&mut resized, params.opacity);
    if params.rotation.abs() > 0.1 {
        return Ok(rotate_rgba(&resized, params.rotation));
    }
    Ok(resized)
}

fn resolve_position(
    base_width: u32,
    base_height: u32,
    overlay_width: u32,
    overlay_height: u32,
    position: WatermarkPosition,
    margin: u32,
    offset_x_px_on_original: Option<u32>,
    offset_y_px_on_original: Option<u32>,
    offset_x_ratio: Option<f32>,
    offset_y_ratio: Option<f32>,
) -> (u32, u32) {
    let max_x = base_width.saturating_sub(overlay_width);
    let max_y = base_height.saturating_sub(overlay_height);
    if let (Some(x_px), Some(y_px)) = (offset_x_px_on_original, offset_y_px_on_original) {
        return (x_px.min(max_x), y_px.min(max_y));
    }
    if let (Some(x_ratio), Some(y_ratio)) = (offset_x_ratio, offset_y_ratio) {
        let x = ((max_x as f32) * x_ratio.clamp(0.0, 1.0)).round() as u32;
        let y = ((max_y as f32) * y_ratio.clamp(0.0, 1.0)).round() as u32;
        return (x.min(max_x), y.min(max_y));
    }
    match position {
        WatermarkPosition::TopLeft => (margin.min(max_x), margin.min(max_y)),
        WatermarkPosition::TopRight => (max_x.saturating_sub(margin.min(max_x)), margin.min(max_y)),
        WatermarkPosition::Center => (max_x / 2, max_y / 2),
        WatermarkPosition::BottomLeft => (margin.min(max_x), max_y.saturating_sub(margin.min(max_y))),
        WatermarkPosition::BottomRight => (
            max_x.saturating_sub(margin.min(max_x)),
            max_y.saturating_sub(margin.min(max_y)),
        ),
    }
}

fn save_output_image(image: &RgbaImage, output_path: &std::path::Path, input_format: ImageFormat) -> Result<(), ImagePipelineError> {
    let dynamic = DynamicImage::ImageRgba8(image.clone());
    let format = match output_path.extension().and_then(|ext| ext.to_str()).map(|ext| ext.to_ascii_lowercase()) {
        Some(ext) if ext == "jpg" || ext == "jpeg" => ImageFormat::Jpeg,
        Some(ext) if ext == "png" => ImageFormat::Png,
        Some(ext) if ext == "webp" => ImageFormat::WebP,
        Some(ext) if ext == "bmp" => ImageFormat::Bmp,
        _ => input_format,
    };
    dynamic
        .save_with_format(output_path, format)
        .map_err(|err| ImagePipelineError::EncodeFailed(format!("写出图片失败：{err}")))
}

fn parse_hex_rgba(value: &str, opacity_percent: u8) -> Result<Rgba<u8>, ImagePipelineError> {
    let normalized = value.trim().trim_start_matches('#');
    let bytes = match normalized.len() {
        6 => hex_to_rgb(normalized)?,
        3 => {
            let expanded = normalized
                .chars()
                .flat_map(|ch| [ch, ch])
                .collect::<String>();
            hex_to_rgb(&expanded)?
        }
        _ => return Err(ImagePipelineError::InvalidInput("文字颜色仅支持 #RGB 或 #RRGGBB".to_string())),
    };
    let alpha = ((opacity_percent as f32 / 100.0) * 255.0).round().clamp(0.0, 255.0) as u8;
    Ok(Rgba([bytes[0], bytes[1], bytes[2], alpha]))
}

fn hex_to_rgb(value: &str) -> Result<[u8; 3], ImagePipelineError> {
    let red = u8::from_str_radix(&value[0..2], 16)
        .map_err(|_| ImagePipelineError::InvalidInput("文字颜色格式不正确".to_string()))?;
    let green = u8::from_str_radix(&value[2..4], 16)
        .map_err(|_| ImagePipelineError::InvalidInput("文字颜色格式不正确".to_string()))?;
    let blue = u8::from_str_radix(&value[4..6], 16)
        .map_err(|_| ImagePipelineError::InvalidInput("文字颜色格式不正确".to_string()))?;
    Ok([red, green, blue])
}

fn apply_opacity(image: &mut RgbaImage, opacity_percent: u8) {
    let factor = opacity_percent as f32 / 100.0;
    for pixel in image.pixels_mut() {
        let alpha = (pixel.0[3] as f32 * factor).round().clamp(0.0, 255.0) as u8;
        pixel.0[3] = alpha;
    }
}

fn rotate_rgba(source: &RgbaImage, degrees: f32) -> RgbaImage {
    let radians = degrees.to_radians();
    let sin = radians.sin();
    let cos = radians.cos();
    let width = source.width() as f32;
    let height = source.height() as f32;
    let new_width = (width * cos.abs() + height * sin.abs()).ceil().max(1.0) as u32;
    let new_height = (width * sin.abs() + height * cos.abs()).ceil().max(1.0) as u32;
    let source_cx = width / 2.0;
    let source_cy = height / 2.0;
    let target_cx = new_width as f32 / 2.0;
    let target_cy = new_height as f32 / 2.0;
    let mut target = ImageBuffer::from_pixel(new_width, new_height, Rgba([255, 255, 255, 0]));

    for y in 0..new_height {
        for x in 0..new_width {
            let dx = x as f32 - target_cx;
            let dy = y as f32 - target_cy;
            let src_x = dx * cos + dy * sin + source_cx;
            let src_y = -dx * sin + dy * cos + source_cy;
            if src_x >= 0.0 && src_x < width && src_y >= 0.0 && src_y < height {
                let pixel = source.get_pixel(src_x.floor() as u32, src_y.floor() as u32);
                target.put_pixel(x, y, *pixel);
            }
        }
    }
    target
}

fn draw_text_line(image: &mut RgbaImage, text: &str, start_x: u32, start_y: u32, scale: u32, color: Rgba<u8>) {
    let mut cursor_x = start_x;
    for ch in text.chars() {
        draw_glyph(image, ch, cursor_x, start_y, scale, color);
        cursor_x = cursor_x.saturating_add((CHAR_WIDTH + CHAR_SPACING) * scale);
    }
}

fn draw_glyph(image: &mut RgbaImage, ch: char, start_x: u32, start_y: u32, scale: u32, color: Rgba<u8>) {
    let glyph = glyph_pattern(ch);
    for (row_index, row) in glyph.iter().enumerate() {
        for (col_index, bit) in row.chars().enumerate() {
            if bit != '1' {
                continue;
            }
            let pixel_x = start_x + col_index as u32 * scale;
            let pixel_y = start_y + row_index as u32 * scale;
            for dy in 0..scale {
                for dx in 0..scale {
                    let target_x = pixel_x + dx;
                    let target_y = pixel_y + dy;
                    if target_x < image.width() && target_y < image.height() {
                        image.put_pixel(target_x, target_y, color);
                    }
                }
            }
        }
    }
}

fn glyph_pattern(ch: char) -> [&'static str; 7] {
    match ch.to_ascii_uppercase() {
        'A' => ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
        'B' => ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
        'C' => ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
        'D' => ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
        'E' => ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
        'F' => ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
        'G' => ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
        'H' => ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
        'I' => ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
        'J' => ["00001", "00001", "00001", "00001", "10001", "10001", "01110"],
        'K' => ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
        'L' => ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
        'M' => ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
        'N' => ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
        'O' => ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
        'P' => ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
        'Q' => ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
        'R' => ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
        'S' => ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
        'T' => ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
        'U' => ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
        'V' => ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
        'W' => ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
        'X' => ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
        'Y' => ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
        'Z' => ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
        '0' => ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
        '1' => ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
        '2' => ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
        '3' => ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
        '4' => ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
        '5' => ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
        '6' => ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
        '7' => ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
        '8' => ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
        '9' => ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
        ' ' => ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
        '-' => ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
        '_' => ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
        '.' => ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
        ',' => ["00000", "00000", "00000", "00000", "00110", "00100", "01000"],
        ':' => ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
        '/' => ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
        '\\' => ["10000", "01000", "00100", "00010", "00001", "00000", "00000"],
        _ => ["11111", "10001", "00010", "00100", "00100", "00000", "00100"],
    }
}
