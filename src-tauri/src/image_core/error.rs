use std::error::Error;
use std::fmt::{Display, Formatter};

#[derive(Debug, Clone)]
pub enum ImagePipelineError {
    InvalidInput(String),
    DecodeFailed(String),
    EncodeFailed(String),
    IoFailed(String),
    PlanFailed(String),
    TileProcessFailed(String),
    ProcessorNotFound(String),
    NotImplemented(String),
    Internal(String),
}

impl Display for ImagePipelineError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidInput(msg) => write!(f, "输入参数不合法：{msg}"),
            Self::DecodeFailed(msg) => write!(f, "图像解码失败：{msg}"),
            Self::EncodeFailed(msg) => write!(f, "图像编码失败：{msg}"),
            Self::IoFailed(msg) => write!(f, "文件读写失败：{msg}"),
            Self::PlanFailed(msg) => write!(f, "任务规划失败：{msg}"),
            Self::TileProcessFailed(msg) => write!(f, "分块处理失败：{msg}"),
            Self::ProcessorNotFound(msg) => write!(f, "处理器不存在：{msg}"),
            Self::NotImplemented(msg) => write!(f, "能力尚未实现：{msg}"),
            Self::Internal(msg) => write!(f, "内部错误：{msg}"),
        }
    }
}

impl Error for ImagePipelineError {}

impl From<std::io::Error> for ImagePipelineError {
    fn from(value: std::io::Error) -> Self {
        Self::IoFailed(value.to_string())
    }
}
