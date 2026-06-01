import { showAppAlert } from "@/utils/appDialog";

/**
 * 首页占位提示统一走应用内自定义弹窗，保持桌面端与浏览器预览一致。
 */
export async function showHomeInfoDialog(body: string, title: string): Promise<void> {
  await showAppAlert({ title, message: body });
}
