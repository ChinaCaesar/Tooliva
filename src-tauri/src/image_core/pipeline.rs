use crate::image_core::error::ImagePipelineError;
use crate::image_core::io::{FsImageIO, ImageIO};
use crate::image_core::logger::{PipelineLogger, StdoutLogger};
use crate::image_core::metrics::MetricsCollector;
use crate::image_core::processor::ImageProcessor;
use crate::image_core::progress::{NoopProgressReporter, ProgressReporter};
use crate::image_core::tile::TileEngine;
use crate::image_core::types::{PipelineSummary, ProcessContext, ProcessOutput, ProgressEvent};
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct ProcessRuntime {
    pub io: Arc<dyn ImageIO>,
    pub tile_engine: TileEngine,
    pub progress: Arc<dyn ProgressReporter>,
    pub logger: Arc<dyn PipelineLogger>,
    pub metrics: Arc<Mutex<MetricsCollector>>,
}

pub struct ImagePipeline {
    runtime: ProcessRuntime,
}

impl ImagePipeline {
    pub fn new(tile_engine: TileEngine) -> Self {
        Self {
            runtime: ProcessRuntime {
                io: Arc::new(FsImageIO),
                tile_engine,
                progress: Arc::new(NoopProgressReporter),
                logger: Arc::new(StdoutLogger),
                metrics: Arc::new(Mutex::new(MetricsCollector::new())),
            },
        }
    }

    pub fn with_progress_reporter(mut self, reporter: Arc<dyn ProgressReporter>) -> Self {
        self.runtime.progress = reporter;
        self
    }

    pub fn with_logger(mut self, logger: Arc<dyn PipelineLogger>) -> Self {
        self.runtime.logger = logger;
        self
    }

    pub fn execute(
        &self,
        processor: &dyn ImageProcessor,
        ctx: &ProcessContext,
    ) -> Result<(ProcessOutput, PipelineSummary), ImagePipelineError> {
        self.emit(ctx, "loading", 2, Some("加载文件中"));
        self.enter_stage("loading");
        let loaded = self.runtime.io.load(&ctx.input_path)?;
        self.leave_stage();

        self.emit(ctx, "planning", 8, Some("任务规划中"));
        self.enter_stage("planning");
        let plan = processor.plan(ctx, &loaded)?;
        self.leave_stage();

        self.emit(ctx, "processing", 12, Some("处理中"));
        self.enter_stage("processing");
        let output = processor.process(ctx, &loaded, &plan, &self.runtime)?;
        self.leave_stage();

        self.emit(ctx, "completed", 100, Some("处理完成"));
        let summary = self
            .runtime
            .metrics
            .lock()
            .map_err(|_| ImagePipelineError::Internal("统计状态异常".to_string()))?
            .summary(&ctx.task_id, &ctx.processor_key, true, None, None);
        Ok((output, summary))
    }

    fn emit(&self, ctx: &ProcessContext, stage: &str, progress: u8, message: Option<&str>) {
        if let Some(msg) = message {
            self.runtime
                .logger
                .info(&format!("task={} processor={} stage={} msg={}", ctx.task_id, ctx.processor_key, stage, msg));
        }
        self.runtime.progress.emit(ProgressEvent::stage(
            &ctx.task_id,
            &ctx.processor_key,
            stage,
            progress,
            message.map(|x| x.to_string()),
        ));
    }

    fn enter_stage(&self, stage: &str) {
        if let Ok(mut metrics) = self.runtime.metrics.lock() {
            metrics.enter_stage(stage);
        }
    }

    fn leave_stage(&self) {
        if let Ok(mut metrics) = self.runtime.metrics.lock() {
            metrics.leave_stage();
        }
    }
}
