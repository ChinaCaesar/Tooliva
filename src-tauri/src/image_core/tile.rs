use crate::image_core::error::ImagePipelineError;
use crate::image_core::types::ProcessPlan;
use image::RgbaImage;

#[derive(Debug, Clone, Copy)]
pub struct TileRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

pub struct TileResult {
    pub image: RgbaImage,
    pub dst_x: u32,
    pub dst_y: u32,
}

pub trait TileAlgorithm: Send + Sync {
    fn process_tile(&self, source: &RgbaImage, rect: TileRect, plan: &ProcessPlan) -> Result<TileResult, ImagePipelineError>;
}

#[derive(Debug, Clone, Copy)]
pub struct TileEngine {
    pub tile_size: u32,
    pub tile_overlap: u32,
}

impl TileEngine {
    pub fn run_tiled(
        &self,
        source: &RgbaImage,
        plan: &ProcessPlan,
        algorithm: &dyn TileAlgorithm,
        mut on_progress: impl FnMut(u64, u64),
    ) -> Result<RgbaImage, ImagePipelineError> {
        let mut output = RgbaImage::new(plan.output_width, plan.output_height);
        let step = self
            .tile_size
            .saturating_sub(self.tile_overlap.saturating_mul(2))
            .max(1);
        let mut tiles = Vec::new();
        let mut y = 0;
        while y < source.height() {
            let mut x = 0;
            while x < source.width() {
                let width = (x + self.tile_size).min(source.width()).saturating_sub(x);
                let height = (y + self.tile_size).min(source.height()).saturating_sub(y);
                tiles.push(TileRect { x, y, width, height });
                x = x.saturating_add(step);
            }
            y = y.saturating_add(step);
        }
        let total = tiles.len() as u64;
        for (index, rect) in tiles.into_iter().enumerate() {
            let result = algorithm.process_tile(source, rect, plan)?;
            overlay(&mut output, &result.image, result.dst_x, result.dst_y);
            on_progress((index as u64) + 1, total);
        }
        Ok(output)
    }
}

fn overlay(target: &mut RgbaImage, tile: &RgbaImage, dst_x: u32, dst_y: u32) {
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
