use crate::image_core::types::ProgressEvent;
use std::sync::Arc;

pub trait ProgressReporter: Send + Sync {
    fn emit(&self, event: ProgressEvent);
}

pub struct NoopProgressReporter;

impl ProgressReporter for NoopProgressReporter {
    fn emit(&self, _event: ProgressEvent) {}
}

pub struct CallbackProgressReporter {
    callback: Arc<dyn Fn(ProgressEvent) + Send + Sync>,
}

impl CallbackProgressReporter {
    pub fn new(callback: Arc<dyn Fn(ProgressEvent) + Send + Sync>) -> Self {
        Self { callback }
    }
}

impl ProgressReporter for CallbackProgressReporter {
    fn emit(&self, event: ProgressEvent) {
        (self.callback)(event);
    }
}
