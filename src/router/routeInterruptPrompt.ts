import { getActivePinia } from "pinia";
import { i18n } from "@/i18n";
import { useAppConfirmDialogStore } from "@/stores/appConfirmDialog.store";

export async function requestRouteInterruptConfirmation(message: string): Promise<boolean> {
  if (!getActivePinia()) {
    return globalThis.confirm(message);
  }

  const isZh = String(i18n.global.locale.value).startsWith("zh");
  return useAppConfirmDialogStore().show({
    title: isZh ? "中断当前任务？" : "Interrupt current task?",
    message,
    confirmLabel: isZh ? "确定切换" : "Switch page",
    cancelLabel: isZh ? "留在当前页" : "Stay here"
  });
}
