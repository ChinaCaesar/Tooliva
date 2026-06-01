import { i18n } from "@/i18n";
import { showAppConfirm } from "@/utils/appDialog";

export async function requestRouteInterruptConfirmation(message: string): Promise<boolean> {
  const isZh = String(i18n.global.locale.value).startsWith("zh");
  return showAppConfirm({
    title: isZh ? "中断当前任务？" : "Interrupt current task?",
    message,
    confirmLabel: isZh ? "确定切换" : "Switch page",
    cancelLabel: isZh ? "留在当前页" : "Stay here"
  });
}
