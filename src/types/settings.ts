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
}
