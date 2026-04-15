export const LANGUAGES = ["zh-CN", "en-US"] as const;
export type AppLanguage = (typeof LANGUAGES)[number];

export type ThemeMode = "system" | "light" | "dark";

export interface UserSettings {
  language: AppLanguage;
  theme: ThemeMode;
  favoriteToolIds: string[];
  defaultOutputDirectory: string;
}
