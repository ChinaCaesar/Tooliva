import { defineStore } from "pinia";

export interface AppConfirmDialogPayload {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

interface AppConfirmDialogState extends AppConfirmDialogPayload {
  open: boolean;
}

let activeResolver: ((value: boolean) => void) | null = null;

export const useAppConfirmDialogStore = defineStore("app-confirm-dialog", {
  state: (): AppConfirmDialogState => ({
    open: false,
    title: "",
    message: "",
    confirmLabel: "",
    cancelLabel: ""
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
      this.cancelLabel = payload.cancelLabel;

      return new Promise<boolean>((resolve) => {
        activeResolver = resolve;
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
    }
  }
});
