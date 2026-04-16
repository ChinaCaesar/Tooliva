use crate::image_core::error::ImagePipelineError;
use crate::image_core::pipeline::ProcessRuntime;
use crate::image_core::processor::ImageProcessor;
use crate::image_core::types::{LoadedImage, ProcessContext, ProcessOutput, ProcessPlan, ProgressEvent};
use ab_glyph::{FontArc, PxScale};
use image::imageops::{overlay, resize, FilterType};
use image::{DynamicImage, ImageBuffer, ImageFormat, Rgba, RgbaImage};
use imageproc::drawing::{draw_text_mut, text_size};
use serde::Deserialize;
use serde_json::Value;
use std::fs;

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

/**
 * 供命令层复用：按与导出同源的逻辑生成预览水印图层位图。
 */
pub fn render_watermark_preview_overlay(
    input: &LoadedImage,
    params_value: &Value,
) -> Result<RgbaImage, ImagePipelineError> {
    let params = parse_params(params_value)?;
    match normalize_mode(&params.mode)? {
        WatermarkMode::Text => build_text_overlay(input, &params),
        WatermarkMode::Image => build_image_overlay(input, &params),
    }
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
    let font = load_system_font()?;
    let scale = PxScale::from(font_size as f32);
    let lines: Vec<&str> = content.lines().collect();
    let line_height = ((font_size as f32) * 1.35).ceil() as u32;
    let text_width = lines
        .iter()
        .map(|line| text_size(scale, &font, line).0 as u32)
        .max()
        .unwrap_or(font_size)
        .max(1);
    let text_height = (lines.len() as u32).saturating_mul(line_height).max(font_size);
    let mut overlay_image = ImageBuffer::from_pixel(
        text_width.max(1),
        text_height.max(1),
        Rgba([255, 255, 255, 0]),
    );
    let color = parse_hex_rgba(params.text_color.as_deref().unwrap_or("#FFFFFF"), params.opacity)?;
    for (line_index, line) in lines.iter().enumerate() {
        let baseline_y = (line_index as u32).saturating_mul(line_height);
        draw_text_mut(
            &mut overlay_image,
            color,
            0,
            baseline_y as i32,
            scale,
            &font,
            line,
        );
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

/**
 * 尝试加载系统常见中文字体，保证文字水印支持中文字符。
 */
fn load_system_font() -> Result<FontArc, ImagePipelineError> {
    let candidate_paths = [
        "C:\\Windows\\Fonts\\msyh.ttc",
        "C:\\Windows\\Fonts\\msyhbd.ttc",
        "C:\\Windows\\Fonts\\simhei.ttf",
        "C:\\Windows\\Fonts\\simsun.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ];
    for path in candidate_paths {
        if let Ok(bytes) = fs::read(path) {
            if let Ok(font) = FontArc::try_from_vec(bytes) {
                return Ok(font);
            }
        }
    }
    Err(ImagePipelineError::InvalidInput(
        "未找到可用系统字体，请安装微软雅黑/黑体/Noto Sans CJK 后重试".to_string(),
    ))
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

