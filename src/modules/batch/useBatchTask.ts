/**
 * 批量任务调度公共层 - Vue Composition API Hook。
 *
 * 页面通过 `useBatchTask()` 拿到响应式状态与控制方法，无需关心：
 * - Tauri 事件订阅与取消（unmount 自动释放）。
 * - 进度节流。
 * - 失败列表与输出列表的本地维护。
 *
 * 示例用法见 `src/modules/batch/example.ts`。
 */

import { onBeforeUnmount, readonly, ref, shallowRef } from "vue";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import {
  cancelBatchTask,
  getBatchTaskStatus,
  getBatchTaskResult,
  listenBatchProgress,
  pauseBatchTask,
  resumeBatchTask,
  submitBatchTask,
  type ListenBatchProgressOptions
} from "./batchService";
import type {
  BatchItemFailure,
  BatchProgressPayload,
  BatchTaskResult,
  BatchTaskStatus,
  SubmitBatchTaskPayload
} from "./types";

export interface UseBatchTaskOptions {
  /** 进度节流间隔（毫秒），默认 300。 */
  throttleMs?: number;
  /** 任务进入终态后自动获取一次完整结果，默认 true。 */
  autoFetchResultOnTerminal?: boolean;
}

const TERMINAL_STATUSES: ReadonlySet<BatchTaskStatus> = new Set<BatchTaskStatus>([
  "FINISHED",
  "FAILED",
  "CANCELED"
]);

/**
 * 主 Hook：返回一组响应式状态 + 任务控制方法。
 *
 * - `progress`：当前进度快照（含 total / finished / success / failed / percent / currentFile）。
 * - `failures`、`successOutputs`：终态后通过 `getBatchTaskResult` 拉取并填充。
 */
export function useBatchTask(options: UseBatchTaskOptions = {}) {
  const { throttleMs = 300, autoFetchResultOnTerminal = true } = options;

  const taskId = ref<string | null>(null);
  const progress = ref<BatchProgressPayload | null>(null);
  const result = shallowRef<BatchTaskResult | null>(null);
  const failures = ref<BatchItemFailure[]>([]);
  const successOutputs = ref<string[]>([]);
  const isRunning = ref(false);
  const isPaused = ref(false);
  const isCanceled = ref(false);

  let unlistenFn: UnlistenFn | null = null;
  let statusPollTimer: ReturnType<typeof setInterval> | null = null;

  const detachListener = () => {
    if (unlistenFn) {
      const fn = unlistenFn;
      unlistenFn = null;
      try {
        fn();
      } catch {
        // ignore: 离开页面时取消监听失败不影响主流程
      }
    }
  };

  const stopStatusPolling = () => {
    if (!statusPollTimer) return;
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  };

  const startStatusPolling = (id: string) => {
    stopStatusPolling();
    statusPollTimer = setInterval(() => {
      void getBatchTaskStatus(id)
        .then(handleProgress)
        .catch(() => {
          // Event delivery remains the primary path; polling is only a fallback.
        });
    }, Math.max(1000, throttleMs * 2));
  };

  const handleProgress = (payload: BatchProgressPayload) => {
    if (taskId.value && payload.taskId !== taskId.value) return;
    progress.value = payload;
    if (TERMINAL_STATUSES.has(payload.status)) {
      isRunning.value = false;
      isPaused.value = false;
      isCanceled.value = payload.status === "CANCELED";
      stopStatusPolling();
      if (autoFetchResultOnTerminal && taskId.value) {
        void fetchResult(taskId.value);
      }
    } else {
      isRunning.value = payload.status === "RUNNING";
      isPaused.value = payload.status === "PAUSED";
    }
  };

  const ensureListener = async (listenOptions: ListenBatchProgressOptions) => {
    if (unlistenFn) return;
    unlistenFn = await listenBatchProgress(handleProgress, {
      throttleMs,
      ...listenOptions
    });
  };

  /** 提交任务并自动开始监听进度。 */
  const submit = async <T = Record<string, unknown>>(payload: SubmitBatchTaskPayload<T>) => {
    // 清理上一次状态，避免串流
    progress.value = null;
    result.value = null;
    failures.value = [];
    successOutputs.value = [];
    isPaused.value = false;
    isCanceled.value = false;
    isRunning.value = true;

    detachListener();
    stopStatusPolling();
    const requestedTaskId = payload.taskId ?? `batch-${crypto.randomUUID()}`;
    taskId.value = requestedTaskId;
    await ensureListener({ taskId: requestedTaskId });
    startStatusPolling(requestedTaskId);
    try {
      const { taskId: newTaskId } = await submitBatchTask({
        ...payload,
        taskId: requestedTaskId
      });
      if (newTaskId !== requestedTaskId) {
        taskId.value = newTaskId;
        detachListener();
        stopStatusPolling();
        await ensureListener({ taskId: newTaskId });
        startStatusPolling(newTaskId);
      }
      void getBatchTaskStatus(newTaskId).then(handleProgress).catch(() => undefined);
      return newTaskId;
    } catch (error) {
      isRunning.value = false;
      isPaused.value = false;
      stopStatusPolling();
      detachListener();
      throw error;
    }
  };

  const pause = async () => {
    if (!taskId.value) return;
    await pauseBatchTask(taskId.value);
    isPaused.value = true;
    isRunning.value = false;
  };

  const resume = async () => {
    if (!taskId.value) return;
    await resumeBatchTask(taskId.value);
    isPaused.value = false;
    isRunning.value = true;
  };

  const cancel = async () => {
    if (!taskId.value) return;
    await cancelBatchTask(taskId.value);
    isCanceled.value = true;
    isRunning.value = false;
  };

  /** 主动拉取最终结果（终态触发时会自动调用一次）。 */
  const fetchResult = async (overrideTaskId?: string): Promise<BatchTaskResult | null> => {
    const id = overrideTaskId ?? taskId.value;
    if (!id) return null;
    const snapshot = await getBatchTaskResult(id);
    if (id !== taskId.value) return snapshot;
    result.value = snapshot;
    failures.value = snapshot.failures ?? [];
    successOutputs.value = snapshot.successOutputPaths ?? [];
    return snapshot;
  };

  /** 调用 Tauri `open_directory_in_file_manager` 命令打开输出目录。 */
  const openOutputDirectory = async (overrideDir?: string) => {
    const directoryPath = overrideDir ?? result.value?.outputDir;
    if (!directoryPath) return;
    await invoke("open_directory_in_file_manager", { payload: { directoryPath } });
  };

  onBeforeUnmount(() => {
    stopStatusPolling();
    detachListener();
  });

  return {
    taskId: readonly(taskId),
    progress: readonly(progress),
    result,
    failures: readonly(failures),
    successOutputs: readonly(successOutputs),
    isRunning: readonly(isRunning),
    isPaused: readonly(isPaused),
    isCanceled: readonly(isCanceled),
    submit,
    pause,
    resume,
    cancel,
    fetchResult,
    openOutputDirectory
  };
}
