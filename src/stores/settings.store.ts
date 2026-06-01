import { defineStore } from "pinia";
import { isTauri } from "@tauri-apps/api/core";
import { i18n } from "@/i18n";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, APP_SIDEBAR_COLLAPSED_STORAGE_KEY, LOCAL_DATA_CLEARED_EVENT } from "@/config/constants";
import { localStorageService } from "@/storage/localStorage";
import { tauriClient } from "@/bridge/tauriClient";
import type { AppLanguage, AppWindowSize, UserSettings } from "@/types/settings";

function buildSettingsPayload(store: UserSettings): UserSettings {
  return {
    language: store.language,
    theme: store.theme,
    windowSize: store.windowSize,
    favoriteToolIds: [...store.favoriteToolIds],
    defaultOutputDirectory: store.defaultOutputDirectory,
    taskDoneNotificationEnabled: store.taskDoneNotificationEnabled,
    launchOnStartup: store.launchOnStartup,
    minimizeToTray: store.minimizeToTray,
    confirmOnClose: store.confirmOnClose,
    cacheDirectory: store.cacheDirectory,
    outputFileNamingRule: store.outputFileNamingRule,
    maxConcurrentTasks: store.maxConcurrentTasks,
    autoCheckUpdates: store.autoCheckUpdates,
    updateMethod: store.updateMethod,
    checkFrequency: store.checkFrequency,
    privacyUxImprovement: store.privacyUxImprovement,
    errorReportingEnabled: store.errorReportingEnabled,
    aiPathMode: store.aiPathMode,
    aiRuntimeRoot: store.aiRuntimeRoot,
    aiModelsRoot: store.aiModelsRoot
  };
}

export const useSettingsStore = defineStore("settings", {
  state: (): UserSettings => ({ ...DEFAULT_SETTINGS }),
  actions: {
    /**
     * 切换语言并同步到 i18n。
     */
    setLanguage(language: AppLanguage): void {
      this.language = language;
      i18n.global.locale.value = language;
      void this.persist();
    },
    setTheme(theme: UserSettings["theme"]): void {
      this.theme = theme;
      void this.persist();
    },
    /**
     * 更新应用窗口尺寸档位并立即持久化。
     */
    setWindowSize(windowSize: AppWindowSize): void {
      this.windowSize = windowSize;
      void this.persist();
    },
    setDefaultOutputDirectory(path: string): void {
      this.defaultOutputDirectory = path;
      void this.persist();
    },
    setCacheDirectory(path: string): void {
      this.cacheDirectory = path;
      void this.persist();
    },
    /**
     * 控制批量任务完成后是否展示右上角提醒。
     */
    setTaskDoneNotificationEnabled(enabled: boolean): void {
      this.taskDoneNotificationEnabled = enabled;
      void this.persist();
    },
    toggleFavorite(toolId: string): void {
      if (this.favoriteToolIds.includes(toolId)) {
        this.favoriteToolIds = this.favoriteToolIds.filter((id) => id !== toolId);
      } else {
        this.favoriteToolIds = [...this.favoriteToolIds, toolId];
      }
      void this.persist();
    },
    patchSettings(partial: Partial<UserSettings>): void {
      this.$patch(partial);
      void this.persist();
    },
    async updateSettings(partial: Partial<UserSettings>): Promise<void> {
      this.$patch(partial);
      await this.persist();
    },
    /**
     * 清除本机用户数据：SQLite 中的使用记录与设置、Web 层 localStorage 辅助项，
     * 然后将偏好恢复为默认值并持久化（Tauri 会重新写入默认设置）。
     */
    async clearAllLocalUserData(): Promise<void> {
      if (isTauri()) {
        try {
          await tauriClient.clearLocalUserData();
        } catch {
          /* 仍尝试重置偏好与本地缓存 */
        }
        try {
          localStorage.removeItem(APP_SIDEBAR_COLLAPSED_STORAGE_KEY);
          localStorage.removeItem(SETTINGS_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      } else {
        try {
          localStorage.clear();
        } catch {
          /* ignore */
        }
      }
      this.$patch({ ...DEFAULT_SETTINGS });
      i18n.global.locale.value = this.language;
      await this.persist();
      try {
        globalThis.dispatchEvent(new CustomEvent(LOCAL_DATA_CLEARED_EVENT));
      } catch {
        /* ignore */
      }
    },
    /**
     * 将本地偏好恢复为默认值并写回持久化层（不清除使用记录）。
     */
    async resetToDefaultSettings(): Promise<void> {
      this.$patch({ ...DEFAULT_SETTINGS });
      i18n.global.locale.value = this.language;
      await this.persist();
    },
    async hydrate(): Promise<void> {
      const saved = await this.loadPersistedSettings();
      const normalized = { ...DEFAULT_SETTINGS, ...saved };
      this.$patch(normalized);
      i18n.global.locale.value = normalized.language;
    },
    async persist(): Promise<void> {
      const payload = buildSettingsPayload(this.$state);
      if (!isTauri()) {
        localStorageService.set(SETTINGS_STORAGE_KEY, payload);
        return;
      }
      try {
        await tauriClient.saveAppSettings(payload);
      } catch {
        localStorageService.set(SETTINGS_STORAGE_KEY, payload);
      }
    },
    async loadPersistedSettings(): Promise<UserSettings> {
      if (!isTauri()) {
        return { ...DEFAULT_SETTINGS, ...localStorageService.get(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS) };
      }
      try {
        const sqliteSettings = await tauriClient.getAppSettings();
        localStorageService.set(SETTINGS_STORAGE_KEY, sqliteSettings);
        return { ...DEFAULT_SETTINGS, ...sqliteSettings };
      } catch {
        return { ...DEFAULT_SETTINGS, ...localStorageService.get(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS) };
      }
    }
  }
});
