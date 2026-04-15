use crate::image_upscale::processor::tile_upscale_cpu;
use crate::image_upscale::types::UpscaleRequest;
use image::{DynamicImage, RgbaImage};

pub fn upscale(
    input: &DynamicImage,
    request: &UpscaleRequest,
    output_width: u32,
    output_height: u32,
    on_tile_done: impl FnMut(u64, u64),
) -> Result<RgbaImage, String> {
    tile_upscale_cpu(
        input,
        output_width,
        output_height,
        request.tile_size,
        request.tile_overlap,
        request.quality_mode.filter(),
        on_tile_done,
    )
}
