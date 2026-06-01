export const LANGUAGES = ["zh-CN", "en-US"] as const;
export type AppLanguage = (typeof LANGUAGES)[number];

export type ThemeMode = "system" | "light" | "dark";
export type AppWindowSize = "small" | "medium" | "large";
export type AiPathMode = "default" | "custom";

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
  taskDoneNotificationEnabled: boolean;
  launchOnStartup: boolean;
  minimizeToTray: boolean;
  confirmOnClose: boolean;
  cacheDirectory: string;
  outputFileNamingRule: string;
  maxConcurrentTasks: number;
  autoCheckUpdates: boolean;
  updateMethod: string;
  checkFrequency: string;
  privacyUxImprovement: boolean;
  errorReportingEnabled: boolean;
  aiPathMode: AiPathMode;
  aiRuntimeRoot: string;
  aiModelsRoot: string;
}
