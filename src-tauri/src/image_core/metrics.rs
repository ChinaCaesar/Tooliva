use crate::image_core::types::{PipelineSummary, RuntimeStageStat};
use std::time::Instant;

pub struct MetricsCollector {
    started_at: Instant,
    stage_started_at: Instant,
    stage_elapsed: Vec<RuntimeStageStat>,
}

impl MetricsCollector {
    pub fn new() -> Self {
        let now = Instant::now();
        Self {
            started_at: now,
            stage_started_at: now,
            stage_elapsed: Vec::new(),
        }
    }

    pub fn enter_stage(&mut self, stage: &str) {
        self.stage_started_at = Instant::now();
        self.stage_elapsed.push(RuntimeStageStat {
            stage: stage.to_string(),
            elapsed: std::time::Duration::from_millis(0),
        });
    }

    pub fn leave_stage(&mut self) {
        if let Some(last) = self.stage_elapsed.last_mut() {
            last.elapsed = self.stage_started_at.elapsed();
        }
    }

    pub fn summary(
        &self,
        task_id: &str,
        processor_key: &str,
        success: bool,
        error_code: Option<String>,
        error_message: Option<String>,
    ) -> PipelineSummary {
        let stage_elapsed_ms = self
            .stage_elapsed
            .iter()
            .map(|item| (item.stage.clone(), item.elapsed.as_millis()))
            .collect();
        PipelineSummary {
            task_id: task_id.to_string(),
            processor_key: processor_key.to_string(),
            success,
            elapsed_ms: self.started_at.elapsed().as_millis(),
            stage_elapsed_ms,
            error_code,
            error_message,
        }
    }
}
