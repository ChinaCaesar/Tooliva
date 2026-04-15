use image::{DynamicImage, ImageFormat, ImageReader};
use std::path::Path;

pub struct LoadedImage {
    pub image: DynamicImage,
    pub format: ImageFormat,
}

pub fn load_image(input_path: &Path) -> Result<LoadedImage, String> {
    let reader = ImageReader::open(input_path)
        .map_err(|err| format!("读取图片失败：{err}"))?
        .with_guessed_format()
        .map_err(|err| format!("识别图片格式失败：{err}"))?;
    let format = reader.format().unwrap_or(ImageFormat::Png);
    let image = reader.decode().map_err(|err| format!("解码图片失败：{err}"))?;
    Ok(LoadedImage { image, format })
}
