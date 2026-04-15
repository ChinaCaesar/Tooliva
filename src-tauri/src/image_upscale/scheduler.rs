use crate::image_upscale::types::{UpscalePlan, UpscaleRequest, MAX_OUTPUT_SIDE};

pub fn build_plan(request: &UpscaleRequest, input_width: u32, input_height: u32) -> Result<UpscalePlan, String> {
    let output_width = input_width.saturating_mul(request.scale_factor as u32);
    let output_height = input_height.saturating_mul(request.scale_factor as u32);
    if output_width > MAX_OUTPUT_SIDE || output_height > MAX_OUTPUT_SIDE {
        return Err(format!(
            "放大后尺寸 {}x{} 超过上限 {}x{}，请降低倍数后重试",
            output_width, output_height, MAX_OUTPUT_SIDE, MAX_OUTPUT_SIDE
        ));
    }

    let output_pixels = (output_width as u64).saturating_mul(output_height as u64);
    if output_pixels > request.max_output_pixels {
        return Err(format!(
            "放大后像素 {} 超过上限 {}，请降低倍数后重试",
            output_pixels, request.max_output_pixels
        ));
    }

    let estimated_memory_mb = estimate_memory_mb(input_width, input_height, output_width, output_height);
    if estimated_memory_mb > request.max_memory_mb {
        return Err(format!(
            "预计内存占用约 {}MB，超过上限 {}MB，请降低倍数或缩小图片",
            estimated_memory_mb, request.max_memory_mb
        ));
    }

    Ok(UpscalePlan {
        input_width,
        input_height,
        output_width,
        output_height,
        estimated_memory_mb,
    })
}

fn estimate_memory_mb(input_width: u32, input_height: u32, output_width: u32, output_height: u32) -> u64 {
    let input_bytes = (input_width as u64)
        .saturating_mul(input_height as u64)
        .saturating_mul(4);
    let output_bytes = (output_width as u64)
        .saturating_mul(output_height as u64)
        .saturating_mul(4);
    let working_set = input_bytes.saturating_add(output_bytes).saturating_mul(2);
    (working_set / (1024 * 1024)).max(1)
}
