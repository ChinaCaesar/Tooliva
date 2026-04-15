use image::{imageops, DynamicImage, GenericImageView, ImageBuffer, Rgba, RgbaImage};

pub fn tile_upscale_cpu(
    source: &DynamicImage,
    output_width: u32,
    output_height: u32,
    tile_size: u32,
    tile_overlap: u32,
    filter: imageops::FilterType,
    mut on_tile_done: impl FnMut(u64, u64),
) -> Result<RgbaImage, String> {
    let source_rgba = source.to_rgba8();
    let (src_w, src_h) = source_rgba.dimensions();
    let mut output: RgbaImage = ImageBuffer::from_pixel(output_width, output_height, Rgba([0, 0, 0, 0]));
    let scale_x = output_width as f32 / src_w as f32;
    let scale_y = output_height as f32 / src_h as f32;

    let mut tiles = Vec::new();
    let step = tile_size.saturating_sub(tile_overlap.saturating_mul(2)).max(1);
    let mut y = 0;
    while y < src_h {
        let mut x = 0;
        while x < src_w {
            tiles.push((x, y));
            x = x.saturating_add(step);
        }
        y = y.saturating_add(step);
    }
    let total_tiles = tiles.len() as u64;

    for (index, (tile_x, tile_y)) in tiles.into_iter().enumerate() {
        let end_x = (tile_x + tile_size).min(src_w);
        let end_y = (tile_y + tile_size).min(src_h);
        let width = end_x.saturating_sub(tile_x);
        let height = end_y.saturating_sub(tile_y);
        if width == 0 || height == 0 {
            continue;
        }

        let view = source_rgba.view(tile_x, tile_y, width, height);
        let scaled = imageops::resize(
            &view.to_image(),
            ((width as f32) * scale_x).round().max(1.0) as u32,
            ((height as f32) * scale_y).round().max(1.0) as u32,
            filter,
        );
        let dst_x = ((tile_x as f32) * scale_x).round() as u32;
        let dst_y = ((tile_y as f32) * scale_y).round() as u32;
        overlay_tile(&mut output, &scaled, dst_x, dst_y);
        on_tile_done((index as u64) + 1, total_tiles);
    }

    Ok(output)
}

fn overlay_tile(target: &mut RgbaImage, tile: &RgbaImage, dst_x: u32, dst_y: u32) {
    for y in 0..tile.height() {
        for x in 0..tile.width() {
            let px = dst_x.saturating_add(x);
            let py = dst_y.saturating_add(y);
            if px < target.width() && py < target.height() {
                target.put_pixel(px, py, *tile.get_pixel(x, y));
            }
        }
    }
}
