use crate::image_core::error::ImagePipelineError;
use crate::image_core::types::LoadedImage;
use image::{DynamicImage, ImageFormat, ImageReader};
use std::fs;
use std::path::{Path, PathBuf};

pub trait ImageIO: Send + Sync {
    fn load(&self, input_path: &Path) -> Result<LoadedImage, ImagePipelineError>;
    fn save(
        &self,
        image: &DynamicImage,
        output_path: &Path,
        output_format: Option<ImageFormat>,
    ) -> Result<(), ImagePipelineError>;
    fn ensure_parent_dir(&self, path: &Path) -> Result<(), ImagePipelineError>;
    fn ensure_unique_output_path(&self, path: &Path) -> PathBuf;
}

pub struct FsImageIO;

impl ImageIO for FsImageIO {
    fn load(&self, input_path: &Path) -> Result<LoadedImage, ImagePipelineError> {
        let reader = ImageReader::open(input_path)
            .map_err(|err| ImagePipelineError::IoFailed(err.to_string()))?
            .with_guessed_format()
            .map_err(|err| ImagePipelineError::DecodeFailed(err.to_string()))?;
        let format = reader.format().unwrap_or(ImageFormat::Png);
        let image = reader
            .decode()
            .map_err(|err| ImagePipelineError::DecodeFailed(err.to_string()))?;
        Ok(LoadedImage { image, format })
    }

    fn save(
        &self,
        image: &DynamicImage,
        output_path: &Path,
        output_format: Option<ImageFormat>,
    ) -> Result<(), ImagePipelineError> {
        self.ensure_parent_dir(output_path)?;
        if let Some(format) = output_format {
            image
                .save_with_format(output_path, format)
                .map_err(|err| ImagePipelineError::EncodeFailed(err.to_string()))?;
            return Ok(());
        }
        image
            .save(output_path)
            .map_err(|err| ImagePipelineError::EncodeFailed(err.to_string()))?;
        Ok(())
    }

    fn ensure_parent_dir(&self, path: &Path) -> Result<(), ImagePipelineError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        Ok(())
    }

    fn ensure_unique_output_path(&self, path: &Path) -> PathBuf {
        if !path.exists() {
            return path.to_path_buf();
        }
        let parent = path.parent().unwrap_or_else(|| Path::new("."));
        let stem = path.file_stem().and_then(|x| x.to_str()).unwrap_or("output");
        let ext = path.extension().and_then(|x| x.to_str()).unwrap_or("png");
        for index in 1.. {
            let candidate = parent.join(format!("{stem}_{index}.{ext}"));
            if !candidate.exists() {
                return candidate;
            }
        }
        path.to_path_buf()
    }
}
