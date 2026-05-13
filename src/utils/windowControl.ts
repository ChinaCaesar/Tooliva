import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

function warn(message: string, error?: unknown): void {
  console.warn(`[windowControl] ${message}`, error);
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
    await getCurrentWindow().close();
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
