import { onBeforeUnmount, watchEffect } from "vue";
import { clearRouteInterruptRegistration, setRouteInterruptRegistration } from "@/router/interruptGuard";

interface UseInterruptOnRouteLeaveOptions {
  when: () => boolean;
  message: () => string;
  interrupt: () => Promise<void> | void;
}

export function useInterruptOnRouteLeave(options: UseInterruptOnRouteLeaveOptions): void {
  const registrationId = crypto.randomUUID();

  watchEffect(() => {
    setRouteInterruptRegistration({
      id: registrationId,
      when: options.when,
      message: options.message,
      interrupt: options.interrupt
    });
  });

  onBeforeUnmount(() => {
    clearRouteInterruptRegistration(registrationId);
  });
}
