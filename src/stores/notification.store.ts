import { defineStore } from "pinia";

export type AppNotificationTone = "success" | "warning" | "error" | "info";

export interface AppNotificationItem {
  id: string;
  title: string;
  message: string;
  tone: AppNotificationTone;
  durationMs: number;
  highlights: AppNotificationHighlight[];
}

interface NotificationState {
  items: AppNotificationItem[];
}

export interface AppNotificationHighlight {
  id: string;
  label: string;
  value: string;
  tone?: AppNotificationTone;
}

interface ShowNotificationPayload {
  title: string;
  message: string;
  tone?: AppNotificationTone;
  durationMs?: number;
  highlights?: AppNotificationHighlight[];
}

const DEFAULT_DURATION_MS = 7200;

export const useNotificationStore = defineStore("notifications", {
  state: (): NotificationState => ({
    items: []
  }),
  actions: {
    /**
     * 添加一条右上角通知，并在默认时长后自动移除。
     */
    showNotification(payload: ShowNotificationPayload): string {
      const notification: AppNotificationItem = {
        id: crypto.randomUUID(),
        title: payload.title,
        message: payload.message,
        tone: payload.tone ?? "info",
        durationMs: payload.durationMs ?? DEFAULT_DURATION_MS,
        highlights: payload.highlights ?? []
      };
      this.items = [notification, ...this.items];

      globalThis.setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.durationMs);

      return notification.id;
    },

    /**
     * 手动关闭指定通知。
     */
    removeNotification(notificationId: string): void {
      this.items = this.items.filter((item) => item.id !== notificationId);
    }
  }
});
