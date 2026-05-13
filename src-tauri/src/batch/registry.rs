//! BatchProcessor 注册表：按 `BatchTaskType` 查找具体处理器实现。

use std::collections::HashMap;
use std::sync::Arc;

use crate::batch::processor::BatchProcessor;
use crate::batch::types::BatchTaskType;

#[derive(Default, Clone)]
pub struct BatchProcessorRegistry {
    processors: HashMap<BatchTaskType, Arc<dyn BatchProcessor>>,
}

impl BatchProcessorRegistry {
    pub fn register(&mut self, processor: Arc<dyn BatchProcessor>) {
        self.processors.insert(processor.task_type(), processor);
    }

    pub fn get(&self, task_type: BatchTaskType) -> Option<Arc<dyn BatchProcessor>> {
        self.processors.get(&task_type).cloned()
    }
}
