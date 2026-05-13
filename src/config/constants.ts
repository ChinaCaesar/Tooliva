import type { AppLanguage, UserSettings, WindowSizeOption } from "@/types/settings";

export const APP_NAME = "Desktop Toolbox";
export const SETTINGS_STORAGE_KEY = "desktop-toolbox:user-settings";
/** 应用壳侧栏折叠状态（仅 Web 层；Tauri 设置存 SQLite）。 */
export const APP_SIDEBAR_COLLAPSED_STORAGE_KEY = "desktop-toolbox:app-sidebar-collapsed";
/** 清除本地数据后广播，供首页等刷新仅内存态。 */
export const LOCAL_DATA_CLEARED_EVENT = "desktop-toolbox:local-data-cleared";

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
    width: 1200,
    height: 720,
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
  taskDoneNotificationEnabled: true,
  launchOnStartup: false,
  minimizeToTray: false,
  confirmOnClose: true,
  cacheDirectory: "",
  outputFileNamingRule: "original",
  maxConcurrentTasks: 3,
  autoCheckUpdates: true,
  updateMethod: "stable",
  checkFrequency: "daily",
  privacyUxImprovement: true,
  errorReportingEnabled: true
};

export const ROUTE_PATHS = {
  home: "/",
  login: "/login",
  imageCompress: "/image-compress",
  videoToGif: "/video-to-gif",
  imageUpscale: "/image-upscale",
  imageWatermarkRemoval: "/image-watermark-removal",
  imageWatermark: "/image-watermark",
  tools: "/tools",
  favorites: "/favorites",
  tasks: "/tasks",
  settings: "/settings",
  membership: "/membership"
} as const;
