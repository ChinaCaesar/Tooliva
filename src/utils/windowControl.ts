import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow, UserAttentionType } from "@tauri-apps/api/window";

function warn(message: string, error?: unknown): void {
  console.warn(`[windowControl] ${message}`, error);
}

/** 授权回调成功后置前并聚焦主窗口 */
export async function focusMainWindow(): Promise<void> {
  try {
    if (!isTauri()) {
      return;
    }
    const win = getCurrentWindow();
    await win.unminimize();
    await win.show();
    await win.setFocus();
    try {
      await win.requestUserAttention(UserAttentionType.Critical);
    } catch {
      /* 部分平台/权限下可忽略 */
    }
  } catch (e) {
    warn("focusMainWindow failed", e);
  }
}

export async function minimizeWindow(): Promise<void> {
  try {
    if (!isTauri()) {
      warn("minimizeWindow: not running in Tauri");
      return;
    }
    await getCurrentWindow().minimize();
  } catch (e) {
    warn("minimizeWindow failed", e);
  }
}

export async function toggleMaximizeWindow(): Promise<void> {
  try {
    if (!isTauri()) {
      warn("toggleMaximizeWindow: not running in Tauri");
      return;
    }
    await getCurrentWindow().toggleMaximize();
  } catch (e) {
    warn("toggleMaximizeWindow failed", e);
  }
}

export async function closeWindow(): Promise<void> {
  try {
    if (!isTauri()) {
      warn("closeWindow: not running in Tauri");
      return;
    }
    const { requestAppClose } = await import("@/services/desktopWindowLifecycle");
    await requestAppClose();
  } catch (e) {
    warn("closeWindow failed", e);
  }
}

export async function startDragWindow(): Promise<void> {
  try {
    if (!isTauri()) {
      warn("startDragWindow: not running in Tauri");
      return;
    }
    await getCurrentWindow().startDragging();
  } catch (e) {
    warn("startDragWindow failed", e);
  }
}
