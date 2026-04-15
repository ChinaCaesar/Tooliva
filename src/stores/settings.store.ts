import { defineStore } from "pinia";
import { isTauri } from "@tauri-apps/api/core";
import { i18n } from "@/i18n";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "@/config/constants";
import { localStorageService } from "@/storage/localStorage";
import { tauriClient } from "@/bridge/tauriClient";
import type { AppLanguage, UserSettings } from "@/types/settings";

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
    setDefaultOutputDirectory(path: string): void {
      this.defaultOutputDirectory = path;
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
    async hydrate(): Promise<void> {
      const saved = await this.loadPersistedSettings();
      this.$patch(saved);
      i18n.global.locale.value = saved.language;
    },
    async persist(): Promise<void> {
      const payload = {
        language: this.language,
        theme: this.theme,
        favoriteToolIds: this.favoriteToolIds,
        defaultOutputDirectory: this.defaultOutputDirectory
      };
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
        return localStorageService.get(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
      }
      try {
        const sqliteSettings = await tauriClient.getAppSettings();
        localStorageService.set(SETTINGS_STORAGE_KEY, sqliteSettings);
        return sqliteSettings;
      } catch {
        return localStorageService.get(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
      }
    }
  }
});
