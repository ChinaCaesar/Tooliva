/**
 * 批量任务调度公共层 - 前端类型定义。
 *
 * 与 Rust 端 `src-tauri/src/batch/types.rs`、`config.rs`、`progress.rs`、`result.rs`
 * 一一对应，所有大写枚举字符串保持 Rust 协议风格。
 */

/** 批量任务的业务类型（与后端 `BatchTaskType` 对齐）。 */
export type BatchTaskType =
  | "IMAGE_WATERMARK"
  | "IMAGE_COMPRESS"
  | "IMAGE_CONVERT"
  | "IMAGE_UPSCALE"
  | "VIDEO_TO_GIF"
  | "VIDEO_WATERMARK_REMOVAL"
  | "GIF_COMPRESS"
  | "AI_INPAINT"
  | "AI_UPSCALE";

/** 任务生命周期状态。 */
export type BatchTaskStatus =
  | "PENDING"
  | "RUNNING"
  | "PAUSED"
  | "CANCELED"
  | "FINISHED"
  | "FAILED";

/** 用户在前端选择的并发档位；与后端 `ConcurrencyPreset` 对齐（camelCase）。 */
export type BatchConcurrencyPreset = "lowUsage" | "balanced" | "fast" | "custom";

/** 进度事件载荷（与后端 `BatchProgressPayload` 对齐）。 */
export interface BatchProgressPayload {
  taskId: string;
  taskType: BatchTaskType;
  total: number;
  finished: number;
  success: number;
  failed: number;
  currentFile: string | null;
  percent: number;
  status: BatchTaskStatus;
  message: string | null;
}

/** 单条失败子任务（与后端 `BatchItemFailure` 对齐）。 */
export interface BatchItemFailure {
  inputPath: string;
  errorMessage: string;
  occurredAtMs: number;
  retried: number;
}

/** 批量任务最终结果（与后端 `BatchTaskResult` 对齐）。 */
export interface BatchTaskResult {
  taskId: string;
  taskType: BatchTaskType;
  status: BatchTaskStatus;
  total: number;
  success: number;
  failed: number;
  outputDir: string;
  failures: BatchItemFailure[];
  successOutputPaths: string[];
  createdAtMs: number;
  startedAtMs: number | null;
  finishedAtMs: number | null;
  effectiveConcurrency: number;
  message: string | null;
}

/** 提交批量任务的入参（与后端 `SubmitBatchTaskPayload` 对齐）。 */
export interface SubmitBatchTaskPayload<TOptions = Record<string, unknown>> {
  taskId?: string;
  taskType: BatchTaskType;
  inputFiles: string[];
  outputDir: string;
  options?: TOptions;
  concurrencyPreset?: BatchConcurrencyPreset;
  /** 仅在 `concurrencyPreset === "custom"` 时有意义。后端仍会按类别上限钳制。 */
  customConcurrency?: number;
}

export interface SubmitBatchTaskResult {
  taskId: string;
}

/**
 * Rust 侧推送的统一事件名（前后端常量需保持一致；见
 * `src-tauri/src/batch/progress.rs` 的 `BATCH_PROGRESS_EVENT`）。
 */
export const BATCH_PROGRESS_EVENT = "batch-task-progress";
