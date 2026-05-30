import type { AppLanguage, UserSettings, WindowSizeOption } from "@/types/settings";

export const APP_NAME = "Desktop Toolbox";
export const SETTINGS_STORAGE_KEY = "desktop-toolbox:user-settings";
/** 应用壳侧栏折叠状态（仅 Web 层；Tauri 设置存 SQLite）。 */
export const APP_SIDEBAR_COLLAPSED_STORAGE_KEY = "desktop-toolbox:app-sidebar-collapsed";
/** 清除本地数据后广播，供首页等刷新仅内存态。 */
export const LOCAL_DATA_CLEARED_EVENT = "desktop-toolbox:local-data-cleared";

/** 官网地址（开发环境默认 localhost:4322） */
export const WEBSITE_URL =
  import.meta.env.VITE_WEBSITE_URL
  ?? import.meta.env.PUBLIC_SITE_URL
  ?? "http://localhost:4322";

const API_ORIGIN = import.meta.env.PUBLIC_API_ORIGIN as string | undefined;
const API_BASE_PATH = import.meta.env.PUBLIC_API_BASE_PATH as string | undefined;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL
  ?? (API_ORIGIN && API_BASE_PATH ? `${API_ORIGIN.replace(/\/$/, "")}${API_BASE_PATH.startsWith("/") ? API_BASE_PATH : `/${API_BASE_PATH}`}` : undefined)
  ?? `${WEBSITE_URL.replace(/\/$/, "")}/api`;

function normalizeAiRuntimeUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "example.com" || parsed.hostname.endsWith(".example.com")) {
      return "";
    }
    return parsed.toString();
  } catch {
    return /(^|:\/\/)(?:www\.)?example\.com(?:[/:]|$)/i.test(trimmed) ? "" : trimmed;
  }
}

export const AI_RUNTIME_MANIFEST_URL = normalizeAiRuntimeUrl(import.meta.env.VITE_AI_RUNTIME_MANIFEST_URL as string | undefined);
export const AI_RUNTIME_BASE_URL = normalizeAiRuntimeUrl(import.meta.env.VITE_AI_RUNTIME_BASE_URL as string | undefined);
export const AI_RUNTIME_ENABLED = `${import.meta.env.VITE_AI_RUNTIME_ENABLED ?? "true"}`.trim().toLowerCase() !== "false";
export const AI_RUNTIME_MIN_FREE_DISK_GB = Number(import.meta.env.VITE_AI_RUNTIME_MIN_FREE_DISK_GB ?? "8");
export const AI_RUNTIME_PACKAGE_CHANNEL = (import.meta.env.VITE_AI_RUNTIME_PACKAGE_CHANNEL as string | undefined)?.trim() || "stable";
export const AUTH_DESKTOP_CLIENT = "desktop";
export const AUTH_REDIRECT_URI = "tooliva://auth/callback";
export const AUTH_SESSION_STORAGE_KEY = "desktop-toolbox:auth-session";
export const AUTH_PKCE_STORAGE_KEY = "desktop-toolbox:auth-pkce";
export const AUTH_LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

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
  videoWatermarkRemoval: "/video-watermark-removal",
  imageWatermark: "/image-watermark",
  gifCompress: "/gif-compress",
  tools: "/tools",
  favorites: "/favorites",
  tasks: "/tasks",
  settings: "/settings",
  membership: "/membership"
} as const;
