use std::sync::OnceLock;

pub const DEBUG_LOG_ENV: &str = "TOOLIVA_DEBUG_LOG";

static DEBUG_LOGS_ENABLED: OnceLock<bool> = OnceLock::new();

pub fn debug_logs_enabled() -> bool {
    *DEBUG_LOGS_ENABLED.get_or_init(|| {
        std::env::var(DEBUG_LOG_ENV)
            .map(|value| {
                matches!(
                    value.trim().to_ascii_lowercase().as_str(),
                    "1" | "true" | "yes" | "on" | "debug"
                )
            })
            .unwrap_or(false)
    })
}

pub fn debug_log_to_stderr(message: &str) {
    if debug_logs_enabled() {
        eprintln!("{message}");
    }
}
