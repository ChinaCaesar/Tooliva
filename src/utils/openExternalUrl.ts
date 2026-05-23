import { isTauri } from "@tauri-apps/api/core";

/**
 * 在 Tauri 桌面端用系统默认浏览器打开 URL；Web 预览环境回退到 window.open。
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }

  const opened = globalThis.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    throw new Error("popup_blocked");
  }
}
