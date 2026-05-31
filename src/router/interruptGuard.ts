import type { RouteInterruptRegistration } from "@/stores/routeInterrupt.store";
import { useRouteInterruptStore } from "@/stores/routeInterrupt.store";
import { requestRouteInterruptConfirmation } from "@/router/routeInterruptPrompt";

type InterruptWindow = typeof globalThis & {
  __toolivaRouteInterruptRegistration?: RouteInterruptRegistration | null;
};

function interruptWindow(): InterruptWindow {
  return globalThis as InterruptWindow;
}

export function setRouteInterruptRegistration(registration: RouteInterruptRegistration | null): void {
  interruptWindow().__toolivaRouteInterruptRegistration = registration;
  useRouteInterruptStore().setActive(registration);
}

export function clearRouteInterruptRegistration(id: string): void {
  if (interruptWindow().__toolivaRouteInterruptRegistration?.id === id) {
    interruptWindow().__toolivaRouteInterruptRegistration = null;
  }
  useRouteInterruptStore().clearActive(id);
}

export async function runRouteInterruptCheck(): Promise<boolean> {
  const winRegistration = interruptWindow().__toolivaRouteInterruptRegistration;
  if (winRegistration) {
    if (!winRegistration.when()) return true;
    const confirmed = await requestRouteInterruptConfirmation(winRegistration.message());
    if (!confirmed) return false;
    try {
      await winRegistration.interrupt();
      useRouteInterruptStore().bypassOnce = true;
      return true;
    } catch {
      return false;
    }
  }
  return useRouteInterruptStore().runCheck();
}
