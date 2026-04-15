use crate::image_upscale::backend::{ai, cpu, gpu_ffmpeg};
use crate::image_upscale::loader::load_image;
use crate::image_upscale::saver::save_rgba_image;
use crate::image_upscale::scheduler::build_plan;
use crate::image_upscale::types::{ProcessingBackend, UpscaleOutcome, UpscaleProgressEvent, UpscaleRequest};
use image::ImageReader;

pub fn run_upscale(
    request: UpscaleRequest,
    mut on_progress: impl FnMut(UpscaleProgressEvent),
) -> Result<UpscaleOutcome, String> {
    on_progress(UpscaleProgressEvent {
        task_id: request.task_id.clone(),
        progress: 2,
        stage: "loading".to_string(),
        backend: "auto".to_string(),
        message: Some("加载图片中".to_string()),
    });

    let loaded = load_image(&request.input_path)?;
    let input_width = loaded.image.width();
    let input_height = loaded.image.height();
    let plan = build_plan(&request, input_width, input_height)?;

    on_progress(UpscaleProgressEvent {
        task_id: request.task_id.clone(),
        progress: 8,
        stage: "planning".to_string(),
        backend: "auto".to_string(),
        message: Some(format!(
            "输出尺寸 {}x{}，预计内存 {}MB",
            plan.output_width, plan.output_height, plan.estimated_memory_mb
        )),
    });

    match request.backend_preference {
        ProcessingBackend::Ai => {
            let ai_result = ai::try_upscale_with_ai(
                &loaded.image,
                &request,
                plan.output_width,
                plan.output_height,
            )?;
            on_progress(progress(&request.task_id, 92, "saving", "ai", Some("保存结果中")));
            save_rgba_image(ai_result, &request.output_path, loaded.format)?;
            return Ok(UpscaleOutcome {
                output_path: request.output_path,
                output_width: plan.output_width,
                output_height: plan.output_height,
                backend_used: "ai".to_string(),
            });
        }
        ProcessingBackend::Gpu => {
            if try_gpu_path(&request, &plan, &mut on_progress)? {
                return Ok(UpscaleOutcome {
                    output_path: request.output_path,
                    output_width: plan.output_width,
                    output_height: plan.output_height,
                    backend_used: "gpu".to_string(),
                });
            }
        }
        ProcessingBackend::Auto => {
            if try_gpu_path(&request, &plan, &mut on_progress)? {
                return Ok(UpscaleOutcome {
                    output_path: request.output_path,
                    output_width: plan.output_width,
                    output_height: plan.output_height,
                    backend_used: "gpu".to_string(),
                });
            }
        }
        ProcessingBackend::Cpu => {}
    }

    on_progress(progress(&request.task_id, 12, "processing", "cpu", Some("CPU 分块放大中")));
    let rgba = cpu::upscale(
        &loaded.image,
        &request,
        plan.output_width,
        plan.output_height,
        |done, total| {
            let ratio = if total == 0 { 0.0 } else { done as f32 / total as f32 };
            let scaled = 12.0 + ratio * 78.0;
            on_progress(UpscaleProgressEvent {
                task_id: request.task_id.clone(),
                progress: scaled.round().clamp(12.0, 90.0) as u8,
                stage: "processing".to_string(),
                backend: "cpu".to_string(),
                message: None,
            });
        },
    )?;

    on_progress(progress(&request.task_id, 92, "saving", "cpu", Some("保存结果中")));
    save_rgba_image(rgba, &request.output_path, loaded.format)?;

    Ok(UpscaleOutcome {
        output_path: request.output_path,
        output_width: plan.output_width,
        output_height: plan.output_height,
        backend_used: "cpu".to_string(),
    })
}

fn try_gpu_path(
    request: &UpscaleRequest,
    plan: &crate::image_upscale::types::UpscalePlan,
    on_progress: &mut impl FnMut(UpscaleProgressEvent),
) -> Result<bool, String> {
    if !gpu_ffmpeg::is_available() {
        on_progress(progress(
            &request.task_id,
            10,
            "processing",
            "gpu",
            Some("未检测到可用 GPU 加速，自动降级 CPU"),
        ));
        return Ok(false);
    }

    on_progress(progress(
        &request.task_id,
        20,
        "processing",
        "gpu",
        Some("GPU 加速处理中"),
    ));
    let tmp_output = request.output_path.with_extension("gpu_tmp.png");
    match gpu_ffmpeg::upscale_with_cuda(
        &request.input_path,
        &tmp_output,
        plan.output_width,
        plan.output_height,
    ) {
        Ok(_) => {
            let image = ImageReader::open(&tmp_output)
                .map_err(|err| format!("读取 GPU 临时结果失败：{err}"))?
                .decode()
                .map_err(|err| format!("解码 GPU 临时结果失败：{err}"))?
                .to_rgba8();
            save_rgba_image(image, &request.output_path, image::ImageFormat::Png)?;
            let _ = std::fs::remove_file(tmp_output);
            on_progress(progress(&request.task_id, 95, "saving", "gpu", Some("GPU 结果保存完成")));
            Ok(true)
        }
        Err(err) => {
            on_progress(progress(
                &request.task_id,
                12,
                "processing",
                "gpu",
                Some(&format!("GPU 失败({err})，自动降级 CPU")),
            ));
            Ok(false)
        }
    }
}

fn progress(task_id: &str, progress: u8, stage: &str, backend: &str, message: Option<&str>) -> UpscaleProgressEvent {
    UpscaleProgressEvent {
        task_id: task_id.to_string(),
        progress,
        stage: stage.to_string(),
        backend: backend.to_string(),
        message: message.map(|text| text.to_string()),
    }
}
