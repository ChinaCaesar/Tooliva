pub trait PipelineLogger: Send + Sync {
    fn info(&self, message: &str);
}

pub struct StdoutLogger;

impl PipelineLogger for StdoutLogger {
    fn info(&self, message: &str) {
        println!("[image-core][info] {message}");
    }
}
