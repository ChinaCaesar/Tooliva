use crate::image_core::error::ImagePipelineError;

pub async fn run_blocking<T: Send + 'static>(
    task: impl FnOnce() -> Result<T, ImagePipelineError> + Send + 'static,
) -> Result<T, ImagePipelineError> {
    let handle = tauri::async_runtime::spawn_blocking(task);
    handle
        .await
        .map_err(|err| ImagePipelineError::Internal(format!("后台执行失败：{err}")))?
}
