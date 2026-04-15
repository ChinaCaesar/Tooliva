use image::{DynamicImage, ImageFormat, RgbaImage};
use std::path::Path;

pub fn save_rgba_image(image: RgbaImage, output_path: &Path, format: ImageFormat) -> Result<(), String> {
    let dyn_image = DynamicImage::ImageRgba8(image);
    dyn_image
        .save_with_format(output_path, format)
        .map_err(|err| format!("写入放大图片失败：{err}"))
}
