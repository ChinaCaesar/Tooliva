pub trait PipelineLogger: Send + Sync {
    fn info(&self, message: &str);
    fn warn(&self, message: &str);
    fn error(&self, message: &str);
}

pub struct StdoutLogger;

impl PipelineLogger for StdoutLogger {
    fn info(&self, message: &str) {
        println!("[image-core][info] {message}");
    }

    fn warn(&self, message: &str) {
        println!("[image-core][warn] {message}");
    }

    fn error(&self, message: &str) {
        eprintln!("[image-core][error] {message}");
    }
}
