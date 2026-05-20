//! Reusable local AI worker management.
//!
//! The worker is intentionally shared across tools. Image watermark removal uses it today;
//! video watermark removal can reuse the same runtime, model store, and long-lived worker later.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};

use crate::ai_runtime::{ensure_lama_torch_checkpoint, resolve_ai_runtime_paths, AiRuntimePaths};

static LAMA_WORKER: OnceLock<Mutex<Option<LamaWorker>>> = OnceLock::new();
static REQUEST_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRuntimeHealth {
    pub ready: bool,
    pub device: Option<String>,
    pub torch_version: Option<String>,
}

#[derive(Debug, Clone)]
pub struct InpaintImageRequest {
    pub input_path: PathBuf,
    pub output_path: PathBuf,
    pub regions: Vec<Value>,
    pub output_format: String,
    pub mode: String,
}

struct LamaWorker {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<std::process::ChildStdout>,
    health: AiRuntimeHealth,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkerRequest<'a> {
    id: u64,
    command: &'a str,
    input: &'a str,
    output: &'a str,
    regions: &'a [Value],
    format: &'a str,
    mode: &'a str,
}

#[derive(Debug, Deserialize)]
struct WorkerLine {
    id: Option<u64>,
    ok: Option<bool>,
    event: Option<String>,
    error: Option<String>,
    device: Option<String>,
    torch_version: Option<String>,
    stage: Option<String>,
    duration_ms: Option<u64>,
    #[serde(flatten)]
    extra: serde_json::Map<String, Value>,
}

pub fn ensure_lama_worker_ready(require_lama: bool) -> Result<AiRuntimeHealth, String> {
    let paths = prepare_lama_runtime(require_lama)?;
    let lock = LAMA_WORKER.get_or_init(|| Mutex::new(None));
    let mut guard = lock
        .lock()
        .map_err(|_| "AI worker lock poisoned".to_string())?;
    if let Some(worker) = guard.as_mut() {
        if worker_is_alive(worker) {
            return Ok(worker.health.clone());
        }
        let _ = worker.child.kill();
        *guard = None;
    }
    append_perf_log(&format!(
        "[ai-worker-lifecycle] stage=start-request require_lama={} python=\"{}\" sidecar=\"{}\" torch_home=\"{}\"",
        require_lama,
        paths.python_exe.display(),
        paths.sidecar_script.display(),
        paths.torch_home.display()
    ));
    let (worker, health) = start_lama_worker(&paths, require_lama)?;
    *guard = Some(worker);
    Ok(health)
}

pub fn check_lama_runtime_health() -> Result<AiRuntimeHealth, String> {
    let paths = resolve_ai_runtime_paths()?;
    ensure_runtime_imports(&paths, true)
}

pub fn inpaint_image_with_lama(request: InpaintImageRequest) -> Result<(), String> {
    let paths = prepare_lama_runtime(mode_requires_lama(&request.mode))?;
    let lock = LAMA_WORKER.get_or_init(|| Mutex::new(None));
    let mut guard = lock
        .lock()
        .map_err(|_| "AI worker lock poisoned".to_string())?;

    if guard.as_mut().map(worker_is_alive) != Some(true) {
        if let Some(worker) = guard.as_mut() {
            let _ = worker.child.kill();
        }
        append_perf_log(&format!(
            "[ai-worker-lifecycle] stage=restart-before-request mode={} require_lama={}",
            request.mode,
            mode_requires_lama(&request.mode)
        ));
        let (worker, _) = start_lama_worker(&paths, mode_requires_lama(&request.mode))?;
        *guard = Some(worker);
    }

    let Some(worker) = guard.as_mut() else {
        return Err("AI worker was not started".to_string());
    };

    match send_inpaint_request(worker, &request) {
        Ok(()) => Ok(()),
        Err(first_err) => {
            append_perf_log(&format!(
                "[ai-worker-lifecycle] stage=request-retry mode={} error=\"{}\"",
                request.mode,
                sanitize_log_value(&first_err)
            ));
            let _ = worker.child.kill();
            let (mut restarted, _) =
                start_lama_worker(&paths, mode_requires_lama(&request.mode))?;
            let retry_result = send_inpaint_request(&mut restarted, &request);
            *guard = Some(restarted);
            retry_result.map_err(|retry_err| {
                format!("AI worker failed after restart: {retry_err}; first error: {first_err}")
            })
        }
    }
}

fn prepare_lama_runtime(require_lama: bool) -> Result<AiRuntimePaths, String> {
    let paths = resolve_ai_runtime_paths()?;
    if !paths.sidecar_script.exists() {
        return Err(format!(
            "AI sidecar not found: {}",
            paths.sidecar_script.display()
        ));
    }
    ensure_runtime_imports(&paths, require_lama)?;
    if require_lama {
        ensure_lama_torch_checkpoint(&paths)?;
    }
    Ok(paths)
}

fn mode_requires_lama(mode: &str) -> bool {
    mode.trim().eq_ignore_ascii_case("quality")
}

fn ensure_runtime_imports(
    paths: &AiRuntimePaths,
    require_lama: bool,
) -> Result<AiRuntimeHealth, String> {
    let mut command = Command::new(&paths.python_exe);
    command
        .arg(&paths.sidecar_script)
        .arg("check-runtime")
        .arg("--torch-home")
        .arg(&paths.torch_home)
        .env("TORCH_HOME", &paths.torch_home)
        .env("PYTHONUTF8", "1")
        .env("PYTHONIOENCODING", "utf-8");
    if require_lama {
        command.arg("--require-lama");
    }
    let output = command.output()
        .map_err(|err| {
            format!(
                "Project AI Python runtime is unavailable: {}. Run scripts/setup-ai-runtime.ps1. Original error: {err}",
                paths.python_exe.display()
            )
        })?;
    if output.status.success() {
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            if let Ok(parsed) = serde_json::from_str::<WorkerLine>(line) {
                if parsed.event.as_deref() == Some("runtime-check") {
                    return Ok(AiRuntimeHealth {
                        ready: true,
                        device: parsed.device,
                        torch_version: parsed.torch_version,
                    });
                }
            }
        }
        return Ok(AiRuntimeHealth {
            ready: true,
            device: None,
            torch_version: None,
        });
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(format!(
        "Project AI runtime check failed. stdout: {}; stderr: {}",
        stdout.trim(),
        stderr.trim()
    ))
}

fn start_lama_worker(
    paths: &AiRuntimePaths,
    require_lama: bool,
) -> Result<(LamaWorker, AiRuntimeHealth), String> {
    let mut command = Command::new(&paths.python_exe);
    command
        .arg(&paths.sidecar_script)
        .arg("worker")
        .arg("--torch-home")
        .arg(&paths.torch_home)
        .env("TORCH_HOME", &paths.torch_home)
        .env("PYTHONUTF8", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if require_lama {
        command.arg("--require-lama");
    }
    let mut child = command.spawn()
        .map_err(|err| format!("Failed to start AI worker: {err}"))?;

    if let Some(mut stderr) = child.stderr.take() {
        std::thread::spawn(move || {
            let mut buf = String::new();
            let _ = stderr.read_to_string(&mut buf);
            if !buf.trim().is_empty() {
                let message = format!("[ai-worker] {}", buf.trim());
                eprintln!("{message}");
                append_perf_log(&message);
            }
        });
    }

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "AI worker stdin is unavailable".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "AI worker stdout is unavailable".to_string())?;
    let mut stdout = BufReader::new(stdout);

    let mut line = String::new();
    loop {
        line.clear();
        let read = stdout
            .read_line(&mut line)
            .map_err(|err| format!("Failed to read AI worker startup output: {err}"))?;
        if read == 0 {
            return Err("AI worker exited before becoming ready".to_string());
        }
        if let Ok(parsed) = serde_json::from_str::<WorkerLine>(line.trim()) {
            if parsed.event.as_deref() == Some("worker-ready") {
                append_perf_log(&format!(
                    "[ai-worker-lifecycle] stage=worker-ready require_lama={} device={} torch_version={}",
                    require_lama,
                    parsed.device.as_deref().unwrap_or(""),
                    parsed.torch_version.as_deref().unwrap_or("")
                ));
                return Ok((
                    LamaWorker {
                        child,
                        stdin,
                        stdout,
                        health: AiRuntimeHealth {
                            ready: true,
                            device: parsed.device.clone(),
                            torch_version: parsed.torch_version.clone(),
                        },
                    },
                    AiRuntimeHealth {
                        ready: true,
                        device: parsed.device,
                        torch_version: parsed.torch_version,
                    },
                ));
            }
        }
    }
}

fn send_inpaint_request(
    worker: &mut LamaWorker,
    request: &InpaintImageRequest,
) -> Result<(), String> {
    let id = REQUEST_ID.fetch_add(1, Ordering::Relaxed);
    let input = path_to_str(&request.input_path)?;
    let output = path_to_str(&request.output_path)?;
    let payload = WorkerRequest {
        id,
        command: "inpaint-image",
        input,
        output,
        regions: &request.regions,
        format: &request.output_format,
        mode: &request.mode,
    };
    append_perf_log(&format!(
        "[ai-worker-request] id={} stage=send input=\"{}\" output=\"{}\" mode={} format={} regions={}",
        id,
        request.input_path.display(),
        request.output_path.display(),
        request.mode,
        request.output_format,
        request.regions.len()
    ));
    let line = serde_json::to_string(&payload).map_err(|err| err.to_string())?;
    worker
        .stdin
        .write_all(line.as_bytes())
        .and_then(|_| worker.stdin.write_all(b"\n"))
        .and_then(|_| worker.stdin.flush())
        .map_err(|err| format!("Failed to send AI worker request: {err}"))?;

    let mut response = String::new();
    loop {
        response.clear();
        let read = worker
            .stdout
            .read_line(&mut response)
            .map_err(|err| format!("Failed to read AI worker response: {err}"))?;
        if read == 0 {
            return Err("AI worker exited while processing request".to_string());
        }
        let parsed: WorkerLine = match serde_json::from_str(response.trim()) {
            Ok(value) => value,
            Err(_) => continue,
        };
        if parsed.event.as_deref() == Some("perf") {
            log_perf_line(&parsed);
            continue;
        }
        if parsed.id.is_none() && parsed.ok == Some(false) {
            let error = parsed
                .error
                .unwrap_or_else(|| "AI worker protocol error".to_string());
            append_perf_log(&format!(
                "[ai-worker-request] id={} stage=protocol-error error=\"{}\"",
                id,
                sanitize_log_value(&error)
            ));
            return Err(error);
        }
        if parsed.id != Some(id) {
            continue;
        }
        if parsed.ok == Some(true) {
            append_perf_log(&format!("[ai-worker-request] id={} stage=ok", id));
            return Ok(());
        }
        let error = parsed
            .error
            .unwrap_or_else(|| "AI worker request failed".to_string());
        append_perf_log(&format!(
            "[ai-worker-request] id={} stage=error error=\"{}\"",
            id,
            sanitize_log_value(&error)
        ));
        return Err(error);
    }
}

fn log_perf_line(line: &WorkerLine) {
    let stage = line.stage.as_deref().unwrap_or("unknown");
    let duration = line
        .duration_ms
        .map(|value| format!("{value}ms"))
        .unwrap_or_else(|| "-".to_string());
    let id = line
        .id
        .map(|value| value.to_string())
        .unwrap_or_else(|| "-".to_string());
    let mut details = Vec::new();
    for (key, value) in &line.extra {
        if key == "event" || key == "stage" || key == "duration_ms" || key == "id" {
            continue;
        }
        details.push(format!("{key}={value}"));
    }
    let message = format!(
        "[ai-worker-perf] id={} stage={} duration={} {}",
        id,
        stage,
        duration,
        details.join(" ")
    );
    eprintln!("{message}");
    append_perf_log(&message);
}

pub fn append_perf_log(message: &str) {
    let Ok(paths) = resolve_ai_runtime_paths() else {
        return;
    };
    let log_dir = paths.models_root.join("_logs");
    if std::fs::create_dir_all(&log_dir).is_err() {
        return;
    }
    let line = format!("{} {}\n", current_timestamp_ms(), message);
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_dir.join("ai-inpaint-perf.log"))
        .and_then(|mut file| file.write_all(line.as_bytes()));
}

fn current_timestamp_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn sanitize_log_value(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn worker_is_alive(worker: &mut LamaWorker) -> bool {
    match worker.child.try_wait() {
        Ok(None) => true,
        Ok(Some(_)) | Err(_) => false,
    }
}

fn path_to_str(path: &Path) -> Result<&str, String> {
    path.to_str()
        .ok_or_else(|| format!("Path contains invalid UTF-8: {}", path.display()))
}
