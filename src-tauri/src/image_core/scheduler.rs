use crate::image_core::error::ImagePipelineError;
use std::time::Duration;

#[derive(Debug, Clone, Copy)]
pub struct SchedulerConfig {
    pub throttle_ms_between_tasks: u64,
}

impl Default for SchedulerConfig {
    fn default() -> Self {
        Self {
            throttle_ms_between_tasks: 20,
        }
    }
}

pub async fn throttle_after_task(config: SchedulerConfig) -> Result<(), ImagePipelineError> {
    if config.throttle_ms_between_tasks == 0 {
        return Ok(());
    }
    let delay = Duration::from_millis(config.throttle_ms_between_tasks);
    tauri::async_runtime::spawn_blocking(move || std::thread::sleep(delay))
        .await
        .map_err(|err| ImagePipelineError::Internal(format!("任务节流等待失败：{err}")))?;
    Ok(())
}
