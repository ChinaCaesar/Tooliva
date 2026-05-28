import { defineStore } from "pinia";

interface OpenPayload {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

interface DialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

export const useEntitlementUpgradeDialogStore = defineStore("entitlement-upgrade-dialog", {
  state: (): DialogState => ({
    open: false,
    title: "",
    message: "",
    confirmLabel: "",
    cancelLabel: ""
  }),
  actions: {
    show(payload: OpenPayload): Promise<boolean> {
      this.open = true;
      this.title = payload.title;
      this.message = payload.message;
      this.confirmLabel = payload.confirmLabel;
      this.cancelLabel = payload.cancelLabel;
      return new Promise<boolean>((resolve) => {
        const onConfirm = () => {
          cleanup();
          resolve(true);
        };
        const onCancel = () => {
          cleanup();
          resolve(false);
        };
        const cleanup = () => {
          stopConfirmHook();
          stopCancelHook();
          this.open = false;
        };
        const stopConfirmHook = this.$onAction(({ name, after }) => {
          if (name !== "confirm") return;
          after(onConfirm);
        });
        const stopCancelHook = this.$onAction(({ name, after }) => {
          if (name !== "cancel") return;
          after(onCancel);
        });
      });
    },
    confirm(): void {
      // handled by action hooks
    },
    cancel(): void {
      // handled by action hooks
    }
  }
});
