use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, LogicalSize, Manager};

const SETTINGS_KEY: &str = "user_settings";
const DATABASE_FILE_NAME: &str = "desktop_toolbox.db";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsPayload {
    pub language: String,
    pub theme: String,
    #[serde(default = "default_window_size_value")]
    pub window_size: String,
    pub favorite_tool_ids: Vec<String>,
    pub default_output_directory: String,
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
    let serialized = serde_json::to_string(&payload).map_err(|err| format!("序列化设置失败：{err}"))?;
    let now_ts = current_unix_timestamp();
    conn.execute(
        "INSERT INTO settings (key, value, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![SETTINGS_KEY, serialized, now_ts],
    )
    .map_err(|err| format!("保存设置失败：{err}"))?;
    apply_window_size(&app, &payload.window_size)?;
    Ok(())
}

#[tauri::command]
pub fn record_tool_usage(payload: RecordToolUsagePayload, app: AppHandle) -> Result<(), String> {
    let conn = open_database(&app)?;
    let now_ts = current_unix_timestamp();
    let saved_seconds = payload.saved_seconds.max(0);
    conn.execute(
        "INSERT INTO usage_events (tool_key, file_name, saved_seconds, used_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![payload.tool_key, payload.file_name, saved_seconds, now_ts],
    )
    .map_err(|err| format!("写入使用记录失败：{err}"))?;
    Ok(())
}

#[tauri::command]
pub fn get_home_dashboard(app: AppHandle) -> Result<HomeDashboardPayload, String> {
    let conn = open_database(&app)?;

    let mut stats_stmt = conn
        .prepare(
            "SELECT
                COUNT(*) AS total_usage_count,
                COALESCE(SUM(saved_seconds), 0) AS total_saved_seconds,
                SUM(CASE WHEN date(used_at, 'unixepoch', 'localtime') = date('now', 'localtime') THEN 1 ELSE 0 END) AS today_usage_count,
                COALESCE(SUM(CASE WHEN date(used_at, 'unixepoch', 'localtime') = date('now', 'localtime') THEN saved_seconds ELSE 0 END), 0) AS today_saved_seconds
             FROM usage_events",
        )
        .map_err(|err| format!("准备统计语句失败：{err}"))?;

    let stats = stats_stmt
        .query_row([], |row| {
            let total_usage_count: i64 = row.get(0)?;
            let total_saved_seconds: i64 = row.get(1)?;
            let today_usage_count: i64 = row.get(2)?;
            let today_saved_seconds: i64 = row.get(3)?;
            Ok(HomeStatsPayload {
                total_usage_count,
                today_usage_count,
                total_saved_minutes: convert_seconds_to_minutes(total_saved_seconds),
                today_saved_minutes: convert_seconds_to_minutes(today_saved_seconds),
            })
        })
        .map_err(|err| format!("读取统计数据失败：{err}"))?;

    let mut recent_stmt = conn
        .prepare(
            "SELECT id, tool_key, file_name, used_at
             FROM usage_events
             ORDER BY used_at DESC, id DESC
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

    let mut top_stmt = conn
        .prepare(
            "SELECT tool_key, COUNT(*) AS usage_count
             FROM usage_events
             GROUP BY tool_key
             ORDER BY usage_count DESC, tool_key ASC
             LIMIT 5",
        )
        .map_err(|err| format!("准备高频工具语句失败：{err}"))?;
    let top_rows = top_stmt
        .query_map([], |row| {
            Ok(HomeTopToolPayload {
                tool_key: row.get(0)?,
                usage_count: row.get(1)?,
            })
        })
        .map_err(|err| format!("读取高频工具数据失败：{err}"))?;

    let mut top_tools = Vec::new();
    for row in top_rows {
        top_tools.push(row.map_err(|err| format!("解析高频工具数据失败：{err}"))?);
    }

    Ok(HomeDashboardPayload {
        stats,
        recent_items,
        top_tools,
    })
}

fn default_settings() -> AppSettingsPayload {
    AppSettingsPayload {
        language: "zh-CN".to_string(),
        theme: "system".to_string(),
        window_size: "medium".to_string(),
        favorite_tool_ids: Vec::new(),
        default_output_directory: String::new(),
    }
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
    let Some(row) = rows.next().map_err(|err| format!("读取设置行失败：{err}"))? else {
        return Ok(default_settings());
    };
    let raw_value: String = row.get(0).map_err(|err| format!("读取设置字段失败：{err}"))?;
    let mut parsed =
        serde_json::from_str::<AppSettingsPayload>(&raw_value).map_err(|err| format!("解析设置失败：{err}"))?;
    if parsed.window_size.is_empty() {
        parsed.window_size = "medium".to_string();
    }
    Ok(parsed)
}

pub fn apply_saved_window_size(app: &AppHandle) -> Result<(), String> {
    let settings = load_saved_settings(app)?;
    apply_window_size(app, &settings.window_size)
}

fn open_database(app: &AppHandle) -> Result<Connection, String> {
    let database_path = resolve_database_path(app)?;
    let connection = Connection::open(database_path).map_err(|err| format!("打开数据库失败：{err}"))?;
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
        _ => (1280.0, 800.0),
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
             CREATE TABLE IF NOT EXISTS usage_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tool_key TEXT NOT NULL,
                file_name TEXT NOT NULL,
                saved_seconds INTEGER NOT NULL,
                used_at INTEGER NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_usage_events_used_at ON usage_events(used_at DESC);
             CREATE INDEX IF NOT EXISTS idx_usage_events_tool_key ON usage_events(tool_key);",
        )
        .map_err(|err| format!("初始化数据库结构失败：{err}"))?;
    Ok(())
}

fn current_unix_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

fn convert_seconds_to_minutes(seconds: i64) -> i64 {
    if seconds <= 0 {
        return 0;
    }
    (seconds + 59) / 60
}
