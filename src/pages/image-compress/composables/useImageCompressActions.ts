import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useSettingsStore } from "@/stores/settings.store";
import { useTaskStore } from "@/stores/task.store";
import { tauriClient, type StartImageCompressResult } from "@/bridge/tauriClient";
import { importDirectoryItems } from "@/pages/shared/directoryImport";
import { useTaskBatchNotification } from "@/pages/shared/useTaskBatchNotification";

type CompressStatus = "idle" | "running" | "completed" | "failed";
type CompressFormat = "jpg" | "png" | "webp";
const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp"];
const SAVED_SECONDS_PER_USAGE = 90;
const MAX_VISIBLE_ITEMS = 200;

interface CompressResultSummary {
  total: number;
  success: number;
  failed: number;
  elapsedMs: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  compressionRatio: number;
}

export interface CompressItem {
  id: string;
  fileName: string;
  inputPath: string;
  outputPath?: string;
  status: CompressStatus;
  progress: number;
  error?: string;
  originalSize?: string;
  outputSize?: string;
  originalBytes?: string;
  outputBytes?: string;
  compressionRatio?: string;
}

/**
 * 从路径提取文件名，避免任务列表展示完整绝对路径。
 */
function extractFileName(path: string): string {
  const chunks = path.split(/[/\\]/);
  const fileName = chunks.pop();
  return fileName || path;
}

/**
 * 将毫秒值格式化成可读耗时。
 */
function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${mins}m ${remain}s`;
}

/**
 * 将宽高拼成展示文案。
 */
function formatSize(width: number, height: number): string {
  return `${width} x ${height}`;
}

/**
 * 将字节数格式化为可读体积。
 */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * 将压缩比例格式化为百分比。
 */
function formatCompressionRatio(ratio: number): string {
  const percent = ratio * 100;
  const prefix = percent >= 0 ? "-" : "+";
  return `${prefix}${Math.abs(percent).toFixed(1)}%`;
}

/**
 * 图片压缩页的核心动作：导入、拖拽、串行压缩与结果汇总。
 */
export function useImageCompressActions() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const taskStore = useTaskStore();
  const { notifyTaskBatchCompleted } = useTaskBatchNotification();

  const items = ref<CompressItem[]>([]);
  const isProcessing = ref(false);
  const isDropActive = ref(false);
  const hintMessage = ref("");
  const outputDirectory = ref(settingsStore.defaultOutputDirectory || "");
  const sourceDirectory = ref("");
  const quality = ref(80);
  const targetFormat = ref<CompressFormat>("jpg");
  const resultSummary = ref<CompressResultSummary | null>(null);
  let disposeDropListener: UnlistenFn | null = null;
  let disposeCompressProgressListener: UnlistenFn | null = null;

  const visibleItems = computed(() => items.value.slice(0, MAX_VISIBLE_ITEMS));
  const hiddenItemCount = computed(() => Math.max(0, items.value.length - visibleItems.value.length));
  const canStart = computed(
    () =>
      !isProcessing.value &&
      (sourceDirectory.value.trim().length > 0 || items.value.some((item) => item.status === "idle" || item.status === "failed"))
  );

  /**
   * 打开系统选择器导入图片。
   */
  async function pickImages(): Promise<void> {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp", "bmp"] }]
      });
      if (!selected) return;
      const imagePaths = Array.isArray(selected) ? selected : [selected];
      appendImagePaths(imagePaths);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message ? `选择图片失败：${message}` : "无法打开图片选择器";
    }
  }

  /**
   * 选择来源目录并递归扫描图片文件。
   */
  async function pickSourceDirectory(): Promise<void> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    sourceDirectory.value = selected;
    hintMessage.value = t("common.sourceDirectoryReady");
  }

  /**
   * 选择统一输出目录。
   */
  async function pickOutputDirectory(): Promise<void> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    outputDirectory.value = selected;
    settingsStore.setDefaultOutputDirectory(selected);
  }

  /**
   * 浏览器拖拽入口，兜底处理。
   */
  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    isDropActive.value = false;
    const fileList = event.dataTransfer?.files;
    if (!fileList || fileList.length === 0) return;
    const imagePaths: string[] = [];
    for (const file of Array.from(fileList)) {
      const path = (file as File & { path?: string }).path;
      if (path) imagePaths.push(path);
    }
    if (imagePaths.length === 0) {
      hintMessage.value = "拖拽未获取到有效本地路径，请点击“添加图片”";
      return;
    }
    appendImagePaths(imagePaths);
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    isDropActive.value = true;
  }

  function onDragLeave(): void {
    isDropActive.value = false;
  }

  /**
   * 监听桌面端原生拖拽事件，拿到真实路径。
   */
  async function setupNativeDropListener(): Promise<void> {
    if (!isTauri()) return;
    const currentWindow = getCurrentWindow();
    disposeDropListener = await currentWindow.onDragDropEvent((event) => {
      if (event.payload.type === "over" || event.payload.type === "enter") {
        isDropActive.value = true;
        return;
      }
      if (event.payload.type === "leave") {
        isDropActive.value = false;
        return;
      }
      if (event.payload.type === "drop") {
        isDropActive.value = false;
        appendImagePaths(event.payload.paths);
      }
    });
  }

  /**
   * 清空队列。
   */
  function clearItems(): void {
    if (isProcessing.value) return;
    items.value = [];
    resultSummary.value = null;
    hintMessage.value = "";
  }

  /**
   * 删除单条压缩任务。
   */
  function removeItem(itemId: string): void {
    if (isProcessing.value) return;
    items.value = items.value.filter((item) => item.id !== itemId);
  }

  /**
   * 串行执行压缩任务，降低大批量处理时的内存抖动。
   */
  async function startCompress(): Promise<void> {
    if (isProcessing.value) return;
    isProcessing.value = true;
    resultSummary.value = null;
    hintMessage.value = "";
    try {
      await ensureSourceDirectoryItemsLoaded();

      const pendingItems = items.value.filter((item) => item.status === "idle" || item.status === "failed");
      if (pendingItems.length === 0) return;

      const startedAt = performance.now();
      let success = 0;
      let failed = 0;
      let totalInputBytes = 0;
      let totalOutputBytes = 0;

      disposeCompressProgressListener ??= await tauriClient.onImageCompressProgress((event) => {
        if (!event.taskId) return;
        const progressPatch: Partial<CompressItem> = {
          progress: Math.max(0, Math.min(100, Math.round(event.progress)))
        };
        if (event.stage === "failed") {
          progressPatch.status = "failed";
          progressPatch.error = event.message || "处理失败";
        }
        updateItem(event.taskId, progressPatch);
      });

      for (const current of pendingItems) {
        const outcome = await processSingleCompressItem(current);
        totalInputBytes += outcome.inputBytes;
        totalOutputBytes += outcome.outputBytes;
        success += outcome.successCount;
        failed += outcome.failedCount;
      }

      resultSummary.value = {
        total: pendingItems.length,
        success,
        failed,
        elapsedMs: Math.round(performance.now() - startedAt),
        totalInputBytes,
        totalOutputBytes,
        compressionRatio: totalInputBytes > 0 ? (totalInputBytes - totalOutputBytes) / totalInputBytes : 0
      };
      notifyTaskBatchCompleted("pages.imageCompress.title", resultSummary.value, formatElapsed(resultSummary.value.elapsedMs));
    } finally {
      isProcessing.value = false;
    }
  }

  /**
   * 执行单条压缩任务并返回统计增量。
   */
  async function processSingleCompressItem(current: CompressItem): Promise<{
    inputBytes: number;
    outputBytes: number;
    successCount: number;
    failedCount: number;
  }> {
    const task = taskStore.createTask("image-compress", "image-compress");
    updateItem(current.id, { status: "running", progress: 0, error: undefined });
    taskStore.updateTaskProgress(task.id, 1, "图片压缩中");
    try {
      const result = await tauriClient.startImageCompress({
        taskId: current.id,
        inputPath: current.inputPath,
        quality: quality.value,
        outputDirectory: outputDirectory.value || undefined,
        targetFormat: targetFormat.value,
        maxOutputPixels: 60_000_000,
        maxMemoryMb: 768,
        tileSize: 1024,
        tileOverlap: 16
      });
      applyResult(current.id, result);
      if (result.success) {
        taskStore.completeTask(task.id, "处理完成");
        try {
          await tauriClient.recordToolUsage({
            toolKey: "image-compress",
            fileName: current.fileName,
            savedSeconds: SAVED_SECONDS_PER_USAGE
          });
        } catch {
          // 统计失败不影响主流程。
        }
        return { inputBytes: result.inputBytes, outputBytes: result.outputBytes, successCount: 1, failedCount: 0 };
      }
      taskStore.failTask(task.id, result.error || "处理失败");
      return { inputBytes: result.inputBytes, outputBytes: result.outputBytes, successCount: 0, failedCount: 1 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "处理失败";
      updateItem(current.id, { status: "failed", progress: 100, error: message });
      taskStore.failTask(task.id, message);
      return { inputBytes: 0, outputBytes: 0, successCount: 0, failedCount: 1 };
    }
  }

  function applyResult(itemId: string, result: StartImageCompressResult): void {
    if (result.success) {
      updateItem(itemId, {
        status: "completed",
        progress: 100,
        outputPath: result.outputPath,
        originalSize: formatSize(result.originalWidth, result.originalHeight),
        outputSize: formatSize(result.outputWidth, result.outputHeight),
        originalBytes: formatBytes(result.inputBytes),
        outputBytes: formatBytes(result.outputBytes),
        compressionRatio: formatCompressionRatio(result.compressionRatio),
        error: undefined
      });
      return;
    }
    updateItem(itemId, {
      status: "failed",
      progress: 100,
      outputPath: undefined,
      originalSize: formatSize(result.originalWidth, result.originalHeight),
      outputSize: formatSize(result.outputWidth, result.outputHeight),
      originalBytes: formatBytes(result.inputBytes),
      outputBytes: result.outputBytes > 0 ? formatBytes(result.outputBytes) : undefined,
      compressionRatio: result.outputBytes > 0 ? formatCompressionRatio(result.compressionRatio) : undefined,
      error: result.error || "处理失败"
    });
  }

  function updateItem(itemId: string, patch: Partial<CompressItem>): void {
    items.value = items.value.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
  }

  /**
   * 批量追加并去重路径，同时过滤非图片扩展。
   */
  function appendImagePaths(filePaths: string[]): void {
    const normalized = filePaths
      .map((path) => path.trim())
      .filter((path) => path.length > 0)
      .filter((path) => SUPPORTED_IMAGE_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext)));
    if (normalized.length === 0) {
      hintMessage.value = "仅支持 PNG/JPG/JPEG/WEBP/BMP 格式";
      return;
    }
    const existing = new Set(items.value.map((item) => item.inputPath.toLowerCase()));
    const unique = normalized.filter((path) => !existing.has(path.toLowerCase()));
    if (unique.length === 0) {
      hintMessage.value = "文件已在任务列表中";
      return;
    }
    const newItems: CompressItem[] = unique.map((path) => ({
      id: crypto.randomUUID(),
      fileName: extractFileName(path),
      inputPath: path,
      status: "idle",
      progress: 0
    }));
    items.value = [...items.value, ...newItems];
    hintMessage.value = "";
  }

  /**
   * 开始执行前按当前任务支持的格式补扫目录，并与现有列表去重合并。
   */
  async function ensureSourceDirectoryItemsLoaded(): Promise<void> {
    if (!sourceDirectory.value.trim()) return;
    try {
      const result = await importDirectoryItems({
        directoryPath: sourceDirectory.value,
        supportedExtensions: SUPPORTED_IMAGE_EXTENSIONS,
        existingPaths: items.value.map((item) => item.inputPath),
        createItem: createCompressItem
      });
      if (result.addedItems.length > 0) {
        items.value = [...items.value, ...result.addedItems];
        hintMessage.value = "";
        return;
      }
      hintMessage.value =
        result.matchedCount === 0 ? t("common.sourceDirectoryNoMatch") : t("common.sourceDirectoryNoNewFiles");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message ? `扫描目录失败：${message}` : "扫描目录失败";
    }
  }

  /**
   * 基于文件路径构造压缩任务项，供目录导入与手动导入共用。
   */
  function createCompressItem(path: string): CompressItem {
    return {
      id: crypto.randomUUID(),
      fileName: extractFileName(path),
      inputPath: path,
      status: "idle",
      progress: 0
    };
  }

  onMounted(async () => {
    await setupNativeDropListener();
  });

  onBeforeUnmount(() => {
    if (disposeDropListener) {
      disposeDropListener();
      disposeDropListener = null;
    }
    if (disposeCompressProgressListener) {
      disposeCompressProgressListener();
      disposeCompressProgressListener = null;
    }
  });

  return {
    items,
    visibleItems,
    hiddenItemCount,
    isProcessing,
    isDropActive,
    hintMessage,
    outputDirectory,
    sourceDirectory,
    quality,
    targetFormat,
    resultSummary,
    canStart,
    formatElapsed,
    formatBytes,
    formatCompressionRatio,
    pickImages,
    pickSourceDirectory,
    pickOutputDirectory,
    startCompress,
    clearItems,
    removeItem,
    handleDrop,
    onDragOver,
    onDragLeave
  };
}
