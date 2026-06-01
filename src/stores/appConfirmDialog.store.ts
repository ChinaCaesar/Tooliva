import { defineStore } from "pinia";

export type AppDialogMode = "alert" | "confirm";
export type AppDialogTone = "info" | "warning";

export interface AppConfirmDialogPayload {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  mode?: AppDialogMode;
  tone?: AppDialogTone;
}

interface AppConfirmDialogState extends AppConfirmDialogPayload {
  open: boolean;
  mode: AppDialogMode;
  tone: AppDialogTone;
}

let activeResolver: ((value: boolean) => void) | null = null;

export const useAppConfirmDialogStore = defineStore("app-confirm-dialog", {
  state: (): AppConfirmDialogState => ({
    open: false,
    title: "",
    message: "",
    confirmLabel: "",
    cancelLabel: "",
    mode: "confirm",
    tone: "warning"
  }),
  actions: {
    show(payload: AppConfirmDialogPayload): Promise<boolean> {
      if (activeResolver) {
        activeResolver(false);
        activeResolver = null;
      }

      this.open = true;
      this.title = payload.title;
      this.message = payload.message;
      this.confirmLabel = payload.confirmLabel;
      this.cancelLabel = payload.cancelLabel ?? "";
      this.mode = payload.mode ?? "confirm";
      this.tone = payload.tone ?? "warning";

      return new Promise<boolean>((resolve) => {
        activeResolver = resolve;
      });
    },
    async alert(payload: Omit<AppConfirmDialogPayload, "mode" | "cancelLabel">): Promise<void> {
      await this.show({
        ...payload,
        mode: "alert",
        tone: payload.tone ?? "info"
      });
    },
    confirm(): void {
      activeResolver?.(true);
      activeResolver = null;
      this.open = false;
    },
    cancel(): void {
      activeResolver?.(false);
      activeResolver = null;
      this.open = false;
    },
    close(): void {
      if (this.mode === "alert") {
        this.confirm();
        return;
      }
      this.cancel();
    }
  }
});
