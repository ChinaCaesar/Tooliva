/**
 * 批量任务调度公共层 - 前端服务封装。
 *
 * 页面只应通过本模块与 Rust 调度层对话，不要在页面里直接 `invoke`，
 * 这样可以统一节流、错误处理、事件订阅释放等关注点。
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import {
  BATCH_PROGRESS_EVENT,
  type BatchProgressPayload,
  type BatchTaskResult,
  type SubmitBatchTaskPayload,
  type SubmitBatchTaskResult
} from "./types";

/** Tauri 命令名集中常量，避免散落字符串引发拼写错误。 */
const COMMANDS = {
  submit: "submit_batch_task",
  pause: "pause_batch_task",
  resume: "resume_batch_task",
  cancel: "cancel_batch_task",
  getResult: "get_batch_task_result",
  getStatus: "get_batch_task_status"
} as const;

/** 提交批量任务；后端立即返回 `taskId`，真正执行在后台线程。 */
export async function submitBatchTask<TOptions = Record<string, unknown>>(
  payload: SubmitBatchTaskPayload<TOptions>
): Promise<SubmitBatchTaskResult> {
  return invoke<SubmitBatchTaskResult>(COMMANDS.submit, { payload });
}

/** 暂停：不再派发新子任务；正在运行的自然结束。 */
export async function pauseBatchTask(taskId: string): Promise<void> {
  await invoke(COMMANDS.pause, { payload: { taskId } });
}

/** 继续：从剩余队列恢复派发。 */
export async function resumeBatchTask(taskId: string): Promise<void> {
  await invoke(COMMANDS.resume, { payload: { taskId } });
}

/** 取消：停止派发，标记 CANCELED，清理临时文件并尽力终止子进程（视频任务）。 */
export async function cancelBatchTask(taskId: string): Promise<void> {
  await invoke(COMMANDS.cancel, { payload: { taskId } });
}

/** 查询任务最终结果（含失败列表、成功输出列表）。终态前也可读到当前快照。 */
export async function getBatchTaskResult(taskId: string): Promise<BatchTaskResult> {
  return invoke<BatchTaskResult>(COMMANDS.getResult, { payload: { taskId } });
}

/** 查询当前进度快照（一般使用事件订阅；轮询作为兜底）。 */
export async function getBatchTaskStatus(taskId: string): Promise<BatchProgressPayload> {
  return invoke<BatchProgressPayload>(COMMANDS.getStatus, { payload: { taskId } });
}

/** 监听进度事件的可选参数。 */
export interface ListenBatchProgressOptions {
  /**
   * 仅对指定 `taskId` 的事件回调；其他任务的事件被静默忽略。
   * 单页面同时管理多任务时，可在外部做路由分发，本字段亦可省略。
   */
  taskId?: string;
  /**
   * 节流间隔（毫秒），默认 300。后端已节流，但同一时间可能积压多条进度，
   * 前端再节流可避免 UI 高频更新引起的卡顿。
   */
  throttleMs?: number;
}

/**
 * 订阅进度事件。返回的 `Promise<UnlistenFn>` 在组件 unmount 时务必 await 调用，
 * 避免事件监听器在多次进入页面后泄漏。
 */
export async function listenBatchProgress(
  handler: (payload: BatchProgressPayload) => void,
  options: ListenBatchProgressOptions = {}
): Promise<UnlistenFn> {
  const { taskId, throttleMs = 300 } = options;
  let lastEmitAt = 0;
  let pending: BatchProgressPayload | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    flushTimer = null;
    if (!pending) return;
    const payload = pending;
    pending = null;
    lastEmitAt = Date.now();
    handler(payload);
  };

  const dispatch = (payload: BatchProgressPayload) => {
    if (taskId && payload.taskId !== taskId) return;
    // 终态强制立即下发，确保 UI 显示最终状态
    const isTerminal =
      payload.status === "FINISHED" ||
      payload.status === "FAILED" ||
      payload.status === "CANCELED";
    if (isTerminal) {
      pending = null;
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      lastEmitAt = Date.now();
      handler(payload);
      return;
    }
    pending = payload;
    const elapsed = Date.now() - lastEmitAt;
    if (elapsed >= throttleMs) {
      flush();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flush, throttleMs - elapsed);
    }
  };

  return listen<BatchProgressPayload>(BATCH_PROGRESS_EVENT, (event) => {
    dispatch(event.payload);
  });
}
