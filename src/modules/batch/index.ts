/**
 * 批量任务调度公共层 - 统一导出。
 *
 * 页面或其他模块应从此入口导入：
 *
 *   import { useBatchTask, submitBatchTask, type BatchProgressPayload } from "@/modules/batch";
 */

export * from "./types";
export * from "./batchService";
export { useBatchTask, type UseBatchTaskOptions } from "./useBatchTask";
