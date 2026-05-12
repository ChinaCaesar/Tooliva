use crate::image_core::processor::ImageProcessor;
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Default, Clone)]
pub struct ProcessorRegistry {
    processors: HashMap<String, Arc<dyn ImageProcessor>>,
}

impl ProcessorRegistry {
    pub fn register(&mut self, processor: Arc<dyn ImageProcessor>) {
        self.processors.insert(processor.key().to_string(), processor);
    }

    pub fn get(&self, key: &str) -> Option<Arc<dyn ImageProcessor>> {
        self.processors.get(key).cloned()
    }
}
