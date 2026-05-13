pub mod filter;
mod run;
mod types;

pub use run::{
    compute_segment_duration, probe_duration_secs, resolve_ffmpeg_ffprobe, run_ffmpeg_video_to_gif,
};
pub use types::{VideoToGifOptions, VideoToGifProgressEvent};
