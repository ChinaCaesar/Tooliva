import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useSettingsStore } from "@/stores/settings.store";
import { useTaskStore } from "@/stores/task.store";
import { tauriClient, type StartImageUpscaleResult } from "@/bridge/tauriClient";
import { importDirectoryItems } from "@/pages/shared/directoryImport";
import { useTaskBatchNotification } from "@/pages/shared/useTaskBatchNotification";

type UpscaleStatus = "idle" | "running" | "completed" | "failed";
const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp"];
const SAVED_SECONDS_PER_USAGE = 120;
const MAX_VISIBLE_ITEMS = 200;

interface UpscaleResultSummary {
  total: number;
  success: number;
  failed: number;
  elapsedMs: number;
}

export interface UpscaleItem {
  id: string;
  fileName: string;
  inputPath: string;
  outputPath?: string;
  status: UpscaleStatus;
  progress: number;
  error?: string;
  originalSize?: string;
  outputSize?: string;
}

/**
 * 从完整路径提取文件名。
 */
function extractFileName(path: string): string {
  const chunks = path.split(/[/\\]/);
  const fileName = chunks.pop();
  return fileName || path;
}

/**
 * 将毫秒格式化为友好的耗时文案。
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
 * 将宽高拼接为尺寸文案。
 */
function formatSize(width: number, height: number): string {
  return `${width} x ${height}`;
}

/**
 * 图片高清放大页核心动作：导入、目录扫描、串行放大、结果汇总。
 */
export function useImageUpscaleActions() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const taskStore = useTaskStore();
  const { notifyTaskBatchCompleted } = useTaskBatchNotification();

  const items = ref<UpscaleItem[]>([]);
  const isProcessing = ref(false);
  const isDropActive = ref(false);
  const hintMessage = ref("");
  const outputDirectory = ref(settingsStore.defaultOutputDirectory || "");
  const scaleFactor = ref<2 | 4>(2);
  const resultSummary = ref<UpscaleResultSummary | null>(null);
  const sourceDirectory = ref("");
  let disposeDropListener: UnlistenFn | null = null;
  let disposeUpscaleProgressListener: UnlistenFn | null = null;

  const visibleItems = computed(() => items.value.slice(0, MAX_VISIBLE_ITEMS));
  const hiddenItemCount = computed(() => Math.max(0, items.value.length - visibleItems.value.length));
  const canStart = computed(
    () =>
      !isProcessing.value &&
      (sourceDirectory.value.trim().length > 0 || items.value.some((item) => item.status === "idle" || item.status === "failed"))
  );

  /**
   * 打开系统选择器导入多张图片。
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
   * 选择待处理目录，并递归扫描图片列表。
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
   * 拖拽添加图片路径。
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
   * 监听 Tauri 原生拖拽，确保桌面端可拿到真实绝对路径。
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
   * 删除单条任务。
   */
  function removeItem(itemId: string): void {
    if (isProcessing.value) return;
    items.value = items.value.filter((item) => item.id !== itemId);
  }

  /**
   * 串行执行队列，确保超大量文件也可稳定运行。
   */
  async function startUpscale(): Promise<void> {
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

      disposeUpscaleProgressListener ??= await tauriClient.onImageUpscaleProgress((event) => {
        if (!event.taskId) return;
        const progressPatch: Partial<UpscaleItem> = {
          progress: Math.max(0, Math.min(100, Math.round(event.progress)))
        };
        if (event.stage === "failed") {
          progressPatch.status = "failed";
          progressPatch.error = event.message || "处理失败";
        }
        updateItem(event.taskId, progressPatch);
      });

      for (const current of pendingItems) {
        const task = taskStore.createTask("image-upscale", "image-upscale");
        updateItem(current.id, { status: "running", progress: 0, error: undefined });
        taskStore.updateTaskProgress(task.id, 1, "高清放大中");
        try {
          const result = await tauriClient.startImageUpscale({
            taskId: current.id,
            inputPath: current.inputPath,
            scaleFactor: scaleFactor.value,
            outputDirectory: outputDirectory.value || undefined,
            qualityMode: "fast",
            backendPreference: "auto",
            maxOutputPixels: 60_000_000,
            maxMemoryMb: 768,
            tileSize: 1024,
            tileOverlap: 16
          });
          applyResult(current.id, result);
          if (result.success) {
            success += 1;
            taskStore.completeTask(task.id, "处理完成");
            try {
              await tauriClient.recordToolUsage({
                toolKey: "image-upscale",
                fileName: current.fileName,
                savedSeconds: SAVED_SECONDS_PER_USAGE
              });
            } catch {
              // 统计失败不影响主流程。
            }
          } else {
            failed += 1;
            taskStore.failTask(task.id, result.error || "处理失败");
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "处理失败";
          failed += 1;
          updateItem(current.id, { status: "failed", progress: 100, error: message });
          taskStore.failTask(task.id, message);
        }
      }

      resultSummary.value = {
        total: pendingItems.length,
        success,
        failed,
        elapsedMs: Math.round(performance.now() - startedAt)
      };
      notifyTaskBatchCompleted("pages.imageUpscale.title", resultSummary.value, formatElapsed(resultSummary.value.elapsedMs));
    } finally {
      isProcessing.value = false;
    }
  }

  function applyResult(itemId: string, result: StartImageUpscaleResult): void {
    if (result.success) {
      updateItem(itemId, {
        status: "completed",
        progress: 100,
        outputPath: result.outputPath,
        originalSize: formatSize(result.originalWidth, result.originalHeight),
        outputSize: formatSize(result.outputWidth, result.outputHeight),
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
      error: result.error || "处理失败"
    });
  }

  function updateItem(itemId: string, patch: Partial<UpscaleItem>): void {
    items.value = items.value.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
  }

  /**
   * 追加文件路径并去重，过滤非图片格式。
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
    const newItems: UpscaleItem[] = unique.map((path) => ({
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
   * 开始执行前补扫目录，并只合并当前任务支持的图片文件。
   */
  async function ensureSourceDirectoryItemsLoaded(): Promise<void> {
    if (!sourceDirectory.value.trim()) return;
    try {
      const result = await importDirectoryItems({
        directoryPath: sourceDirectory.value,
        supportedExtensions: SUPPORTED_IMAGE_EXTENSIONS,
        existingPaths: items.value.map((item) => item.inputPath),
        createItem: createUpscaleItem
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
   * 基于路径创建放大任务项，便于目录导入复用。
   */
  function createUpscaleItem(path: string): UpscaleItem {
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
    if (disposeUpscaleProgressListener) {
      disposeUpscaleProgressListener();
      disposeUpscaleProgressListener = null;
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
    scaleFactor,
    resultSummary,
    canStart,
    formatElapsed,
    pickImages,
    pickSourceDirectory,
    pickOutputDirectory,
    startUpscale,
    clearItems,
    removeItem,
    handleDrop,
    onDragOver,
    onDragLeave
  };
}
