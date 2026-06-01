use image::{DynamicImage, GenericImageView, ImageBuffer, Pixel, Rgba, RgbaImage};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InpaintRegion {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone, Copy)]
pub enum BasicInpaintAlgorithm {
    Telea,
    Ns,
}

#[derive(Debug, Clone)]
pub struct BasicInpaintRequest {
    pub input_path: PathBuf,
    pub output_path: PathBuf,
    pub regions: Vec<InpaintRegion>,
    pub algorithm: BasicInpaintAlgorithm,
    pub radius: u32,
}

pub fn inpaint_image_basic(request: &BasicInpaintRequest) -> Result<(), String> {
    let source = image::open(&request.input_path).map_err(|err| {
        format!(
            "Failed to open image for basic watermark removal: {} ({err})",
            request.input_path.display()
        )
    })?;
    let image = source.to_rgba8();
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 {
        return Err("Image dimensions are invalid".to_string());
    }
    let mask = build_mask(width, height, &request.regions, request.radius)?;
    let repaired = repair_masked_area(&image, &mask, request.algorithm, request.radius);
    save_dynamic_image(
        &DynamicImage::ImageRgba8(repaired),
        &request.output_path,
        request
            .output_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("png"),
    )
}

pub fn build_mask(
    width: u32,
    height: u32,
    regions: &[InpaintRegion],
    radius: u32,
) -> Result<Vec<bool>, String> {
    let mut mask = vec![false; (width as usize) * (height as usize)];
    for region in regions {
        if !region.x.is_finite()
            || !region.y.is_finite()
            || !region.width.is_finite()
            || !region.height.is_finite()
        {
            return Err("Watermark region contains invalid numeric values".to_string());
        }
        if region.width <= 0.0 || region.height <= 0.0 {
            continue;
        }
        let x1 = ((region.x.clamp(0.0, 100.0) / 100.0) * width as f32).floor() as i32;
        let y1 = ((region.y.clamp(0.0, 100.0) / 100.0) * height as f32).floor() as i32;
        let x2 =
            (((region.x + region.width).clamp(0.0, 100.0) / 100.0) * width as f32).ceil() as i32;
        let y2 =
            (((region.y + region.height).clamp(0.0, 100.0) / 100.0) * height as f32).ceil() as i32;
        for y in y1.max(0)..y2.min(height as i32) {
            for x in x1.max(0)..x2.min(width as i32) {
                mask[(y as usize) * (width as usize) + x as usize] = true;
            }
        }
    }

    let expand = radius.max(1) as i32;
    if expand <= 1 {
        return Ok(mask);
    }

    let mut expanded = mask.clone();
    for y in 0..height as i32 {
        for x in 0..width as i32 {
            if !mask[(y as usize) * (width as usize) + x as usize] {
                continue;
            }
            for dy in -expand..=expand {
                for dx in -expand..=expand {
                    if dx * dx + dy * dy > expand * expand {
                        continue;
                    }
                    let nx = x + dx;
                    let ny = y + dy;
                    if nx >= 0 && ny >= 0 && nx < width as i32 && ny < height as i32 {
                        expanded[(ny as usize) * (width as usize) + nx as usize] = true;
                    }
                }
            }
        }
    }
    Ok(expanded)
}

fn repair_masked_area(
    image: &RgbaImage,
    mask: &[bool],
    algorithm: BasicInpaintAlgorithm,
    radius: u32,
) -> RgbaImage {
    let (width, height) = image.dimensions();
    let mut output = image.clone();
    let base = image.clone();
    let search_radius = (radius.max(1) * 4 + 4) as i32;
    for y in 0..height as i32 {
        for x in 0..width as i32 {
            let idx = (y as usize) * (width as usize) + x as usize;
            if !mask[idx] {
                continue;
            }
            let pixel = sample_surrounding_pixel(&base, mask, x, y, search_radius, algorithm);
            output.put_pixel(x as u32, y as u32, pixel);
        }
    }
    output
}

fn sample_surrounding_pixel(
    image: &RgbaImage,
    mask: &[bool],
    x: i32,
    y: i32,
    mut search_radius: i32,
    algorithm: BasicInpaintAlgorithm,
) -> Rgba<u8> {
    let (width, height) = image.dimensions();
    while search_radius <= 96 {
        let mut r = 0.0f32;
        let mut g = 0.0f32;
        let mut b = 0.0f32;
        let mut a = 0.0f32;
        let mut weight_sum = 0.0f32;
        for dy in -search_radius..=search_radius {
            for dx in -search_radius..=search_radius {
                if dx == 0 && dy == 0 {
                    continue;
                }
                let nx = x + dx;
                let ny = y + dy;
                if nx < 0 || ny < 0 || nx >= width as i32 || ny >= height as i32 {
                    continue;
                }
                if mask[(ny as usize) * (width as usize) + nx as usize] {
                    continue;
                }
                let distance_sq = (dx * dx + dy * dy) as f32;
                if distance_sq <= 0.0 {
                    continue;
                }
                let distance = distance_sq.sqrt();
                let weight = match algorithm {
                    BasicInpaintAlgorithm::Telea => 1.0 / (distance_sq + 1.0),
                    BasicInpaintAlgorithm::Ns => {
                        let axis_bonus = if dx == 0 || dy == 0 { 1.35 } else { 1.0 };
                        axis_bonus / (distance + 1.0)
                    }
                };
                let px = image.get_pixel(nx as u32, ny as u32).channels();
                r += px[0] as f32 * weight;
                g += px[1] as f32 * weight;
                b += px[2] as f32 * weight;
                a += px[3] as f32 * weight;
                weight_sum += weight;
            }
        }
        if weight_sum > 0.0 {
            return Rgba([
                (r / weight_sum).round().clamp(0.0, 255.0) as u8,
                (g / weight_sum).round().clamp(0.0, 255.0) as u8,
                (b / weight_sum).round().clamp(0.0, 255.0) as u8,
                (a / weight_sum).round().clamp(0.0, 255.0) as u8,
            ]);
        }
        search_radius += 8;
    }
    average_unmasked_image_color(image, mask)
}

fn average_unmasked_image_color(image: &RgbaImage, mask: &[bool]) -> Rgba<u8> {
    let (width, _height) = image.dimensions();
    let mut totals = [0u64; 4];
    let mut count = 0u64;
    for (idx, pixel) in image.pixels().enumerate() {
        if mask[idx] {
            continue;
        }
        let channels = pixel.channels();
        totals[0] += channels[0] as u64;
        totals[1] += channels[1] as u64;
        totals[2] += channels[2] as u64;
        totals[3] += channels[3] as u64;
        count += 1;
    }
    if count == 0 {
        return Rgba([240, 240, 240, 255]);
    }
    let _ = width;
    Rgba([
        (totals[0] / count) as u8,
        (totals[1] / count) as u8,
        (totals[2] / count) as u8,
        (totals[3] / count) as u8,
    ])
}

fn save_dynamic_image(
    image: &DynamicImage,
    output_path: &PathBuf,
    ext: &str,
) -> Result<(), String> {
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let lower_ext = ext.to_ascii_lowercase();
    match lower_ext.as_str() {
        "jpg" | "jpeg" => image
            .save_with_format(output_path, image::ImageFormat::Jpeg)
            .map_err(|err| format!("Failed to save JPG output: {err}")),
        "webp" => image
            .save_with_format(output_path, image::ImageFormat::WebP)
            .map_err(|err| format!("Failed to save WEBP output: {err}")),
        "bmp" => image
            .save_with_format(output_path, image::ImageFormat::Bmp)
            .map_err(|err| format!("Failed to save BMP output: {err}")),
        _ => image
            .save_with_format(output_path, image::ImageFormat::Png)
            .map_err(|err| format!("Failed to save PNG output: {err}")),
    }
}
