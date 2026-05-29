import { createApp } from "vue";
import App from "@/App.vue";
import { registerAuthDeepLinkListener } from "@/auth/register-deep-link";
import { registerAppPlugins } from "@/plugins";
import { i18n } from "@/i18n";
import { useAuthStore } from "@/stores/auth.store";
import { useSettingsStore } from "@/stores/settings.store";
import {
  installUpdateWithTauri,
  mapUpdateInstallError,
  markAutoUpdatePromptShown,
  runDesktopUpdateCheck,
} from "@/modules/app-updates/orchestrator";
import "@/styles/base.css";

const app = createApp(App);
registerAppPlugins(app);

const settingsStore = useSettingsStore();
const authStore = useAuthStore();

/**
 * 应用启动前先同步用户配置，避免首屏出现语言/设置闪动。
 */
async function bootstrap(): Promise<void> {
  await settingsStore.hydrate();
  authStore.hydrate();
  await authStore.validateStoredSession();
  await registerAuthDeepLinkListener();
  app.mount("#app");
  void bootstrapAutoUpdateCheck();
}

async function bootstrapAutoUpdateCheck(): Promise<void> {
  const locale = settingsStore.language;
  const checked = await runDesktopUpdateCheck({
    trigger: "auto",
    settings: {
      autoCheckUpdates: settingsStore.autoCheckUpdates,
      checkFrequency: settingsStore.checkFrequency,
      updateMethod: settingsStore.updateMethod,
    },
    currentVersion: __APP_VERSION__,
    locale,
  }).catch(() => ({ status: "skipped" as const }));

  if (checked.status !== "ok" || !checked.result?.available) return;

  markAutoUpdatePromptShown();
  const { confirm, message } = await import("@tauri-apps/plugin-dialog");
  const shouldInstall = await confirm(
    i18n.global.t("pages.settings.dashboard.autoUpdatePromptBody", {
      version: checked.result.latestVersion,
    }),
    { title: i18n.global.t("pages.settings.dashboard.autoUpdatePromptTitle") },
  );
  if (!shouldInstall) return;

  try {
    await installUpdateWithTauri();
  } catch (error) {
    await message(i18n.global.t(`pages.settings.dashboard.updateInstallError.${mapUpdateInstallError(error)}`), {
      title: i18n.global.t("pages.settings.dashboard.updateInstallFailedTitle"),
    });
  }
}

void bootstrap();
