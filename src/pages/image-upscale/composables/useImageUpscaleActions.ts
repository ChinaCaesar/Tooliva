import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useRouter } from "vue-router";
import {
  tauriClient,
  type ImageUpscaleAdjustmentLevel,
  type ImageUpscaleOutputFormat,
  type ImageUpscaleQualityMode,
  type StartImageUpscaleResult
} from "@/bridge/tauriClient";
import { useTaskStore } from "@/stores/task.store";
import {
  checkExportEntitlement,
  consumeExportEntitlement,
  promptEntitlementUpgrade
} from "@/modules/entitlement/exportEntitlementGuard";
import { importDirectoryItems } from "@/pages/shared/directoryImport";
import { useTaskBatchNotification } from "@/pages/shared/useTaskBatchNotification";

type UpscaleStatus = "idle" | "running" | "completed" | "failed";
export type UpscaleScaleFactor = 2 | 3 | 4;
export type UpscaleOutputDirectoryMode = "source" | "custom" | "overwrite";
export type UpscaleConcurrency = "auto" | 1 | 2 | 4;

const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp"];
const MAX_VISIBLE_ITEMS = 200;
const DEFAULT_MAX_OUTPUT_PIXELS_CAP = 60_000_000;
const DEFAULT_MAX_MEMORY_MB = 768;
const DEFAULT_TILE_SIZE = 1024;
const DEFAULT_TILE_OVERLAP = 16;

export interface UpscaleResultSummary {
  total: number;
  success: number;
  failed: number;
  elapsedMs: number;
  outputDirectoryLabel: string;
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
  outputFormat?: string;
}

function extractFileName(path: string): string {
  const chunks = path.split(/[/\\]/);
  const fileName = chunks.pop();
  return fileName || path;
}

function extractSourceDirectory(path: string): string {
  const chunks = path.split(/[/\\]/);
  chunks.pop();
  return chunks.join("\\");
}

function joinOutputScaleDirectory(directory: string): string {
  if (!directory) return "";
  return String.raw`${directory.replace(/[\\/]+$/, "")}\scale`;
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${mins}m ${remain}s`;
}

function formatSize(width: number, height: number): string {
  return `${width} x ${height}`;
}

function resolveAutoConcurrency(): number {
  const hardware = navigator.hardwareConcurrency || 2;
  return Math.max(1, Math.min(2, Math.floor(hardware / 2) || 1));
}

function normalizeConcurrency(value: UpscaleConcurrency): number {
  return value === "auto" ? resolveAutoConcurrency() : value;
}

function resolveOutputFormatLabel(format: ImageUpscaleOutputFormat, inputPath: string): string {
  if (format !== "original") return format.toUpperCase();
  const ext = inputPath.split(".").pop();
  return ext ? ext.toUpperCase() : "ORIGINAL";
}

function createUpscaleItem(path: string): UpscaleItem {
  return {
    id: crypto.randomUUID(),
    fileName: extractFileName(path),
    inputPath: path,
    status: "idle",
    progress: 0
  };
}

async function runWithConcurrency<T>(
  queueItems: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(limit, queueItems.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < queueItems.length) {
        const currentIndex = cursor;
        cursor += 1;
        await worker(queueItems[currentIndex]);
      }
    })
  );
}

/**
 * 图片高清放大页的核心动作：导入、参数管理、并发调度与结果汇总。
 */
export function useImageUpscaleActions() {
  const { t } = useI18n();
  const router = useRouter();
  const taskStore = useTaskStore();
  const { notifyTaskBatchCompleted } = useTaskBatchNotification();

  const items = ref<UpscaleItem[]>([]);
  const isProcessing = ref(false);
  const isDropActive = ref(false);
  const hintMessage = ref("");
  const sourceDirectory = ref("");
  const outputDirectory = ref("");
  const outputDirectoryMode = ref<UpscaleOutputDirectoryMode>("source");
  const scaleFactor = ref<UpscaleScaleFactor>(2);
  const qualityMode = ref<ImageUpscaleQualityMode>("standard");
  const outputFormat = ref<ImageUpscaleOutputFormat>("original");
  const denoiseLevel = ref<ImageUpscaleAdjustmentLevel>("off");
  const sharpenLevel = ref<ImageUpscaleAdjustmentLevel>("off");
  const preserveTransparentBackground = ref(true);
  const concurrency = ref<UpscaleConcurrency>("auto");
  const resultSummary = ref<UpscaleResultSummary | null>(null);
  const entitlementDialogShown = ref(false);
  const selectedIds = shallowRef(new Set<string>());
  let disposeDropListener: UnlistenFn | null = null;
  let disposeUpscaleProgressListener: UnlistenFn | null = null;

  const visibleItems = computed(() => items.value.slice(0, MAX_VISIBLE_ITEMS));
  const hiddenItemCount = computed(() => Math.max(0, items.value.length - visibleItems.value.length));
  const allVisibleSelected = computed(
    () => visibleItems.value.length > 0 && visibleItems.value.every((item) => selectedIds.value.has(item.id))
  );
  const someVisibleSelected = computed(() => visibleItems.value.some((item) => selectedIds.value.has(item.id)));
  const selectedCount = computed(() => selectedIds.value.size);
  const canStart = computed(() => {
    if (isProcessing.value) return false;
    if (outputDirectoryMode.value === "custom" && outputDirectory.value.trim().length === 0) return false;
    return sourceDirectory.value.trim().length > 0 || items.value.some((item) => item.status === "idle" || item.status === "failed");
  });
  const outputFooterPath = computed(() => {
    if (outputDirectoryMode.value === "overwrite") {
      return t("common.outputModes.overwrite");
    }
    if (outputDirectoryMode.value === "custom") {
      return outputDirectory.value.trim() || t("pages.imageUpscale.output.customNotSelected");
    }
    const firstPath = items.value[0]?.inputPath;
    return firstPath ? joinOutputScaleDirectory(extractSourceDirectory(firstPath)) : t("pages.imageUpscale.footer.sourceOutput");
  });
  const effectiveOutputDirectory = computed(() => {
    if (outputDirectoryMode.value === "overwrite") {
      return "";
    }
    if (outputDirectoryMode.value === "custom") {
      return outputDirectory.value.trim();
    }
    const firstPath = items.value[0]?.inputPath;
    if (firstPath) return joinOutputScaleDirectory(extractSourceDirectory(firstPath));
    if (sourceDirectory.value.trim()) return joinOutputScaleDirectory(sourceDirectory.value.trim());
    return "";
  });

  function isItemSelected(itemId: string): boolean {
    return selectedIds.value.has(itemId);
  }

  function toggleItemSelected(itemId: string): void {
    if (isProcessing.value) return;
    const next = new Set(selectedIds.value);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    selectedIds.value = next;
  }

  function toggleSelectAllVisible(): void {
    if (isProcessing.value) return;
    const next = new Set(selectedIds.value);
    if (allVisibleSelected.value) {
      for (const item of visibleItems.value) next.delete(item.id);
    } else {
      for (const item of visibleItems.value) next.add(item.id);
    }
    selectedIds.value = next;
  }

  function removeSelected(): void {
    if (isProcessing.value || selectedIds.value.size === 0) return;
    const selected = selectedIds.value;
    items.value = items.value.filter((item) => !selected.has(item.id));
    selectedIds.value = new Set();
  }

  function clearItems(): void {
    if (isProcessing.value) return;
    items.value = [];
    selectedIds.value = new Set();
    resultSummary.value = null;
    hintMessage.value = "";
  }

  function removeItem(itemId: string): void {
    if (isProcessing.value) return;
    items.value = items.value.filter((item) => item.id !== itemId);
    const next = new Set(selectedIds.value);
    next.delete(itemId);
    selectedIds.value = next;
  }

  function resetUpscaleSettings(): void {
    if (isProcessing.value) return;
    scaleFactor.value = 2;
    qualityMode.value = "standard";
    outputFormat.value = "original";
    denoiseLevel.value = "off";
    sharpenLevel.value = "off";
    preserveTransparentBackground.value = true;
    outputDirectoryMode.value = "source";
    concurrency.value = "auto";
  }

  async function pickImages(): Promise<void> {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp", "bmp"] }]
      });
      if (!selected) return;
      appendImagePaths(Array.isArray(selected) ? selected : [selected]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message
        ? t("pages.imageUpscale.errors.pickImagesFailed", { message })
        : t("pages.imageUpscale.errors.pickImagesDialog");
    }
  }

  async function pickSourceDirectory(): Promise<void> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    sourceDirectory.value = selected;
    hintMessage.value = t("common.sourceDirectoryReady");
  }

  async function pickOutputDirectory(): Promise<void> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    outputDirectory.value = selected;
    outputDirectoryMode.value = "custom";
  }

  async function openEffectiveOutputDirectory(): Promise<void> {
    if (!effectiveOutputDirectory.value) {
      hintMessage.value = t("pages.imageUpscale.output.openDirectoryUnavailable");
      return;
    }
    try {
      await tauriClient.openDirectoryInFileManager({ directoryPath: effectiveOutputDirectory.value });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message
        ? t("pages.imageUpscale.errors.openDirectoryFailed", { message })
        : t("pages.imageUpscale.errors.openDirectory");
    }
  }

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
      hintMessage.value = t("pages.imageUpscale.hints.dragNoPath");
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

  async function startUpscale(): Promise<void> {
    if (isProcessing.value) return;
    const entitlement = await checkExportEntitlement("image-upscale");
    entitlementDialogShown.value = false;
    if (!entitlement.allowed) {
      if (entitlement.reason === "no_entitlement" || entitlement.reason === "service_error") {
        hintMessage.value = t("common.entitlement.noEntitlement");
        await promptEntitlementUpgrade(router, t, "image-upscale");
      }
      return;
    }
    isProcessing.value = true;
    resultSummary.value = null;
    hintMessage.value = "";
    try {
      await ensureSourceDirectoryItemsLoaded();
      const pendingItems = items.value.filter((item) => item.status === "idle" || item.status === "failed");
      if (pendingItems.length === 0) {
        hintMessage.value = t("pages.imageUpscale.hints.noPendingItems");
        return;
      }

      disposeUpscaleProgressListener ??= await tauriClient.onImageUpscaleProgress((event) => {
        if (!event.taskId) return;
        const progress = Math.max(0, Math.min(100, Math.round(event.progress)));
        updateItem(event.taskId, {
          progress,
          ...(event.stage === "failed"
            ? { status: "failed", error: event.message || t("pages.imageUpscale.errors.genericFailed") }
            : {})
        });
      });

      const startedAt = performance.now();
      const stats = { success: 0, failed: 0 };
      await runWithConcurrency(pendingItems, normalizeConcurrency(concurrency.value), async (item) => {
        const outcome = await processSingleUpscaleItem(item);
        stats.success += outcome.success ? 1 : 0;
        stats.failed += outcome.success ? 0 : 1;
      });

      resultSummary.value = {
        total: pendingItems.length,
        success: stats.success,
        failed: stats.failed,
        elapsedMs: Math.round(performance.now() - startedAt),
        outputDirectoryLabel: outputFooterPath.value
      };
      notifyTaskBatchCompleted("pages.imageUpscale.title", resultSummary.value, formatElapsed(resultSummary.value.elapsedMs));
    } finally {
      isProcessing.value = false;
    }
  }

  async function processSingleUpscaleItem(current: UpscaleItem): Promise<{ success: boolean }> {
    const task = taskStore.createTask("image-upscale", "image-upscale");
    updateItem(current.id, { status: "running", progress: 0, error: undefined });
    taskStore.updateTaskProgress(task.id, 1, t("pages.imageUpscale.taskRunning"));
    try {
      const consume = await consumeExportEntitlement({
        tool: "image-upscale",
        amount: 1,
        sourceId: current.id,
        idempotencyKey: `image-upscale:${current.id}`
      });
      if (!consume.allowed) {
        const consumeError = t("common.entitlement.noEntitlement");
        updateItem(current.id, { status: "failed", progress: 100, error: consumeError });
        taskStore.failTask(task.id, consumeError);
        if (!entitlementDialogShown.value) {
          entitlementDialogShown.value = true;
          await promptEntitlementUpgrade(router, t, "image-upscale");
        }
        return { success: false };
      }
      const result = await tauriClient.startImageUpscale({
        taskId: current.id,
        inputPath: current.inputPath,
        scaleFactor: scaleFactor.value,
        qualityMode: qualityMode.value,
        outputFormat: outputFormat.value,
        denoiseLevel: denoiseLevel.value,
        sharpenLevel: sharpenLevel.value,
        preserveTransparentBackground: preserveTransparentBackground.value,
        outputMode: outputDirectoryMode.value === "overwrite" ? "overwrite" : "directory",
        outputDirectory: outputDirectoryMode.value === "custom" ? outputDirectory.value || undefined : undefined,
        maxOutputPixels: DEFAULT_MAX_OUTPUT_PIXELS_CAP,
        maxMemoryMb: DEFAULT_MAX_MEMORY_MB,
        tileSize: DEFAULT_TILE_SIZE,
        tileOverlap: DEFAULT_TILE_OVERLAP
      });
      applyResult(current.id, result);
      if (result.success) {
        taskStore.completeTask(task.id, t("pages.imageUpscale.taskDone"));
        try {
          await tauriClient.recordToolUsage({
            toolKey: "image-upscale",
            fileName: current.fileName
          });
        } catch {
          // 最近使用记录失败不影响主处理流程。
        }
        return { success: true };
      }
      taskStore.failTask(task.id, result.error || t("pages.imageUpscale.errors.genericFailed"));
      return { success: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : t("pages.imageUpscale.errors.genericFailed");
      updateItem(current.id, { status: "failed", progress: 100, error: message });
      taskStore.failTask(task.id, message);
      return { success: false };
    }
  }

  function applyResult(itemId: string, result: StartImageUpscaleResult): void {
    const formatLabel = resolveOutputFormatLabel(outputFormat.value, result.inputPath);
    if (result.success) {
      updateItem(itemId, {
        status: "completed",
        progress: 100,
        outputPath: result.outputPath,
        originalSize: formatSize(result.originalWidth, result.originalHeight),
        outputSize: formatSize(result.outputWidth, result.outputHeight),
        outputFormat: formatLabel,
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
      outputFormat: formatLabel,
      error: result.error || t("pages.imageUpscale.errors.genericFailed")
    });
  }

  function updateItem(itemId: string, patch: Partial<UpscaleItem>): void {
    items.value = items.value.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
  }

  function appendImagePaths(filePaths: string[]): void {
    const normalized = filePaths
      .map((path) => path.trim())
      .filter((path) => path.length > 0)
      .filter((path) => SUPPORTED_IMAGE_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext)));
    if (normalized.length === 0) {
      hintMessage.value = t("pages.imageUpscale.hints.unsupportedFormat");
      return;
    }
    const existing = new Set(items.value.map((item) => item.inputPath.toLowerCase()));
    const unique = normalized.filter((path) => !existing.has(path.toLowerCase()));
    if (unique.length === 0) {
      hintMessage.value = t("pages.imageUpscale.hints.duplicateFiles");
      return;
    }
    items.value = [...items.value, ...unique.map(createUpscaleItem)];
    hintMessage.value = "";
  }

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
      hintMessage.value = message
        ? t("pages.imageUpscale.errors.scanDirectoryFailed", { message })
        : t("pages.imageUpscale.errors.scanDirectory");
    }
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
    sourceDirectory,
    outputDirectory,
    outputDirectoryMode,
    scaleFactor,
    qualityMode,
    outputFormat,
    denoiseLevel,
    sharpenLevel,
    preserveTransparentBackground,
    concurrency,
    resultSummary,
    canStart,
    outputFooterPath,
    effectiveOutputDirectory,
    allVisibleSelected,
    someVisibleSelected,
    selectedCount,
    formatElapsed,
    pickImages,
    pickSourceDirectory,
    pickAddFolder: pickSourceDirectory,
    pickOutputDirectory,
    openEffectiveOutputDirectory,
    startUpscale,
    clearItems,
    removeItem,
    removeSelected,
    toggleItemSelected,
    toggleSelectAllVisible,
    isItemSelected,
    resetUpscaleSettings,
    handleDrop,
    onDragOver,
    onDragLeave
  };
}
