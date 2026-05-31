import { createApp } from "vue";
import App from "@/App.vue";
import { registerAuthDeepLinkListener } from "@/auth/register-deep-link";
import { registerAppPlugins } from "@/plugins";
import { i18n } from "@/i18n";
import { useAuthStore } from "@/stores/auth.store";
import { useAppConfirmDialogStore } from "@/stores/appConfirmDialog.store";
import { useSettingsStore } from "@/stores/settings.store";
import {
  executeUpdateInstall,
  mapUpdateInstallError,
  markAutoUpdatePromptShown,
  resolveUpdateInstallAction,
  runDesktopUpdateCheck,
} from "@/modules/app-updates/orchestrator";
import { APP_VERSION } from "@/config/appVersion";
import "@/styles/base.css";

const app = createApp(App);
registerAppPlugins(app);

const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const appConfirmDialogStore = useAppConfirmDialogStore();

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
    currentVersion: APP_VERSION,
    locale,
  }).catch(() => ({ status: "skipped" as const }));

  if (checked.status !== "ok" || !checked.result?.available) return;
  if (resolveUpdateInstallAction(checked.result).type !== "in_app_download_install") return;

  markAutoUpdatePromptShown();
  const shouldInstall = await appConfirmDialogStore.show({
    title: i18n.global.t("pages.settings.dashboard.autoUpdatePromptTitle"),
    message: i18n.global.t("pages.settings.dashboard.autoUpdatePromptBody", {
      version: checked.result.latestVersion,
    }),
    confirmLabel: i18n.global.t("pages.settings.dashboard.updateNow"),
    cancelLabel: i18n.global.t("pages.settings.dashboard.closeModal"),
  });
  if (!shouldInstall) return;

  try {
    await executeUpdateInstall(checked.result);
  } catch (error) {
    const { message } = await import("@tauri-apps/plugin-dialog");
    await message(i18n.global.t(`pages.settings.dashboard.updateInstallError.${mapUpdateInstallError(error)}`), {
      title: i18n.global.t("pages.settings.dashboard.updateInstallFailedTitle"),
    });
  }
}

void bootstrap();
