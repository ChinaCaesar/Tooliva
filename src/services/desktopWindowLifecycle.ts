import { isTauri } from "@tauri-apps/api/core";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { TrayIcon, type TrayIconEvent } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";
import { i18n } from "@/i18n";
import { useAppConfirmDialogStore } from "@/stores/appConfirmDialog.store";
import { useSettingsStore } from "@/stores/settings.store";
import { focusMainWindow } from "@/utils/windowControl";

const TRAY_ID = "tooliva-main-tray";

let trayIcon: TrayIcon | null = null;
let closeListenerRegistered = false;
let closeInProgress = false;
let lifecycleStarted = false;
let unlistenCloseRequested: (() => void) | null = null;

function trayLabels() {
  const { t } = i18n.global;
  return {
    show: t("pages.settings.dashboard.trayMenuShow"),
    quit: t("pages.settings.dashboard.trayMenuQuit"),
    tooltip: t("pages.settings.dashboard.trayTooltip"),
  };
}

async function showMainWindowFromTray(): Promise<void> {
  await focusMainWindow();
}

async function quitApplication(): Promise<void> {
  await exit(0);
}

async function hideMainWindowToTray(): Promise<void> {
  await getCurrentWindow().hide();
}

async function buildTrayMenu() {
  const labels = trayLabels();
  return Menu.new({
    items: [
      await MenuItem.new({
        id: `${TRAY_ID}-show`,
        text: labels.show,
        action: () => {
          void showMainWindowFromTray();
        },
      }),
      await MenuItem.new({
        id: `${TRAY_ID}-quit`,
        text: labels.quit,
        action: () => {
          void quitApplication();
        },
      }),
    ],
  });
}

function onTrayIconEvent(event: TrayIconEvent): void {
  if (event.type === "DoubleClick") {
    void showMainWindowFromTray();
  }
}

async function destroyTrayIcon(): Promise<void> {
  if (!trayIcon) return;
  const current = trayIcon;
  trayIcon = null;
  await current.close();
}

async function syncTrayIcon(enabled: boolean): Promise<void> {
  if (!isTauri()) return;

  if (!enabled) {
    await destroyTrayIcon();
    return;
  }

  const labels = trayLabels();
  const menu = await buildTrayMenu();
  const icon = await defaultWindowIcon();

  if (trayIcon) {
    await trayIcon.setMenu(menu);
    await trayIcon.setTooltip(labels.tooltip);
    return;
  }

  trayIcon = await TrayIcon.new({
    id: TRAY_ID,
    icon: icon ?? undefined,
    tooltip: labels.tooltip,
    menu,
    showMenuOnLeftClick: false,
    action: onTrayIconEvent,
  });
}

export async function requestAppClose(): Promise<void> {
  if (!isTauri() || closeInProgress) return;

  closeInProgress = true;
  try {
    const settingsStore = useSettingsStore();
    const { minimizeToTray, confirmOnClose } = settingsStore;

    if (confirmOnClose) {
      const dialogStore = useAppConfirmDialogStore();
      const { t } = i18n.global;
      const confirmed = await dialogStore.show({
        title: minimizeToTray
          ? t("pages.settings.dashboard.closeConfirmTrayTitle")
          : t("pages.settings.dashboard.closeConfirmQuitTitle"),
        message: minimizeToTray
          ? t("pages.settings.dashboard.closeConfirmTrayMessage")
          : t("pages.settings.dashboard.closeConfirmQuitMessage"),
        confirmLabel: minimizeToTray
          ? t("pages.settings.dashboard.closeConfirmTrayConfirm")
          : t("pages.settings.dashboard.closeConfirmQuitConfirm"),
        cancelLabel: t("pages.settings.dashboard.closeConfirmCancel"),
      });
      if (!confirmed) return;
    }

    if (minimizeToTray) {
      if (!trayIcon) {
        await syncTrayIcon(true);
      }
      if (trayIcon) {
        await hideMainWindowToTray();
        return;
      }
    }

    await quitApplication();
  } finally {
    closeInProgress = false;
  }
}

async function registerCloseRequestedListener(): Promise<void> {
  if (!isTauri() || closeListenerRegistered) return;

  const window = getCurrentWindow();
  unlistenCloseRequested = await window.onCloseRequested(async (event) => {
    event.preventDefault();
    await requestAppClose();
  });
  closeListenerRegistered = true;
}

export async function startDesktopWindowLifecycle(): Promise<void> {
  if (!isTauri() || lifecycleStarted) return;
  lifecycleStarted = true;

  const settingsStore = useSettingsStore();
  await registerCloseRequestedListener();
  await syncTrayIcon(settingsStore.minimizeToTray);

  settingsStore.$subscribe((_mutation, state) => {
    void syncTrayIcon(state.minimizeToTray);
  });
}

export async function stopDesktopWindowLifecycle(): Promise<void> {
  unlistenCloseRequested?.();
  unlistenCloseRequested = null;
  closeListenerRegistered = false;
  lifecycleStarted = false;
  await destroyTrayIcon();
}
