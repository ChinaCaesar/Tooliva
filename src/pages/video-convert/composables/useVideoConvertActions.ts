import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { open, save } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useTaskStore } from "@/stores/task.store";
import { useSettingsStore } from "@/stores/settings.store";
import {
  tauriClient,
  type StartWebmToMp4Payload,
  type WebmToMp4OutputMode,
  type WebmToMp4ProgressPayload
} from "@/bridge/tauriClient";

type ConvertItemStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface ConvertItem {
  id: string;
  fileName: string;
  inputPath: string;
  status: ConvertItemStatus;
  progress: number;
  outputPath?: string;
  error?: string;
  taskId?: string;
}

/**
 * 从完整路径中提取文件名。
 */
function extractFileName(path: string): string {
  const chunks = path.split(/[/\\]/);
  const name = chunks[chunks.length - 1];
  return name || path;
}

/**
 * 视频转换页动作编排：处理文件导入、输出策略、任务执行和进度同步。
 */
export function useVideoConvertActions() {
  const taskStore = useTaskStore();
  const settingsStore = useSettingsStore();

  const items = ref<ConvertItem[]>([]);
  const isConverting = ref(false);
  const isDropActive = ref(false);
  const hintMessage = ref("");
  const globalOutputDirectory = ref(settingsStore.defaultOutputDirectory || "");
  const outputMode = ref<WebmToMp4OutputMode>("sameAsInput");
  const activeTaskToItemIdMap = ref<Record<string, string>>({});
  const queueRunning = ref(false);
  let disposeProgressListener: (() => void) | null = null;
  let disposeDropListener: UnlistenFn | null = null;

  const canStart = computed(
    () =>
      !isConverting.value &&
      items.value.some((item) => item.status === "idle" || item.status === "failed" || item.status === "cancelled")
  );

  /**
   * 通过系统文件对话框选择多个 webm 文件。
   */
  async function pickFiles(): Promise<void> {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "WebM", extensions: ["webm"] }]
      });
      if (!selected) return;
      const filePaths = Array.isArray(selected) ? selected : [selected];
      appendFiles(filePaths);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message ? `文件选择失败：${message}` : "文件选择不可用，请确认在桌面端运行";
    }
  }

  /**
   * 通过系统目录对话框选择统一输出目录。
   */
  async function pickGlobalOutputDirectory(): Promise<void> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    globalOutputDirectory.value = selected;
    settingsStore.setDefaultOutputDirectory(selected);
  }

  /**
   * 为单个文件指定另存为路径。
   */
  async function pickSaveAsPath(itemId: string): Promise<void> {
    const item = items.value.find((entry) => entry.id === itemId);
    if (!item) return;
    if (item.status === "running") return;
    if (!item.outputPath || item.status !== "completed") {
      hintMessage.value = "请先完成转换后再执行另存为";
      return;
    }
    try {
      const selected = await save({
        defaultPath: item.fileName.replace(/\.webm$/i, ".mp4"),
        filters: [{ name: "MP4", extensions: ["mp4"] }]
      });
      if (!selected) return;
      const copiedPath = await tauriClient.saveAsConvertedFile({
        sourcePath: item.outputPath,
        targetPath: selected
      });
      if (copiedPath) {
        hintMessage.value = "";
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message ? `另存为失败：${message}` : "另存为功能不可用";
    }
  }

  /**
   * 把拖拽到页面的文件加入任务列表。
   */
  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    isDropActive.value = false;
    const fileList = event.dataTransfer?.files;
    if (!fileList || fileList.length === 0) return;

    const filePaths: string[] = [];
    for (const file of Array.from(fileList)) {
      const filePath = (file as File & { path?: string }).path;
      if (filePath) {
        filePaths.push(filePath);
      }
    }
    if (filePaths.length === 0) {
      hintMessage.value = "拖拽未拿到本地路径，请使用桌面端拖拽或点击选择文件";
      return;
    }
    appendFiles(filePaths);
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    isDropActive.value = true;
  }

  function onDragLeave(): void {
    isDropActive.value = false;
  }

  /**
   * 监听 Tauri 原生文件拖拽，确保可以拿到系统绝对路径。
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
        appendFiles(event.payload.paths);
      }
    });
  }

  /**
   * 串行执行转换任务，避免并发转码造成资源争抢。
   */
  async function startConvert(): Promise<void> {
    if (!canStart.value) return;
    hintMessage.value = "";
    await processQueue();
  }

  async function cancelItem(itemId: string): Promise<void> {
    const item = items.value.find((entry) => entry.id === itemId);
    if (!item?.taskId || item.status !== "running") return;
    await tauriClient.cancelWebmToMp4(item.taskId);
  }

  function removeItem(itemId: string): void {
    const item = items.value.find((entry) => entry.id === itemId);
    if (item?.status === "running") return;
    items.value = items.value.filter((entry) => entry.id !== itemId);
  }

  /**
   * 失败或取消后，重置当前 item 并重新发起转换。
   */
  async function retryItem(itemId: string): Promise<void> {
    const item = items.value.find((entry) => entry.id === itemId);
    if (!item) return;
    if (!(item.status === "failed" || item.status === "cancelled")) return;
    if (isConverting.value) return;
    updateItem(itemId, {
      status: "idle",
      progress: 0,
      error: undefined,
      outputPath: undefined
    });
    await processQueue();
  }

  /**
   * 串行队列调度器：持续取下一个待处理 item 执行。
   * 允许在转换过程中继续追加文件，队列会自动消费直到为空。
   */
  async function processQueue(): Promise<void> {
    if (queueRunning.value) return;
    queueRunning.value = true;
    isConverting.value = true;

    try {
      while (true) {
        const nextItem = items.value.find(
          (item) => item.status === "idle" || item.status === "failed" || item.status === "cancelled"
        );
        if (!nextItem) {
          break;
        }
        await runSingleItem(nextItem.id);
      }
    } finally {
      queueRunning.value = false;
      isConverting.value = false;
    }
  }

  async function runSingleItem(itemId: string): Promise<void> {
    const item = items.value.find((entry) => entry.id === itemId);
    if (!item) return;
    if (item.status === "running") return;

    const task = taskStore.createTask("video-convert", "webm-to-mp4");
    const payload: StartWebmToMp4Payload = {
      taskId: task.id,
      inputPath: item.inputPath,
      outputMode: resolveOutputMode(item),
      outputPath: resolveOutputPath(item)
    };

    activeTaskToItemIdMap.value[task.id] = item.id;
    updateItem(item.id, { taskId: task.id, status: "running", progress: 0, error: undefined });
    taskStore.updateTaskProgress(task.id, 0, "转换中");

    try {
      const result = await tauriClient.startWebmToMp4(payload);
      if (result.success) {
        updateItem(item.id, { status: "completed", progress: 100, outputPath: result.outputPath });
        taskStore.completeTask(task.id, `已输出：${result.outputPath}`);
        return;
      }

      if (result.cancelled) {
        updateItem(item.id, { status: "cancelled", error: result.error });
        taskStore.cancelTask(task.id, result.error || "任务已取消");
        return;
      }

      updateItem(item.id, { status: "failed", error: result.error || "转换失败" });
      taskStore.failTask(task.id, result.error || "转换失败");
    } catch (error) {
      const message = error instanceof Error ? error.message : "转换失败";
      updateItem(item.id, { status: "failed", error: message });
      taskStore.failTask(task.id, message);
    } finally {
      delete activeTaskToItemIdMap.value[task.id];
    }
  }

  function resolveOutputMode(item: ConvertItem): WebmToMp4OutputMode {
    return outputMode.value;
  }

  function resolveOutputPath(_item: ConvertItem): string | undefined {
    if (outputMode.value === "globalDirectory") return globalOutputDirectory.value || undefined;
    return undefined;
  }

  function appendFiles(filePaths: string[]): void {
    const normalized = filePaths
      .map((path) => path.trim())
      .filter((path) => path.length > 0)
      .filter((path) => path.toLowerCase().endsWith(".webm"));

    if (normalized.length === 0) {
      hintMessage.value = "仅支持 .webm 文件";
      return;
    }

    const exists = new Set(items.value.map((item) => item.inputPath.toLowerCase()));
    const uniqueItems = normalized.filter((path) => !exists.has(path.toLowerCase()));
    if (uniqueItems.length === 0) {
      hintMessage.value = "文件已在列表中";
      return;
    }

    const newItems: ConvertItem[] = uniqueItems.map((path) => ({
      id: crypto.randomUUID(),
      fileName: extractFileName(path),
      inputPath: path,
      status: "idle",
      progress: 0
    }));
    items.value = [...items.value, ...newItems];
    hintMessage.value = "";
  }

  function updateItem(itemId: string, patch: Partial<ConvertItem>): void {
    items.value = items.value.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
  }

  function handleProgress(payload: WebmToMp4ProgressPayload): void {
    const itemId = activeTaskToItemIdMap.value[payload.taskId];
    if (!itemId) return;
    const message = payload.message || `转换中 ${payload.progress}%`;
    taskStore.updateTaskProgress(payload.taskId, payload.progress, message);
    updateItem(itemId, { progress: payload.progress });

    if (payload.status === "failed") {
      updateItem(itemId, { status: "failed", error: payload.message || "转换失败" });
    }
    if (payload.status === "cancelled") {
      updateItem(itemId, { status: "cancelled", error: payload.message || "任务已取消" });
    }
  }

  onMounted(async () => {
    disposeProgressListener = await tauriClient.onWebmToMp4Progress(handleProgress);
    await setupNativeDropListener();
  });

  onBeforeUnmount(() => {
    if (disposeProgressListener) {
      disposeProgressListener();
      disposeProgressListener = null;
    }
    if (disposeDropListener) {
      disposeDropListener();
      disposeDropListener = null;
    }
  });

  return {
    items,
    hintMessage,
    isConverting,
    isDropActive,
    outputMode,
    globalOutputDirectory,
    canStart,
    pickFiles,
    pickGlobalOutputDirectory,
    pickSaveAsPath,
    handleDrop,
    onDragOver,
    onDragLeave,
    startConvert,
    retryItem,
    cancelItem,
    removeItem
  };
}
