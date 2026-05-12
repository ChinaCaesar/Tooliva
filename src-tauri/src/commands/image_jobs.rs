use crate::image_core::error::ImagePipelineError;
use crate::image_core::executor::run_blocking;
use crate::image_core::pipeline::ImagePipeline;
use crate::image_core::progress::CallbackProgressReporter;
use crate::image_core::registry::ProcessorRegistry;
use crate::image_core::scheduler::{throttle_after_task, SchedulerConfig};
use crate::image_core::tile::TileEngine;
use crate::image_core::types::{PipelineSummary, ProcessContext, ProcessOutput, ProcessingLimits, TileConfig};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

pub const IMAGE_JOB_PROGRESS_EVENT: &str = "image-job-progress";

#[derive(Clone)]
pub struct ImageProcessorRegistryState(pub ProcessorRegistry);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartImageJobPayload {
    pub task_id: String,
    pub processor_key: String,
    pub input_path: String,
    pub output_path: String,
    pub output_format: Option<String>,
    pub params: Value,
    pub limits: Option<ProcessingLimits>,
    pub tile: Option<TileConfig>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartImageJobResult {
    pub success: bool,
    pub output: Option<ProcessOutput>,
    pub summary: PipelineSummary,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn start_image_job(
    payload: StartImageJobPayload,
    app: AppHandle,
    registry_state: State<'_, ImageProcessorRegistryState>,
) -> Result<StartImageJobResult, String> {
    let processor = registry_state
        .0
        .get(&payload.processor_key)
        .ok_or_else(|| format!("处理器不存在：{}", payload.processor_key))?;
    let context = ProcessContext {
        task_id: payload.task_id.clone(),
        processor_key: payload.processor_key.clone(),
        input_path: payload.input_path.into(),
        output_path: payload.output_path.into(),
        output_format: payload.output_format.clone(),
        params: payload.params.clone(),
        limits: payload.limits.unwrap_or_default(),
        tile: payload.tile.unwrap_or_default(),
    };

    let app_for_progress = app.clone();
    let progress_reporter = CallbackProgressReporter::new(Arc::new(move |event| {
        let _ = app_for_progress.emit(IMAGE_JOB_PROGRESS_EVENT, event);
    }));
    let tile = context.tile.clone();
    let result = run_blocking(move || {
        let pipeline = ImagePipeline::new(TileEngine {
            tile_size: tile.tile_size,
            tile_overlap: tile.tile_overlap,
        })
        .with_progress_reporter(Arc::new(progress_reporter));
        pipeline.execute(processor.as_ref(), &context)
    })
    .await;

    throttle_after_task(SchedulerConfig::default())
        .await
        .map_err(|err| err.to_string())?;

    match result {
        Ok((output, summary)) => Ok(StartImageJobResult {
            success: true,
            output: Some(output),
            summary,
            error: None,
        }),
        Err(err) => {
            let failed_summary = PipelineSummary {
                task_id: payload.task_id,
                processor_key: payload.processor_key,
                success: false,
                elapsed_ms: 0,
                stage_elapsed_ms: vec![],
                error_code: Some(error_code(&err)),
                error_message: Some(err.to_string()),
            };
            Ok(StartImageJobResult {
                success: false,
                output: None,
                summary: failed_summary,
                error: Some(err.to_string()),
            })
        }
    }
}

fn error_code(error: &ImagePipelineError) -> String {
    match error {
        ImagePipelineError::InvalidInput(_) => "INVALID_INPUT",
        ImagePipelineError::DecodeFailed(_) => "DECODE_FAILED",
        ImagePipelineError::EncodeFailed(_) => "ENCODE_FAILED",
        ImagePipelineError::IoFailed(_) => "IO_FAILED",
        ImagePipelineError::PlanFailed(_) => "PLAN_FAILED",
        ImagePipelineError::NotImplemented(_) => "NOT_IMPLEMENTED",
        ImagePipelineError::Internal(_) => "INTERNAL",
    }
    .to_string()
}
