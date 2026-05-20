//! 临时文件与输出路径辅助。
//!
//! 设计目标：
//! 1. 所有最终输出都先写入 `<final>.tmp`，成功后再 `rename` 到目标名，避免半文件。
//! 2. 失败 / 取消时清理对应 `.tmp`，不污染输出目录。
//! 3. 默认不覆盖原文件；目标重名时追加 `_1` `_2` 等序号。

use std::fs;
use std::path::{Path, PathBuf};

use crate::batch::types::BatchError;

/// 在 `output_dir` 下按 `stem + suffix + ext` 规则生成不重名的最终路径。
///
/// 例如：`stem="image", suffix=Some("watermark"), ext="jpg"` → `image_watermark.jpg`，
/// 已存在则依次追加 `_1`、`_2`…
pub fn allocate_unique_final_path(
    output_dir: &Path,
    stem: &str,
    suffix: Option<&str>,
    ext: &str,
) -> PathBuf {
    let base_name = match suffix {
        Some(s) if !s.is_empty() => format!("{stem}_{s}.{ext}"),
        _ => format!("{stem}.{ext}"),
    };
    let initial = output_dir.join(&base_name);
    if !initial.exists() {
        return initial;
    }
    let stem_with_suffix = match suffix {
        Some(s) if !s.is_empty() => format!("{stem}_{s}"),
        _ => stem.to_string(),
    };
    for index in 1.. {
        let candidate = output_dir.join(format!("{stem_with_suffix}_{index}.{ext}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    initial
}

/// 给定最终路径，返回配套的 `.tmp` 临时路径。
pub fn temp_path_for(final_path: &Path) -> PathBuf {
    let mut tmp = final_path.as_os_str().to_owned();
    tmp.push(".tmp");
    PathBuf::from(tmp)
}

/// 确保父目录存在；失败时返回带中文消息的 [`BatchError`]。
pub fn ensure_parent_dir(path: &Path) -> Result<(), BatchError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| {
            BatchError::io(format!("无法创建输出目录 {}：{err}", parent.display()))
        })?;
    }
    Ok(())
}

/// 把 `.tmp` 原子重命名为最终文件。如果目标已存在则先清理 tmp 并返回错误。
pub fn finalize_temp(temp_path: &Path, final_path: &Path) -> Result<(), BatchError> {
    if final_path.exists() {
        // 不覆盖已存在文件：上游应通过 `allocate_unique_final_path` 选出唯一名
        let _ = fs::remove_file(temp_path);
        return Err(BatchError::io(format!(
            "目标文件已存在，禁止覆盖：{}",
            final_path.display()
        )));
    }
    fs::rename(temp_path, final_path)
        .map_err(|err| BatchError::io(format!("重命名输出文件失败：{err}")))?;
    Ok(())
}

/// 清理失败 / 取消时残留的 `.tmp`。任何错误都被吞掉，不阻塞调度层。
pub fn cleanup_temp(temp_path: &Path) {
    if temp_path.exists() {
        let _ = fs::remove_file(temp_path);
    }
}

/// 扫描输出目录下属于本任务的 `.tmp` 残留并删除。
///
/// 当前实现使用宽松匹配：删除目录内所有 `.tmp` 文件。后续可改为
/// 维护「正在写入 tmp 路径列表」做精准清理。
pub fn cleanup_temp_files_in_dir(output_dir: &Path) {
    if !output_dir.is_dir() {
        return;
    }
    let Ok(entries) = fs::read_dir(output_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file()
            && path
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.eq_ignore_ascii_case("tmp"))
                .unwrap_or(false)
        {
            let _ = fs::remove_file(path);
        }
    }
}
