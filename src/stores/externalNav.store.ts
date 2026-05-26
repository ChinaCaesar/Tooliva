import { defineStore } from "pinia";

/**
 * 外跳过渡 Toast 共享状态。仅服务于"分层 ③/④ 外跳前的视觉过渡反馈"语义，
 * 与 `notification.store.ts` 的批次完成通知职责分离。请勿被其他场景复用。
 */

interface ExternalNavState {
  visible: boolean;
  message: string;
  // 仅 store 内部使用；非 null 时表示一个待执行的隐藏计时
  timerId: number | null;
}

const DEFAULT_VISIBLE_MS = 800;

export const useExternalNavStore = defineStore("externalNav", {
  state: (): ExternalNavState => ({
    visible: false,
    message: "",
    timerId: null,
  }),
  actions: {
    /**
     * 覆盖式显示过渡文案；重复调用 MUST 重置计时器而非叠加多个浮层。
     */
    show(message: string, durationMs: number = DEFAULT_VISIBLE_MS): void {
      this.message = message;
      this.visible = true;
      if (this.timerId !== null) {
        globalThis.clearTimeout(this.timerId);
      }
      this.timerId = globalThis.setTimeout(() => {
        this.visible = false;
        this.timerId = null;
      }, durationMs);
    },
    hide(): void {
      this.visible = false;
      if (this.timerId !== null) {
        globalThis.clearTimeout(this.timerId);
        this.timerId = null;
      }
    },
  },
});
