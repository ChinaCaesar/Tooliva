import { onBeforeUnmount, ref, watch, type Ref } from "vue";
import type { BatchProgressPayload, BatchTaskStatus } from "@/modules/batch/types";

const TERMINAL_STATUSES: ReadonlySet<BatchTaskStatus> = new Set([
  "FINISHED",
  "FAILED",
  "CANCELED"
]);

export interface UseTaskElapsedTimerOptions {
  isRunning: Ref<boolean>;
  progress?: Ref<BatchProgressPayload | null>;
}

/**
 * Elapsed seconds for batch-tool bottom bars. Stops ticking when the task leaves
 * RUNNING (via progress terminal status or isRunning), not only when result is fetched.
 */
export function useTaskElapsedTimer(options: UseTaskElapsedTimerOptions) {
  const elapsedSeconds = ref(0);
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;
  let startedAt = 0;

  const stopElapsedTimer = (finalize = true) => {
    if (elapsedTimer != null) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
    if (finalize && startedAt > 0) {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);
    }
  };

  const startElapsedTimer = () => {
    stopElapsedTimer(false);
    elapsedSeconds.value = 0;
    startedAt = Date.now();
    elapsedTimer = setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);
    }, 1000);
  };

  const syncElapsedFromMs = (ms: number) => {
    stopElapsedTimer(false);
    elapsedSeconds.value = Math.max(0, Math.floor(ms / 1000));
    startedAt = Date.now() - elapsedSeconds.value * 1000;
  };

  watch(options.isRunning, (running, wasRunning) => {
    if (wasRunning && !running) {
      stopElapsedTimer();
    }
  });

  if (options.progress) {
    watch(
      () => options.progress!.value?.status,
      (status) => {
        if (status && TERMINAL_STATUSES.has(status)) {
          stopElapsedTimer();
        }
      }
    );
  }

  onBeforeUnmount(() => {
    stopElapsedTimer(false);
  });

  return {
    elapsedSeconds,
    startElapsedTimer,
    stopElapsedTimer,
    syncElapsedFromMs
  };
}
