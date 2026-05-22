use crate::debug_log::debug_logs_enabled;

pub trait PipelineLogger: Send + Sync {
    fn info(&self, message: &str);
}

pub struct StdoutLogger;

impl PipelineLogger for StdoutLogger {
    fn info(&self, message: &str) {
        if debug_logs_enabled() {
            println!("[image-core][info] {message}");
        }
    }
}
