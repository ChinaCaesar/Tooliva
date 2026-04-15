import { defineStore } from "pinia";
import { i18n } from "@/i18n";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "@/config/constants";
import { localStorageService } from "@/storage/localStorage";
import type { AppLanguage, UserSettings } from "@/types/settings";

export const useSettingsStore = defineStore("settings", {
  state: (): UserSettings => localStorageService.get(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS),
  actions: {
    /**
     * 切换语言并同步到 i18n。
     */
    setLanguage(language: AppLanguage): void {
      this.language = language;
      i18n.global.locale.value = language;
      this.persist();
    },
    setTheme(theme: UserSettings["theme"]): void {
      this.theme = theme;
      this.persist();
    },
    setDefaultOutputDirectory(path: string): void {
      this.defaultOutputDirectory = path;
      this.persist();
    },
    toggleFavorite(toolId: string): void {
      if (this.favoriteToolIds.includes(toolId)) {
        this.favoriteToolIds = this.favoriteToolIds.filter((id) => id !== toolId);
      } else {
        this.favoriteToolIds = [...this.favoriteToolIds, toolId];
      }
      this.persist();
    },
    hydrate(): void {
      const saved = localStorageService.get(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
      this.$patch(saved);
      i18n.global.locale.value = saved.language;
    },
    persist(): void {
      localStorageService.set(SETTINGS_STORAGE_KEY, {
        language: this.language,
        theme: this.theme,
        favoriteToolIds: this.favoriteToolIds,
        defaultOutputDirectory: this.defaultOutputDirectory
      });
    }
  }
});
