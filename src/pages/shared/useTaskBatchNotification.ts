import { useI18n } from "vue-i18n";
import { useNotificationStore } from "@/stores/notification.store";
import { useSettingsStore } from "@/stores/settings.store";

export interface TaskBatchSummary {
  total: number;
  success: number;
  failed: number;
  elapsedMs: number;
}

function taskSuccessAudioUrl(): string {
  const raw = import.meta.env.BASE_URL || "/";
  const base = raw.endsWith("/") ? raw : `${raw}/`;
  return `${base}resources/aud/success.mp3`;
}

function playBatchSuccessSound(): void {
  try {
    const audio = new Audio(taskSuccessAudioUrl());
    audio.volume = 0.85;
    void audio.play().catch(() => {
      /* autoplay policy or missing file */
    });
  } catch {
    /* ignore */
  }
}

/**
 * 为批量任务提供统一的完成通知入口。
 */
export function useTaskBatchNotification() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const notificationStore = useNotificationStore();

  /**
   * 在批次结束时于页面顶部居中展示总结提示（受「任务完成提醒」设置控制）。
   */
  function notifyTaskBatchCompleted(toolTitleKey: string, summary: TaskBatchSummary, elapsedLabel: string): void {
    if (!settingsStore.taskDoneNotificationEnabled) return;
    if (summary.failed === 0 && summary.success > 0) {
      playBatchSuccessSound();
    }
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
