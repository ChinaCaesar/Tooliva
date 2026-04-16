import { useI18n } from "vue-i18n";
import { useNotificationStore } from "@/stores/notification.store";
import { useSettingsStore } from "@/stores/settings.store";

export interface TaskBatchSummary {
  total: number;
  success: number;
  failed: number;
  elapsedMs: number;
}

/**
 * 为批量任务提供统一的完成通知入口。
 */
export function useTaskBatchNotification() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const notificationStore = useNotificationStore();

  /**
   * 在批次结束时弹出右上角总结提示。
   */
  function notifyTaskBatchCompleted(toolTitleKey: string, summary: TaskBatchSummary, elapsedLabel: string): void {
    if (!settingsStore.taskDoneNotificationEnabled) return;
    notificationStore.showNotification({
      tone: summary.failed > 0 ? "warning" : "success",
      title: t("common.taskCompleteTitle"),
      highlights: [
        {
          id: "total",
          label: t("common.total"),
          value: String(summary.total),
          tone: "info"
        },
        {
          id: "success",
          label: t("common.success"),
          value: String(summary.success),
          tone: "success"
        },
        {
          id: "failed",
          label: t("common.failed"),
          value: String(summary.failed),
          tone: summary.failed > 0 ? "error" : "info"
        },
        {
          id: "elapsed",
          label: t("common.elapsed"),
          value: elapsedLabel,
          tone: "warning"
        }
      ],
      message: t("common.taskCompleteMessage", {
        tool: t(toolTitleKey),
        total: summary.total,
        success: summary.success,
        failed: summary.failed,
        elapsed: elapsedLabel
      })
    });
  }

  return {
    notifyTaskBatchCompleted
  };
}
