import type { AppLanguage, UserSettings } from "@/types/settings";

export const APP_NAME = "Desktop Toolbox";
export const SETTINGS_STORAGE_KEY = "desktop-toolbox:user-settings";

export const DEFAULT_LANGUAGE: AppLanguage = "zh-CN";

export const DEFAULT_SETTINGS: UserSettings = {
  language: DEFAULT_LANGUAGE,
  theme: "system",
  favoriteToolIds: [],
  defaultOutputDirectory: ""
};

export const ROUTE_PATHS = {
  home: "/",
  videoConvert: "/video-convert",
  imageCompress: "/image-compress",
  imageUpscale: "/image-upscale",
  tools: "/tools",
  favorites: "/favorites",
  tasks: "/tasks",
  settings: "/settings",
  membership: "/membership"
} as const;
