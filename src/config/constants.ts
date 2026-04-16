import type { AppLanguage, UserSettings, WindowSizeOption } from "@/types/settings";

export const APP_NAME = "Desktop Toolbox";
export const SETTINGS_STORAGE_KEY = "desktop-toolbox:user-settings";

export const DEFAULT_LANGUAGE: AppLanguage = "zh-CN";
export const WINDOW_SIZE_OPTIONS: WindowSizeOption[] = [
  {
    value: "small",
    width: 1100,
    height: 720,
    descriptionKey: "pages.settings.general.windowSizeSmallDesc"
  },
  {
    value: "medium",
    width: 1280,
    height: 800,
    descriptionKey: "pages.settings.general.windowSizeMediumDesc"
  },
  {
    value: "large",
    width: 1440,
    height: 900,
    descriptionKey: "pages.settings.general.windowSizeLargeDesc"
  }
];

export const DEFAULT_SETTINGS: UserSettings = {
  language: DEFAULT_LANGUAGE,
  theme: "system",
  windowSize: "medium",
  favoriteToolIds: [],
  defaultOutputDirectory: "",
  taskDoneNotificationEnabled: true
};

export const ROUTE_PATHS = {
  home: "/",
  videoConvert: "/video-convert",
  imageCompress: "/image-compress",
  imageUpscale: "/image-upscale",
  imageWatermark: "/image-watermark",
  tools: "/tools",
  favorites: "/favorites",
  tasks: "/tasks",
  settings: "/settings",
  membership: "/membership"
} as const;
