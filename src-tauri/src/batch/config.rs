//! 批量调度全局配置常量与安全并发修正。
//!
//! 命名遵循需求约定的大写下划线风格；并发修正规则集中于 [`resolve_effective_concurrency`]，
//! 调度器与 Tauri 命令层不要自行钳制并发，统一走这里以保持单一来源。

use serde::{Deserialize, Serialize};

use crate::batch::types::BatchTaskCategory;

// ----- 大写配置常量 -----

/// 图片类任务默认并发（再与 `CPU 核心数 - 1` 做下取）。
pub const BATCH_IMAGE_DEFAULT_CONCURRENCY: u32 = 4;
/// 图片类任务的最大安全并发（与 `CPU 核心数` 做下取）。
pub const BATCH_IMAGE_MAX_CONCURRENCY: u32 = 8;

/// 视频类任务默认并发，强烈建议保持 1。
pub const BATCH_VIDEO_DEFAULT_CONCURRENCY: u32 = 1;
/// 视频类任务的最大安全并发；用户选择超过此值时强制降至 1 或 2。
pub const BATCH_VIDEO_MAX_CONCURRENCY: u32 = 2;

/// AI 类任务默认/最大并发；避免模型推理同时占用 GPU/CPU。
pub const BATCH_AI_DEFAULT_CONCURRENCY: u32 = 1;

/// 进度事件最小推送间隔（毫秒）。
pub const BATCH_PROGRESS_INTERVAL_MS: u64 = 300;

/// 是否启用 `.tmp + rename` 临时文件机制。
pub const BATCH_USE_TEMP_FILE: bool = true;

/// 单文件失败时是否自动跳过、继续处理后续文件。
pub const BATCH_AUTO_SKIP_FAILED: bool = true;

/// 是否启用并发自动修正；关闭时严格按用户选择执行，但仍受最大安全并发兜底。
pub const BATCH_AUTO_FIX_CONCURRENCY: bool = true;

/// 单条子任务允许的最大重试次数（仅在错误标记为 `retryable` 时生效）。
pub const BATCH_MAX_RETRY_COUNT: u32 = 1;

/// 触发降压的「大文件」阈值（字节）。当任务内大文件占比较高时进一步降低并发。
pub const BATCH_LARGE_FILE_BYTES: u64 = 50 * 1024 * 1024;

// ----- 并发预设 -----

/// 用户在前端选择的并发档位。
#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ConcurrencyPreset {
    /// 低占用：固定 1，最小化资源占用。
    LowUsage,
    /// 均衡：按类别默认值。
    Balanced,
    /// 极速：尽量使用类别最大安全并发。
    Fast,
    /// 自定义：使用 `custom_concurrency` 指定值，再走安全修正。
    Custom,
}

impl Default for ConcurrencyPreset {
    fn default() -> Self {
        Self::Balanced
    }
}

/// 计算当前任务的实际可用并发数。
///
/// 规则简述：
/// 1. 先按档位映射出「期望并发」。
/// 2. 按类别套用上限（图片：`min(CPU, BATCH_IMAGE_MAX_CONCURRENCY)`；视频：
///    `BATCH_VIDEO_MAX_CONCURRENCY`；AI：`BATCH_AI_DEFAULT_CONCURRENCY`）。
/// 3. 若 `BATCH_AUTO_FIX_CONCURRENCY = false`，仍要保证不超过上限上限保护。
/// 4. 若大文件比例较高（≥30%），在以上结果上再下调一档，避免内存/IO 压力。
/// 5. 任何情况都保证至少为 1。
pub fn resolve_effective_concurrency(
    category: BatchTaskCategory,
    preset: ConcurrencyPreset,
    custom_concurrency: Option<u32>,
    cpu_cores: u32,
    large_file_count: usize,
    total_count: usize,
) -> u32 {
    let cpu_cores = cpu_cores.max(1);
    let (default_value, max_value) = category_bounds(category, cpu_cores);

    // 期望并发：用户档位映射
    let desired = match preset {
        ConcurrencyPreset::LowUsage => 1,
        ConcurrencyPreset::Balanced => default_value,
        ConcurrencyPreset::Fast => max_value,
        ConcurrencyPreset::Custom => custom_concurrency.unwrap_or(default_value),
    };

    // 类别上限钳制
    let mut value = desired.min(max_value).max(1);

    // 大文件降压：当大文件占比≥30% 时再降一档
    if total_count > 0 {
        let ratio = large_file_count as f32 / total_count as f32;
        if ratio >= 0.3 {
            value = value.saturating_sub(1).max(1);
        }
    }

    // 兜底：自动修正关闭时仍要遵守类别最大值，避免软件卡死
    if !BATCH_AUTO_FIX_CONCURRENCY {
        value = value.min(max_value).max(1);
    }
    value
}

/// 返回类别的 `(默认并发, 最大安全并发)`。
fn category_bounds(category: BatchTaskCategory, cpu_cores: u32) -> (u32, u32) {
    match category {
        BatchTaskCategory::Image => {
            // 默认：min(CPU - 1, 配置默认值)；最大：min(CPU, 配置最大值)
            let default_value = cpu_cores.saturating_sub(1).min(BATCH_IMAGE_DEFAULT_CONCURRENCY).max(1);
            let max_value = cpu_cores.min(BATCH_IMAGE_MAX_CONCURRENCY).max(1);
            (default_value, max_value)
        }
        BatchTaskCategory::Video => (BATCH_VIDEO_DEFAULT_CONCURRENCY, BATCH_VIDEO_MAX_CONCURRENCY),
        BatchTaskCategory::Ai => (BATCH_AI_DEFAULT_CONCURRENCY, BATCH_AI_DEFAULT_CONCURRENCY),
    }
}

/// 探测当前机器的逻辑核心数；获取失败时回退到 4。
pub fn detect_cpu_cores() -> u32 {
    std::thread::available_parallelism()
        .map(|n| n.get() as u32)
        .unwrap_or(4)
        .max(1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn image_balanced_clamped_by_cpu() {
        // 8 核：默认应为 min(7, 4) = 4
        assert_eq!(
            resolve_effective_concurrency(
                BatchTaskCategory::Image,
                ConcurrencyPreset::Balanced,
                None,
                8,
                0,
                10
            ),
            4
        );
    }

    #[test]
    fn image_fast_clamped_by_max() {
        // 16 核：最大 = min(16, 8) = 8
        assert_eq!(
            resolve_effective_concurrency(
                BatchTaskCategory::Image,
                ConcurrencyPreset::Fast,
                None,
                16,
                0,
                10
            ),
            8
        );
    }

    #[test]
    fn image_custom_overflow_clamped() {
        // 用户选 32，必须被钳制
        assert_eq!(
            resolve_effective_concurrency(
                BatchTaskCategory::Image,
                ConcurrencyPreset::Custom,
                Some(32),
                8,
                0,
                10
            ),
            8
        );
    }

    #[test]
    fn video_clamped_to_max_two() {
        assert_eq!(
            resolve_effective_concurrency(
                BatchTaskCategory::Video,
                ConcurrencyPreset::Custom,
                Some(8),
                8,
                0,
                5
            ),
            BATCH_VIDEO_MAX_CONCURRENCY
        );
    }

    #[test]
    fn ai_capped_to_one() {
        assert_eq!(
            resolve_effective_concurrency(
                BatchTaskCategory::Ai,
                ConcurrencyPreset::Fast,
                None,
                16,
                0,
                3
            ),
            1
        );
    }

    #[test]
    fn large_file_ratio_downgrade() {
        // 8 核 Balanced 默认 4；大文件占比 50% → 降到 3
        assert_eq!(
            resolve_effective_concurrency(
                BatchTaskCategory::Image,
                ConcurrencyPreset::Balanced,
                None,
                8,
                5,
                10
            ),
            3
        );
    }
}
