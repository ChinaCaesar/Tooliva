use crate::ai_runtime::{apply_ai_path_settings, AiPathSettingsInput, AI_PATH_MODE_DEFAULT};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, LogicalSize, Manager};

const SETTINGS_KEY: &str = "user_settings";
const DATABASE_FILE_NAME: &str = "tooliva.db";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsPayload {
    pub language: String,
    pub theme: String,
    #[serde(default = "default_window_size_value")]
    pub window_size: String,
    pub favorite_tool_ids: Vec<String>,
    #[serde(default)]
    pub default_output_directory: String,
    #[serde(default = "default_true")]
    pub task_done_notification_enabled: bool,
    #[serde(default)]
    pub launch_on_startup: bool,
    #[serde(default)]
    pub minimize_to_tray: bool,
    #[serde(default = "default_true")]
    pub confirm_on_close: bool,
    #[serde(default)]
    pub cache_directory: String,
    #[serde(default = "default_output_naming_rule")]
    pub output_file_naming_rule: String,
    #[serde(default = "default_max_concurrent_tasks")]
    pub max_concurrent_tasks: u32,
    #[serde(default = "default_true")]
    pub auto_check_updates: bool,
    #[serde(default = "default_update_method")]
    pub update_method: String,
    #[serde(default = "default_check_frequency")]
    pub check_frequency: String,
    #[serde(default = "default_true")]
    pub privacy_ux_improvement: bool,
    #[serde(default = "default_true")]
    pub error_reporting_enabled: bool,
    #[serde(default = "default_ai_path_mode")]
    pub ai_path_mode: String,
    #[serde(default)]
    pub ai_runtime_root: String,
    #[serde(default)]
    pub ai_models_root: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeStatsPayload {
    pub total_usage_count: i64,
    pub today_usage_count: i64,
    pub total_saved_minutes: i64,
    pub today_saved_minutes: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeRecentUsagePayload {
    pub id: i64,
    pub tool_key: String,
    pub file_name: String,
    pub used_at_ts: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeDashboardPayload {
    pub stats: HomeStatsPayload,
    pub recent_items: Vec<HomeRecentUsagePayload>,
    pub top_tools: Vec<HomeTopToolPayload>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordToolUsagePayload {
    pub tool_key: String,
    pub file_name: String,
    #[serde(default)]
    #[allow(dead_code)]
    pub saved_seconds: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeTopToolPayload {
    pub tool_key: String,
    pub usage_count: i64,
}

#[tauri::command]
pub fn get_app_settings(app: AppHandle) -> Result<AppSettingsPayload, String> {
    load_saved_settings(&app)
}

#[tauri::command]
pub fn save_app_settings(payload: AppSettingsPayload, app: AppHandle) -> Result<(), String> {
    let conn = open_database(&app)?;
    let serialized =
        serde_json::to_string(&payload).map_err(|err| format!("序列化设置失败：{err}"))?;
    let now_ts = current_unix_timestamp();
    conn.execute(
        "INSERT INTO settings (key, value, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![SETTINGS_KEY, serialized, now_ts],
    )
    .map_err(|err| format!("保存设置失败：{err}"))?;
    apply_runtime_path_settings(&payload);
    apply_window_size(&app, &payload.window_size)?;
    Ok(())
}

#[tauri::command]
pub fn record_tool_usage(payload: RecordToolUsagePayload, app: AppHandle) -> Result<(), String> {
    let conn = open_database(&app)?;
    let now_ts = current_unix_timestamp();
    conn.execute(
        "INSERT INTO tool_last_usage (tool_key, file_name, used_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(tool_key) DO UPDATE SET
           file_name = excluded.file_name,
           used_at = excluded.used_at",
        params![payload.tool_key, payload.file_name, now_ts],
    )
    .map_err(|err| format!("写入最近使用记录失败：{err}"))?;
    Ok(())
}

#[tauri::command]
pub fn clear_local_user_data(app: AppHandle) -> Result<(), String> {
    let conn = open_database(&app)?;
    conn.execute("DELETE FROM tool_last_usage", [])
        .map_err(|err| format!("清除使用记录失败：{err}"))?;
    conn.execute("DELETE FROM settings WHERE key = ?1", params![SETTINGS_KEY])
        .map_err(|err| format!("清除设置记录失败：{err}"))?;
    apply_runtime_path_settings(&default_settings());
    Ok(())
}

#[tauri::command]
pub fn get_home_dashboard(app: AppHandle) -> Result<HomeDashboardPayload, String> {
    let conn = open_database(&app)?;

    let stats = HomeStatsPayload {
        total_usage_count: 0,
        today_usage_count: 0,
        total_saved_minutes: 0,
        today_saved_minutes: 0,
    };

    let mut recent_stmt = conn
        .prepare(
            "SELECT rowid, tool_key, file_name, used_at
             FROM tool_last_usage
             ORDER BY used_at DESC, rowid DESC
             LIMIT 3",
        )
        .map_err(|err| format!("准备最近使用语句失败：{err}"))?;

    let recent_rows = recent_stmt
        .query_map([], |row| {
            Ok(HomeRecentUsagePayload {
                id: row.get(0)?,
                tool_key: row.get(1)?,
                file_name: row.get(2)?,
                used_at_ts: row.get(3)?,
            })
        })
        .map_err(|err| format!("读取最近使用数据失败：{err}"))?;

    let mut recent_items = Vec::new();
    for row in recent_rows {
        recent_items.push(row.map_err(|err| format!("解析最近使用数据失败：{err}"))?);
    }

    Ok(HomeDashboardPayload {
        stats,
        recent_items,
        top_tools: Vec::new(),
    })
}

fn default_settings() -> AppSettingsPayload {
    AppSettingsPayload {
        language: "zh-CN".to_string(),
        theme: "system".to_string(),
        window_size: "medium".to_string(),
        favorite_tool_ids: Vec::new(),
        default_output_directory: String::new(),
        task_done_notification_enabled: true,
        launch_on_startup: false,
        minimize_to_tray: false,
        confirm_on_close: true,
        cache_directory: String::new(),
        output_file_naming_rule: "original".to_string(),
        max_concurrent_tasks: 3,
        auto_check_updates: true,
        update_method: "stable".to_string(),
        check_frequency: "daily".to_string(),
        privacy_ux_improvement: true,
        error_reporting_enabled: true,
        ai_path_mode: AI_PATH_MODE_DEFAULT.to_string(),
        ai_runtime_root: String::new(),
        ai_models_root: String::new(),
    }
}

fn default_true() -> bool {
    true
}

fn default_output_naming_rule() -> String {
    "original".to_string()
}

fn default_max_concurrent_tasks() -> u32 {
    3
}

fn default_update_method() -> String {
    "stable".to_string()
}

fn default_check_frequency() -> String {
    "daily".to_string()
}

fn default_ai_path_mode() -> String {
    AI_PATH_MODE_DEFAULT.to_string()
}

fn default_window_size_value() -> String {
    "medium".to_string()
}

pub fn load_saved_settings(app: &AppHandle) -> Result<AppSettingsPayload, String> {
    let conn = open_database(app)?;
    let mut statement = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|err| format!("读取设置失败：{err}"))?;
    let mut rows = statement
        .query(params![SETTINGS_KEY])
        .map_err(|err| format!("查询设置失败：{err}"))?;
    let Some(row) = rows
        .next()
        .map_err(|err| format!("读取设置行失败：{err}"))?
    else {
        return Ok(default_settings());
    };
    let raw_value: String = row
        .get(0)
        .map_err(|err| format!("读取设置字段失败：{err}"))?;
    let mut parsed = serde_json::from_str::<AppSettingsPayload>(&raw_value)
        .map_err(|err| format!("解析设置失败：{err}"))?;
    if parsed.window_size.is_empty() {
        parsed.window_size = "medium".to_string();
    }
    if parsed.max_concurrent_tasks == 0 {
        parsed.max_concurrent_tasks = 3;
    }
    if parsed.ai_path_mode.trim().is_empty() {
        parsed.ai_path_mode = AI_PATH_MODE_DEFAULT.to_string();
    }
    Ok(parsed)
}

pub fn apply_saved_window_size(app: &AppHandle) -> Result<(), String> {
    let settings = load_saved_settings(app)?;
    apply_window_size(app, &settings.window_size)
}

fn open_database(app: &AppHandle) -> Result<Connection, String> {
    let database_path = resolve_database_path(app)?;
    let connection =
        Connection::open(database_path).map_err(|err| format!("打开数据库失败：{err}"))?;
    connection
        .execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA temp_store = MEMORY;",
        )
        .map_err(|err| format!("初始化数据库性能参数失败：{err}"))?;
    initialize_tables(&connection)?;
    Ok(connection)
}

fn apply_window_size(app: &AppHandle, window_size: &str) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    let (width, height) = match window_size {
        "small" => (1100.0, 720.0),
        "large" => (1440.0, 900.0),
        _ => (1200.0, 720.0),
    };
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|err| format!("应用窗口尺寸失败：{err}"))?;
    Ok(())
}

fn resolve_database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("获取应用数据目录失败：{err}"))?;
    fs::create_dir_all(&app_data_dir).map_err(|err| format!("创建数据目录失败：{err}"))?;
    Ok(app_data_dir.join(DATABASE_FILE_NAME))
}

fn initialize_tables(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS tool_last_usage (
                tool_key TEXT PRIMARY KEY,
                file_name TEXT NOT NULL,
                used_at INTEGER NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_tool_last_usage_used_at ON tool_last_usage(used_at DESC);",
        )
        .map_err(|err| format!("初始化数据库结构失败：{err}"))?;
    migrate_legacy_usage_events_if_present(connection)?;
    Ok(())
}

fn migrate_legacy_usage_events_if_present(connection: &Connection) -> Result<(), String> {
    let legacy_exists: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='usage_events'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if legacy_exists == 0 {
        return Ok(());
    }
    connection
        .execute_batch(
            "INSERT OR REPLACE INTO tool_last_usage (tool_key, file_name, used_at)
             SELECT tool_key, file_name, used_at FROM (
                 SELECT tool_key,
                        file_name,
                        used_at,
                        ROW_NUMBER() OVER (
                            PARTITION BY tool_key
                            ORDER BY used_at DESC, id DESC
                        ) AS rn
                 FROM usage_events
             ) ranked
             WHERE rn = 1;
             DROP INDEX IF EXISTS idx_usage_events_used_at;
             DROP INDEX IF EXISTS idx_usage_events_tool_key;
             DROP TABLE IF EXISTS usage_events;",
        )
        .map_err(|err| format!("迁移使用记录表失败：{err}"))?;
    Ok(())
}

fn current_unix_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

pub fn apply_runtime_path_settings(settings: &AppSettingsPayload) {
    apply_ai_path_settings(AiPathSettingsInput {
        mode: settings.ai_path_mode.clone(),
        runtime_root: settings.ai_runtime_root.clone(),
        models_root: settings.ai_models_root.clone(),
    });
}
