export const LANGUAGES = ["zh-CN", "en-US"] as const;
export type AppLanguage = (typeof LANGUAGES)[number];

export type ThemeMode = "system" | "light" | "dark";
export type AppWindowSize = "small" | "medium" | "large";

export interface WindowSizeOption {
  value: AppWindowSize;
  width: number;
  height: number;
  descriptionKey: string;
}

export interface UserSettings {
  language: AppLanguage;
  theme: ThemeMode;
  windowSize: AppWindowSize;
  favoriteToolIds: string[];
  defaultOutputDirectory: string;
  /** 任务完成右上角提醒（已接入业务通知）。 */
  taskDoneNotificationEnabled: boolean;
  /** 开机自启（仅 UI 与持久化，未接系统自启 API）。 */
  launchOnStartup: boolean;
  /** 最小化到托盘（UI 占位，未接 Tauri 托盘）。 */
  minimizeToTray: boolean;
  /** 关闭前确认（UI 占位，未接窗口 close 拦截）。 */
  confirmOnClose: boolean;
  cacheDirectory: string;
  /** 输出文件命名规则键，如 original、timestamp。 */
  outputFileNamingRule: string;
  maxConcurrentTasks: number;
  autoCheckUpdates: boolean;
  updateMethod: string;
  checkFrequency: string;
  /** 用户体验改进计划（遥测占位）。 */
  privacyUxImprovement: boolean;
  errorReportingEnabled: boolean;
}
