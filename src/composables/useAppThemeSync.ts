import { watch, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/stores/settings.store";
import type { ThemeMode } from "@/types/settings";

function effectiveTheme(theme: ThemeMode): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme === "dark" ? "dark" : "light";
}

function applyThemeClass(theme: ThemeMode): void {
  const mode = effectiveTheme(theme);
  document.documentElement.dataset.theme = mode;
  document.documentElement.classList.toggle("theme-dark", mode === "dark");
}

/**
 * 将 Pinia 中的主题偏好同步到 `document.documentElement`，供全局样式使用。
 */
export function useAppThemeSync(): void {
  const settingsStore = useSettingsStore();
  const { theme } = storeToRefs(settingsStore);

  let mql: MediaQueryList | null = null;
  const onSystemChange = (): void => {
    if (theme.value === "system") {
      applyThemeClass("system");
    }
  };

  watch(theme, (v) => applyThemeClass(v), { immediate: true });

  onMounted(() => {
    mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", onSystemChange);
    applyThemeClass(theme.value);
  });

  onUnmounted(() => {
    mql?.removeEventListener("change", onSystemChange);
  });
}
