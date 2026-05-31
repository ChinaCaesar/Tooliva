import { defineStore } from "pinia";
import { requestRouteInterruptConfirmation } from "@/router/routeInterruptPrompt";

export interface RouteInterruptRegistration {
  id: string;
  when: () => boolean;
  message: () => string;
  interrupt: () => Promise<void> | void;
}

interface RouteInterruptState {
  active: RouteInterruptRegistration | null;
  bypassOnce: boolean;
}

export const useRouteInterruptStore = defineStore("routeInterrupt", {
  state: (): RouteInterruptState => ({
    active: null,
    bypassOnce: false
  }),
  actions: {
    setActive(registration: RouteInterruptRegistration | null): void {
      this.active = registration;
    },
    clearActive(id: string): void {
      if (this.active?.id === id) {
        this.active = null;
      }
    },
    async runCheck(): Promise<boolean> {
      if (this.bypassOnce) {
        this.bypassOnce = false;
        return true;
      }
      if (!this.active || !this.active.when()) {
        return true;
      }

      const confirmed = await requestRouteInterruptConfirmation(this.active.message());
      if (!confirmed) return false;

      try {
        await this.active.interrupt();
        this.bypassOnce = true;
        return true;
      } catch {
        return false;
      }
    }
  }
});
