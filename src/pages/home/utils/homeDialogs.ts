import { isTauri } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";

/**
 * 首页占位提示：桌面端使用 Tauri 原生对话框，浏览器回退到 `alert`。
 */
export async function showHomeInfoDialog(body: string, title: string): Promise<void> {
  if (isTauri()) {
    await message(body, { title });
    return;
  }
  globalThis.alert(`${title}\n\n${body}`);
}
