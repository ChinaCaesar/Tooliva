<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useRouter } from "vue-router";
import { Folder, Info, Maximize2, PauseCircle, PlayCircle, Plus, Trash2, Video, Volume2, VolumeX, X } from "@lucide/vue";
import { tauriClient } from "@/bridge/tauriClient";
import { useAiRuntime } from "@/modules/ai-runtime/useAiRuntime";
import { useBatchTask } from "@/modules/batch";
import {
  checkExportEntitlement,
  consumeExportEntitlement,
  promptEntitlementUpgrade
} from "@/modules/entitlement/exportEntitlementGuard";

const { t } = useI18n();
const router = useRouter();

type RemovalStatus = "pending" | "processing" | "done" | "failed";
type RemovalMode = "fast" | "ai";

interface WatermarkRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RemovalItem {
  id: string;
  path: string;
  name: string;
  bytes: number;
  width: number;
  height: number;
  duration: number;
  previewUrl: string;
  outputPath?: string;
  status: RemovalStatus;
  regions: WatermarkRegion[];
}

const supportedExtensions = ["mp4", "webm", "mkv", "mov", "avi", "m4v", "wmv"];
const defaultAlgorithm = "telea";
const defaultRadius = 3;

const items = ref<RemovalItem[]>([]);
const selectedId = ref<string | null>(null);
const isDropActive = ref(false);
const removalMode = ref<RemovalMode>("fast");
const outputDir = ref(t("pages.videoWatermarkRemoval.output.defaultDirectory"));
const hintMessage = ref("");
const elapsedSeconds = ref(0);
const draftRegion = ref<WatermarkRegion | null>(null);
const isSubmittingRemoval = ref(false);
const previewVideoRef = ref<HTMLVideoElement | null>(null);
const previewShellRef = ref<HTMLElement | null>(null);
const previewStageRef = ref<HTMLElement | null>(null);
const videoLayerSize = ref({ width: 0, height: 0 });
const isPreviewPlaying = ref(false);
const isPreviewMuted = ref(true);
const previewCurrentTime = ref(0);
const previewDuration = ref(0);
const runtimeDevice = ref("");
const torchVersion = ref("");
const runtimeActionError = ref("");

const aiRuntime = useAiRuntime();
const aiRuntimeProgress = aiRuntime.progress;
const aiRuntimeStatus = aiRuntime.status;
const aiRuntimeHasManifestSource = aiRuntime.hasManifestSource;
const { submit, cancel, openOutputDirectory: openBatchOutputDirectory, progress, isRunning, result, failures } = useBatchTask();

let disposeDrop: UnlistenFn | null = null;
let elapsedTimer: number | null = null;
let dragStart: { x: number; y: number } | null = null;
let previewResizeObserver: ResizeObserver | null = null;
let hasManualModeSelection = false;

const selectedItem = computed(() => items.value.find((item) => item.id === selectedId.value) ?? null);
const totalBytes = computed(() => items.value.reduce((sum, item) => sum + item.bytes, 0));
const hasRegions = computed(() => items.value.some((item) => item.regions.length > 0));
const progressPercent = computed(() => progress.value?.percent ?? 0);
const currentIndex = computed(() => {
  const currentFile = progress.value?.currentFile;
  if (currentFile) {
    const normalized = currentFile.replace(/\\/g, "/").toLowerCase();
    const index = items.value.findIndex((item) => item.path.replace(/\\/g, "/").toLowerCase() === normalized);
    if (index >= 0) return index;
  }
  return Math.min(Math.max(0, (progress.value?.finished ?? 0) - 1), Math.max(0, items.value.length - 1));
});
const currentProgressItem = computed(() => items.value[Math.min(currentIndex.value, Math.max(0, items.value.length - 1))] ?? selectedItem.value);
const canStart = computed(() => {
  if (isRunning.value || isSubmittingRemoval.value || items.value.length === 0 || !hasRegions.value) return false;
  if (removalMode.value === "ai") {
    return aiRuntime.status.value === "INSTALLED" || aiRuntime.status.value === "UPDATE_AVAILABLE";
  }
  return true;
});
const selectedAspectRatio = computed(() => {
  const item = selectedItem.value;
  if (!item || item.width <= 0 || item.height <= 0) return "16 / 9";
  return `${item.width} / ${item.height}`;
});
const videoLayerStyle = computed(() => ({
  width: `${videoLayerSize.value.width}px`,
  height: `${videoLayerSize.value.height}px`,
  aspectRatio: selectedAspectRatio.value
}));
const previewProgress = computed(() => {
  if (previewDuration.value <= 0) return 0;
  return Math.min(100, Math.max(0, (previewCurrentTime.value / previewDuration.value) * 100));
});
const aiProgressPercent = computed(() => aiRuntime.progress.value?.percent ?? 0);
const aiDownloadSpeedLabel = computed(() => formatBytes(aiRuntime.progress.value?.bytesPerSecond ?? 0));
const aiProgressSummaryLabel = computed(() => {
  const payload = aiRuntime.progress.value;
  if (!payload) return "--";
  return `${formatBytes(payload.downloadedBytes)} / ${formatBytes(payload.totalBytes)}`;
});
const hasInstalledAiRuntime = computed(() =>
  aiRuntimeStatus.value === "INSTALLED" || aiRuntimeStatus.value === "UPDATE_AVAILABLE"
);
const aiRuntimeStatusText = computed(() => {
  switch (aiRuntime.status.value) {
    case "DISABLED": return "AI 增强组件未启用";
    case "NOT_INSTALLED": return "AI 增强组件未安装";
    case "CHECKING": return "正在检查 AI 环境";
    case "ENV_NOT_SUPPORTED": return "当前设备不满足 AI 安装条件";
    case "READY_TO_INSTALL": return "可安装 AI 增强组件";
    case "DOWNLOADING": return "正在下载 AI 增强组件";
    case "VERIFYING": return "正在校验 AI 增强组件";
    case "INSTALLING": return "正在安装 AI 增强组件";
    case "INSTALLED": return "AI 增强组件已安装";
    case "UPDATE_AVAILABLE": return "AI 增强组件有可用更新";
    case "FAILED": return "AI 增强组件操作失败";
  }
});
const processingEngineLabel = computed(() => {
  if (removalMode.value === "fast") return "本地极速修复";
  return runtimeDevice.value ? `${runtimeDevice.value.toUpperCase()}${torchVersion.value ? ` / Torch ${torchVersion.value}` : ""}` : "AI 增强修复";
});
const aiInstallHint = computed(() => {
  if (aiRuntime.environment.value?.reasons?.length) return aiRuntime.environment.value.reasons[0];
  if (aiRuntime.manifest.value && (aiRuntime.status.value === "READY_TO_INSTALL" || aiRuntime.status.value === "UPDATE_AVAILABLE")) {
    return `组件版本 ${aiRuntime.manifest.value.runtimeVersion}，大小 ${formatBytes(aiRuntime.manifest.value.packageSize)}，预计磁盘 ${aiRuntime.manifest.value.requiredFreeDiskGb} GB。`;
  }
  if (aiRuntime.error.value) return aiRuntime.error.value;
  return "";
});
const progressTitle = computed(() => {
  if (progress.value?.message && isRunning.value) return progress.value.message;
  if (!isRunning.value) return "暂无任务";
  return `正在处理 ${Math.min((progress.value?.finished ?? 0) + 1, items.value.length)} / ${items.value.length}`;
});
const remainingTime = computed(() => {
  if (!isRunning.value) return "--";
  const remaining = Math.max(0, Math.round(((100 - progressPercent.value) / Math.max(1, progressPercent.value)) * elapsedSeconds.value));
  return formatDuration(remaining || 120);
});

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value < 10 && index > 0 ? value.toFixed(2) : value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function extractName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

function isSupportedVideo(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return supportedExtensions.includes(ext);
}

function statusLabel(status: RemovalStatus): string {
  switch (status) {
    case "pending": return "待处理";
    case "processing": return "处理中";
    case "done": return "已完成";
    case "failed": return "失败";
  }
}

async function readMetadata(path: string): Promise<{ bytes: number; width: number; height: number; duration: number; previewUrl: string }> {
  let bytes = 0;
  try {
    const meta = await invoke<{ size: number }>("get_path_metadata", { path });
    bytes = Number(meta.size ?? 0);
  } catch {
    bytes = 0;
  }
  const previewUrl = isTauri() ? convertFileSrc(path) : "";
  const video = await loadVideoMetadata(previewUrl);
  return { bytes, ...video, previewUrl };
}

function loadVideoMetadata(src: string): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    if (!src) {
      resolve({ width: 0, height: 0, duration: 0 });
      return;
    }
    const video = document.createElement("video");
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        // ignore
      }
    };
    const onReady = () => {
      const result = {
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0
      };
      cleanup();
      resolve(result);
    };
    const onError = () => {
      cleanup();
      resolve({ width: 0, height: 0, duration: 0 });
    };
    video.preload = "metadata";
    video.muted = true;
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onError);
    video.src = src;
  });
}

async function appendPaths(paths: string[]) {
  const unique = paths.filter(isSupportedVideo).filter((path) => !items.value.some((item) => item.path === path));
  if (unique.length === 0) {
    hintMessage.value = "当前文件格式不支持";
    return;
  }
  hintMessage.value = "";
  for (const path of unique) {
    const metadata = await readMetadata(path);
    items.value.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      path,
      name: extractName(path),
      bytes: metadata.bytes,
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      previewUrl: metadata.previewUrl,
      status: "pending",
      regions: []
    });
  }
  if (!selectedId.value) selectedId.value = items.value[0]?.id ?? null;
}

async function pickFiles() {
  const selected = await open({
    multiple: true,
    filters: [{ name: "Video", extensions: supportedExtensions }]
  });
  if (!selected) return;
  await appendPaths(Array.isArray(selected) ? selected : [selected]);
}

async function pickOutputDir() {
  const dir = await open({ directory: true, multiple: false });
  if (!dir || Array.isArray(dir)) return;
  outputDir.value = dir;
}

function clearList() {
  if (isRunning.value) return;
  items.value = [];
  selectedId.value = null;
  hintMessage.value = "";
}

function removeItem(id: string) {
  if (isRunning.value) return;
  items.value = items.value.filter((item) => item.id !== id);
  if (selectedId.value === id) selectedId.value = items.value[0]?.id ?? null;
}

function clearRegions() {
  if (!selectedItem.value || isRunning.value) return;
  selectedItem.value.regions = [];
}

function removeRegion(regionId: string) {
  if (!selectedItem.value || isRunning.value) return;
  selectedItem.value.regions = selectedItem.value.regions.filter((region) => region.id !== regionId);
}

function applyMode(mode: RemovalMode) {
  hasManualModeSelection = true;
  removalMode.value = mode;
}

function syncRemovalModeWithAi(force = false) {
  if (hasInstalledAiRuntime.value) {
    if (force || !hasManualModeSelection) {
      removalMode.value = "ai";
    }
    return;
  }
  if (force && removalMode.value === "ai") {
    removalMode.value = "fast";
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDropActive.value = false;
  const files = Array.from(event.dataTransfer?.files ?? []);
  const paths = files.map((file) => (file as File & { path?: string }).path).filter(Boolean) as string[];
  if (paths.length > 0) void appendPaths(paths);
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  isDropActive.value = true;
}

function onDragLeave() {
  isDropActive.value = false;
}

async function setupNativeDrop() {
  if (!isTauri()) return;
  disposeDrop = await getCurrentWindow().onDragDropEvent((event) => {
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
      void appendPaths(event.payload.paths);
    }
  });
}

function pointerToPercent(event: PointerEvent, target: HTMLElement): { x: number; y: number } {
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
    y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
  };
}

function onPreviewPointerDown(event: PointerEvent) {
  if (!selectedItem.value || isRunning.value || event.button !== 0) return;
  const target = event.currentTarget as HTMLElement;
  dragStart = pointerToPercent(event, target);
  draftRegion.value = { id: "draft", x: dragStart.x, y: dragStart.y, width: 0, height: 0 };
  target.setPointerCapture(event.pointerId);
}

function onPreviewPointerMove(event: PointerEvent) {
  if (!selectedItem.value || !dragStart) return;
  const target = event.currentTarget as HTMLElement;
  const end = pointerToPercent(event, target);
  draftRegion.value = {
    id: "draft",
    x: Math.min(dragStart.x, end.x),
    y: Math.min(dragStart.y, end.y),
    width: Math.abs(end.x - dragStart.x),
    height: Math.abs(end.y - dragStart.y)
  };
}

function onPreviewPointerUp(event: PointerEvent) {
  if (!selectedItem.value || !dragStart) return;
  const region = draftRegion.value;
  if (region && region.width > 2 && region.height > 2) {
    selectedItem.value.regions.push({ ...region, id: `region-${Date.now()}` });
  }
  dragStart = null;
  draftRegion.value = null;
  (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
}

function onPreviewPointerCancel() {
  dragStart = null;
  draftRegion.value = null;
}

function updateVideoLayerSize() {
  const stage = previewStageRef.value;
  const item = selectedItem.value;
  if (!stage || !item) {
    videoLayerSize.value = { width: 0, height: 0 };
    return;
  }
  const rect = stage.getBoundingClientRect();
  const availableWidth = Math.max(0, rect.width);
  const availableHeight = Math.max(0, rect.height);
  const sourceWidth = item.width > 0 ? item.width : 16;
  const sourceHeight = item.height > 0 ? item.height : 9;
  const sourceRatio = sourceWidth / sourceHeight;
  if (availableWidth <= 0 || availableHeight <= 0 || !Number.isFinite(sourceRatio) || sourceRatio <= 0) {
    videoLayerSize.value = { width: 0, height: 0 };
    return;
  }
  let width = availableWidth;
  let height = width / sourceRatio;
  if (height > availableHeight) {
    height = availableHeight;
    width = height * sourceRatio;
  }
  videoLayerSize.value = {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height))
  };
}

function syncPreviewState() {
  const video = previewVideoRef.value;
  if (!video) return;
  previewCurrentTime.value = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  previewDuration.value = Number.isFinite(video.duration) ? video.duration : selectedItem.value?.duration || 0;
  isPreviewPlaying.value = !video.paused;
  isPreviewMuted.value = video.muted;
}

async function togglePreviewPlayback() {
  const video = previewVideoRef.value;
  if (!video) return;
  if (video.paused) {
    await video.play().catch(() => undefined);
  } else {
    video.pause();
  }
  syncPreviewState();
}

function togglePreviewMuted() {
  const video = previewVideoRef.value;
  if (!video) return;
  video.muted = !video.muted;
  syncPreviewState();
}

function seekPreview(event: Event) {
  const video = previewVideoRef.value;
  if (!video) return;
  const value = Number((event.target as HTMLInputElement).value);
  const duration = previewDuration.value || video.duration || 0;
  if (!Number.isFinite(value) || duration <= 0) return;
  video.currentTime = (value / 100) * duration;
  syncPreviewState();
}

async function requestPreviewFullscreen() {
  const target = previewVideoRef.value?.parentElement;
  if (!target?.requestFullscreen) return;
  await target.requestFullscreen().catch(() => undefined);
}

async function refreshAiRuntimeStatus(forceModeSync = false): Promise<void> {
  try {
    await aiRuntime.refresh(false);
    const status = await tauriClient.getAiModelStatus();
    runtimeDevice.value = status.runtimeDevice || "";
    torchVersion.value = status.torchVersion || "";
    syncRemovalModeWithAi(forceModeSync);
  } catch {
    runtimeDevice.value = "";
    torchVersion.value = "";
    syncRemovalModeWithAi(forceModeSync);
  }
}

async function ensureAiReady(): Promise<boolean> {
  await refreshAiRuntimeStatus();
  if (aiRuntime.status.value !== "INSTALLED" && aiRuntime.status.value !== "UPDATE_AVAILABLE") {
    hintMessage.value = aiRuntime.error.value || aiRuntime.environment.value?.reasons?.[0] || "AI 增强组件尚未就绪，请先安装或升级。";
    return false;
  }
  const status = await tauriClient.getAiModelStatus();
  runtimeDevice.value = status.runtimeDevice || "";
  torchVersion.value = status.torchVersion || "";
  if (!status.downloaded) {
    const downloadedStatus = await tauriClient.downloadAiModel("lama");
    runtimeDevice.value = downloadedStatus.runtimeDevice || runtimeDevice.value;
    torchVersion.value = downloadedStatus.torchVersion || torchVersion.value;
  }
  return true;
}

async function startRemoval() {
  if (isRunning.value || isSubmittingRemoval.value) return;
  if (!canStart.value) {
    hintMessage.value = items.value.length === 0 ? "请先添加视频" : "请先框选需要去除的区域";
    return;
  }

  const entitlement = await checkExportEntitlement("video-watermark-removal");
  if (!entitlement.allowed) {
    if (entitlement.reason === "no_entitlement" || entitlement.reason === "service_error") {
      hintMessage.value = t("common.entitlement.noEntitlement");
      await promptEntitlementUpgrade(router, t, "video-watermark-removal");
    }
    return;
  }

  const consume = await consumeExportEntitlement({
    tool: "video-watermark-removal",
    amount: Math.max(1, items.value.length),
    sourceId: items.value[0]?.id ?? "batch",
    idempotencyKey: `video-watermark-removal:batch:${items.value.length}:${items.value[0]?.id ?? "batch"}`
  });
  if (!consume.allowed) {
    if (consume.reason === "no_entitlement" || consume.reason === "service_error") {
      hintMessage.value = t("common.entitlement.noEntitlement");
      await promptEntitlementUpgrade(router, t, "video-watermark-removal");
    }
    return;
  }

  stopTimers();
  elapsedSeconds.value = 0;
  items.value.forEach((item) => {
    item.status = "pending";
    item.outputPath = undefined;
  });

  isSubmittingRemoval.value = true;
  try {
    if (removalMode.value === "ai") {
      const ready = await ensureAiReady();
      if (!ready) return;
    }
    const startedAt = Date.now();
    elapsedTimer = window.setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);
    }, 1000);

    await submit({
      taskType: "VIDEO_WATERMARK_REMOVAL",
      inputFiles: items.value.map((item) => item.path),
      outputDir: outputDir.value,
      options: {
        mode: removalMode.value,
        algorithm: defaultAlgorithm,
        radius: defaultRadius,
        regionsByFile: buildRegionsByFile()
      },
      concurrencyPreset: "balanced"
    });
  } catch (error) {
    stopTimers();
    const message = error instanceof Error ? error.message : String(error);
    hintMessage.value = message || "启动任务失败";
  } finally {
    isSubmittingRemoval.value = false;
  }
}

function stopTask() {
  void cancel();
  stopTimers();
  items.value.forEach((item) => {
    if (item.status === "processing") item.status = "pending";
  });
}

function stopTimers() {
  if (elapsedTimer != null) window.clearInterval(elapsedTimer);
  elapsedTimer = null;
}

async function openOutputDirectory() {
  await openBatchOutputDirectory(outputDir.value);
}

function buildRegionsByFile(): Record<string, Array<{ x: number; y: number; width: number; height: number }>> {
  const result: Record<string, Array<{ x: number; y: number; width: number; height: number }>> = {};
  const sharedRegions = selectedItem.value?.regions.length ? selectedItem.value.regions : null;
  for (const item of items.value) {
    const regions = sharedRegions ?? item.regions;
    result[item.path] = regions.map((region) => ({
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height
    }));
  }
  return result;
}

async function installAiRuntime() {
  try {
    runtimeActionError.value = "";
    await aiRuntime.installOrUpdate();
    await refreshAiRuntimeStatus(true);
  } catch (error) {
    runtimeActionError.value = error instanceof Error ? error.message : String(error);
  }
}

watch(selectedId, () => {
  previewCurrentTime.value = 0;
  previewDuration.value = selectedItem.value?.duration || 0;
  isPreviewPlaying.value = false;
  void nextTick(updateVideoLayerSize);
});

watch(
  () => progress.value,
  (payload) => {
    if (!payload) return;
    const currentFile = payload.currentFile?.replace(/\\/g, "/").toLowerCase();
    items.value.forEach((item) => {
      const itemPath = item.path.replace(/\\/g, "/").toLowerCase();
      if (currentFile && itemPath === currentFile && payload.status === "RUNNING") item.status = "processing";
      else if (item.status === "processing") item.status = "pending";
    });
  },
  { deep: true }
);

watch([result, failures], () => {
  const snapshot = result.value;
  if (!snapshot || snapshot.status === "RUNNING" || snapshot.status === "PENDING" || snapshot.status === "PAUSED") return;
  const failed = new Set(failures.value.map((failure) => failure.inputPath.replace(/\\/g, "/").toLowerCase()));
  const outputPaths = [...(snapshot.successOutputPaths ?? [])];
  items.value.forEach((item) => {
    const itemKey = item.path.replace(/\\/g, "/").toLowerCase();
    if (snapshot.status === "CANCELED") {
      item.status = "pending";
      item.outputPath = undefined;
      return;
    }
    if (failed.has(itemKey)) {
      item.status = "failed";
      item.outputPath = undefined;
      return;
    }
    item.status = "done";
    item.outputPath = outputPaths.shift();
  });
  if (snapshot.status === "FAILED") {
    hintMessage.value = failures.value[0]?.errorMessage || snapshot.message || "任务失败";
  }
  stopTimers();
});

onMounted(() => {
  void setupNativeDrop();
  void refreshAiRuntimeStatus();
  previewResizeObserver = new ResizeObserver(() => updateVideoLayerSize());
  if (previewShellRef.value) previewResizeObserver.observe(previewShellRef.value);
  window.addEventListener("resize", updateVideoLayerSize);
  void nextTick(updateVideoLayerSize);
});

onBeforeUnmount(() => {
  disposeDrop?.();
  previewResizeObserver?.disconnect();
  window.removeEventListener("resize", updateVideoLayerSize);
  stopTimers();
});
</script>

<template>
  <div class="video-watermark-removal-page">
    <div class="vw-workspace">
      <section class="vw-card vw-card--list">
        <div class="vw-card-head">
          <h3 class="vw-card-head__title">文件列表 ({{ items.length }})</h3>
          <div class="vw-card-head__actions">
            <button type="button" class="vw-btn vw-btn--small" @click="pickFiles"><Plus :size="15" />添加视频</button>
            <button type="button" class="vw-btn vw-btn--small" :disabled="items.length === 0 || isRunning" @click="clearList"><Trash2 :size="15" />清空列表</button>
          </div>
        </div>

        <div
          class="vw-drop"
          :class="{ 'vw-drop--compact': items.length > 0, 'vw-drop--active': isDropActive }"
          @click.self="pickFiles"
          @drop="handleDrop"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
        >
          <div class="vw-drop__art" aria-hidden="true">
            <Video :size="items.length ? 32 : 68" :stroke-width="1.5" />
            <span class="vw-drop__plus">+</span>
          </div>
          <p class="vw-drop__title">拖拽视频到此处，或点击<span @click.stop="pickFiles">添加视频</span></p>
          <p class="vw-drop__sub">支持 MP4 / MOV / WEBM / MKV / AVI / M4V / WMV</p>
        </div>

        <ul v-if="items.length" class="vw-file-list">
          <li v-for="item in items" :key="item.id" class="vw-file" :class="{ 'vw-file--selected': item.id === selectedId }" @click="selectedId = item.id">
            <div class="vw-file__thumb"><Video :size="22" /></div>
            <div class="vw-file__meta">
              <strong>{{ item.name }}</strong>
              <span>{{ formatBytes(item.bytes) }} · {{ formatDuration(item.duration) }}</span>
              <span>{{ item.width || "--" }} × {{ item.height || "--" }}</span>
            </div>
            <span class="vw-file__status" :data-status="item.status">{{ statusLabel(item.status) }}</span>
            <button type="button" class="vw-file__remove" :disabled="isRunning" @click.stop="removeItem(item.id)"><X :size="18" /></button>
          </li>
        </ul>

        <p v-if="hintMessage" class="vw-hint">{{ hintMessage }}</p>
        <footer class="vw-list-foot">
          <span>共 {{ items.length }} 个视频</span>
          <span>总大小 {{ formatBytes(totalBytes) }}</span>
        </footer>
      </section>

      <section class="vw-card vw-card--preview">
        <header class="vw-preview-head">
          <div>
            <h3 class="vw-card-head__title">{{ selectedItem?.name || "视频预览" }}</h3>
            <p class="vw-warning"><Info :size="14" />请在画面上直接框选要去除的水印区域</p>
          </div>
          <button type="button" class="vw-btn vw-btn--small" :disabled="!selectedItem || isRunning" @click="clearRegions">清除框选</button>
        </header>

        <div ref="previewShellRef" class="vw-canvas-shell">
          <div v-if="selectedItem" ref="previewStageRef" class="vw-stage">
            <div
              class="vw-video-layer"
              :style="videoLayerStyle"
              @pointerdown="onPreviewPointerDown"
              @pointermove="onPreviewPointerMove"
              @pointerup="onPreviewPointerUp"
              @pointercancel="onPreviewPointerCancel"
            >
              <video
                ref="previewVideoRef"
                class="vw-stage__video"
                :src="selectedItem.previewUrl"
                :muted="isPreviewMuted"
                playsinline
                preload="metadata"
                @loadedmetadata="() => { syncPreviewState(); updateVideoLayerSize(); }"
                @timeupdate="syncPreviewState"
                @play="syncPreviewState"
                @pause="syncPreviewState"
                @ended="syncPreviewState"
              />
              <div v-for="region in selectedItem.regions" :key="region.id" class="vw-region" :style="{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }">
                <button type="button" :disabled="isRunning" @pointerdown.stop @click.stop="removeRegion(region.id)"><X :size="11" /></button>
              </div>
              <div v-if="draftRegion" class="vw-region vw-region--draft" :style="{ left: `${draftRegion.x}%`, top: `${draftRegion.y}%`, width: `${draftRegion.width}%`, height: `${draftRegion.height}%` }" />
            </div>
          </div>
          <div v-else class="vw-empty-preview">
            <div class="vw-empty-preview__art"><Video :size="92" :stroke-width="1.2" /></div>
            <strong>暂无视频</strong>
            <span>请先从左侧添加视频再进行框选</span>
          </div>
        </div>

        <div v-if="selectedItem" class="vw-player-controls">
          <button type="button" class="vw-player-button" @click="togglePreviewPlayback">
            <PauseCircle v-if="isPreviewPlaying" :size="18" />
            <PlayCircle v-else :size="18" />
          </button>
          <span class="vw-player-time">{{ formatDuration(previewCurrentTime) }}</span>
          <input class="vw-player-seek" type="range" min="0" max="100" step="0.1" :value="previewProgress" :style="{ '--preview-progress': `${previewProgress}%` }" @input="seekPreview" />
          <span class="vw-player-time">{{ formatDuration(previewDuration || selectedItem.duration) }}</span>
          <button type="button" class="vw-player-button" @click="togglePreviewMuted">
            <VolumeX v-if="isPreviewMuted" :size="18" />
            <Volume2 v-else :size="18" />
          </button>
          <button type="button" class="vw-player-button" @click="requestPreviewFullscreen"><Maximize2 :size="18" /></button>
        </div>

        <footer class="vw-preview-foot">
          <p><Info :size="14" />预览区已放大，建议先暂停视频再框选。</p>
          <span v-if="selectedItem">已选择 {{ selectedItem.regions.length }} 个区域</span>
        </footer>
      </section>

      <section class="vw-card vw-card--mode">
        <div class="vw-card-head">
          <h3 class="vw-card-head__title">处理模式</h3>
        </div>
        <div class="vw-segment">
          <button type="button" :class="{ on: removalMode === 'fast' }" @click="applyMode('fast')">极速模式</button>
          <button type="button" :class="{ on: removalMode === 'ai' }" @click="applyMode('ai')">AI 增强模式</button>
        </div>
        <p class="vw-muted" v-if="removalMode === 'fast'">无需下载 AI 组件，适合简单背景、纯色背景、边角水印和小面积水印。</p>
        <p class="vw-muted" v-else>适合复杂背景和更自然的修复效果。组件仅安装一次，文件不会上传服务器。</p>

        <div class="vw-mode-box">
          <strong>AI 组件状态</strong>
          <span>{{ aiRuntimeStatusText }}</span>
          <p v-if="aiInstallHint">{{ aiInstallHint }}</p>
          <p v-if="aiRuntimeProgress" class="vw-muted">{{ aiProgressSummaryLabel }}，{{ aiDownloadSpeedLabel }}/s</p>
          <p v-if="aiRuntimeProgress" class="vw-mode-progress">{{ aiProgressSummaryLabel }} | {{ aiDownloadSpeedLabel }}/s</p>
          <p v-if="runtimeActionError" class="vw-warning"><Info :size="14" />{{ runtimeActionError }}</p>
          <div class="vw-mode-actions">
            <button
              v-if="aiRuntimeStatus === 'READY_TO_INSTALL' && aiRuntimeHasManifestSource"
              type="button"
              class="vw-btn vw-btn--small"
              @click="installAiRuntime"
            >
              安装 AI 增强组件
            </button>
            <button v-else-if="aiRuntimeStatus === 'READY_TO_INSTALL'" type="button" class="vw-btn vw-btn--small" disabled>升级当前版本后可一键安装</button>
            <button v-if="aiRuntimeStatus === 'UPDATE_AVAILABLE'" type="button" class="vw-btn vw-btn--small" @click="installAiRuntime">一键升级 AI 组件</button>
            <button v-if="aiRuntimeStatus === 'FAILED'" type="button" class="vw-btn vw-btn--small" @click="installAiRuntime">重试</button>
          </div>
        </div>
      </section>
    </div>

    <section class="vw-bottom">
      <div class="vw-bottom__summary">
        <div class="vw-ring" :style="{ '--p': progressPercent }"><span>{{ Math.round(progressPercent) }}%</span></div>
        <div class="vw-bottom__metrics">
          <h3>{{ progressTitle }}</h3>
          <dl class="vw-metrics-grid">
            <div>
              <dt>当前文件</dt>
              <dd>{{ currentProgressItem?.name || "--" }}</dd>
            </div>
            <div>
              <dt>预计剩余</dt>
              <dd>{{ remainingTime }}</dd>
            </div>
            <div>
              <dt>已用时间</dt>
              <dd>{{ isRunning || elapsedSeconds > 0 ? formatDuration(elapsedSeconds) : "--:--:--" }}</dd>
            </div>
            <div>
              <dt>处理引擎</dt>
              <dd>{{ processingEngineLabel }}</dd>
            </div>
            <div class="vw-metrics-grid__progress">
              <dt>总体进度</dt>
              <dd><span>{{ Math.round(progressPercent) }}%</span><i class="vw-progress-line"><i :style="{ width: `${progressPercent}%` }" /></i></dd>
            </div>
          </dl>
        </div>
      </div>
      <div class="vw-bottom__footer">
        <div class="vw-bottom__output">
          <label>输出目录</label>
          <div class="vw-bottom__output-row">
            <input v-model="outputDir" :disabled="isRunning" />
            <button type="button" :disabled="isRunning" @click="pickOutputDir"><Folder :size="18" /></button>
          </div>
        </div>
        <div class="vw-bottom__actions">
          <button type="button" class="vw-action" :disabled="!result?.successOutputPaths?.length" @click="openOutputDirectory"><Folder :size="18" />打开目录</button>
          <button v-if="isRunning" type="button" class="vw-action" @click="stopTask"><PauseCircle :size="18" />停止任务</button>
          <button v-else type="button" class="vw-action vw-action--primary" :disabled="!canStart" @click="startRemoval"><PlayCircle :size="18" />开始去水印</button>
        </div>
      </div>
    </section>
    <div v-if="['DOWNLOADING', 'VERIFYING', 'INSTALLING'].includes(aiRuntimeStatus)" class="vw-model-loading" role="status" aria-live="polite">
      <div class="vw-model-loading__panel">
        <strong>AI 增强组件处理中</strong>
        <span>{{ aiRuntimeProgress?.message || aiRuntimeStatusText }}</span>
        <div class="vw-model-loading__bar"><i :style="{ width: `${aiProgressPercent}%` }" /></div>
        <div class="vw-model-loading__meta">
          <span>{{ aiProgressSummaryLabel }}</span>
          <span>{{ aiDownloadSpeedLabel }}/s</span>
          <span v-if="torchVersion">Torch {{ torchVersion }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-watermark-removal-page {
  --surface: #ffffff;
  --surface-muted: #f6f8fc;
  --border: #e7ebf3;
  --border-strong: #d8dfec;
  --text: #101936;
  --muted: #667292;
  --primary: #1769f6;
  --primary-soft: #eaf2ff;
  --warning: #f59e0b;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 8px 18px 10px;
  overflow: hidden;
  color: var(--text);
  background: var(--surface-muted);
  box-sizing: border-box;
}

.vw-workspace {
  display: grid;
  grid-template-columns: minmax(280px, 0.78fr) minmax(760px, 2.5fr) minmax(260px, 0.72fr);
  gap: 12px;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.vw-card {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(27, 46, 94, 0.04);
  overflow: hidden;
}

.vw-card--list,
.vw-card--preview,
.vw-card--mode {
  padding: 16px;
}

.vw-card--preview {
  min-height: 0;
}

.vw-card-head,
.vw-preview-head,
.vw-card-head__actions,
.vw-preview-foot,
.vw-bottom__summary,
.vw-bottom__output,
.vw-bottom__actions,
.vw-mode-actions {
  display: flex;
  align-items: center;
}

.vw-card-head,
.vw-preview-head {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.vw-card-head__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.vw-card-head__actions,
.vw-mode-actions {
  gap: 8px;
  flex-wrap: wrap;
}

.vw-btn,
.vw-action,
.vw-segment button {
  border: 1px solid var(--border-strong);
  background: #fff;
  color: #18244a;
  border-radius: 6px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.vw-btn {
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
}

.vw-btn--small {
  height: 34px;
  font-size: 13px;
}

button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.vw-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 18px;
  border: 1px dashed #cbd6ea;
  border-radius: 8px;
  background: #fbfdff;
  text-align: center;
}

.vw-drop--compact {
  min-height: 72px;
}

.vw-drop--active {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.vw-drop__art {
  position: relative;
  color: #2d72f6;
  margin-bottom: 10px;
}

.vw-drop__plus {
  position: absolute;
  right: -6px;
  bottom: -4px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--primary);
  font-size: 18px;
}

.vw-drop__title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 700;
}

.vw-drop__title span {
  color: var(--primary);
  cursor: pointer;
}

.vw-drop__sub,
.vw-muted,
.vw-hint,
.vw-list-foot,
.vw-warning,
.vw-preview-foot,
.vw-mode-box span,
.vw-mode-box p {
  color: var(--muted);
  font-size: 13px;
}

.vw-file-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 12px 0 0;
  list-style: none;
}

.vw-file {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto 28px;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}

.vw-file--selected {
  border-color: var(--primary);
  background: #fbfdff;
}

.vw-file__thumb {
  width: 58px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: #2d72f6;
  background: #eef4ff;
}

.vw-file__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vw-file__meta strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.vw-file__meta span {
  color: #5f6c8d;
  font-size: 12px;
}

.vw-file__status {
  padding: 6px 9px;
  border-radius: 5px;
  color: var(--primary);
  background: #eaf2ff;
  font-size: 12px;
  font-weight: 700;
}

.vw-file__status[data-status="done"] {
  color: #059669;
  background: #e8f8f1;
}

.vw-file__status[data-status="failed"] {
  color: #dc2626;
  background: #fee2e2;
}

.vw-file__remove {
  width: 28px;
  height: 28px;
  border: 0;
  background: transparent;
  color: #1f2a55;
}

.vw-list-foot,
.vw-preview-foot {
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}

.vw-warning,
.vw-preview-foot p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.vw-warning {
  color: var(--warning);
}

.vw-canvas-shell {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fbfcff;
  overflow: hidden;
}

.vw-stage {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vw-video-layer {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
}

.vw-stage__video {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  background: #111827;
}

.vw-player-controls {
  --preview-progress: 0%;
  display: grid;
  grid-template-columns: 34px auto minmax(120px, 1fr) auto 34px 34px;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #fff;
  background: #111827;
}

.vw-player-button {
  width: 34px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 5px;
  color: #fff;
  background: transparent;
}

.vw-player-time {
  min-width: 54px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
}

.vw-player-seek {
  width: 100%;
  height: 18px;
  margin: 0;
  accent-color: #ffffff;
}

.vw-region {
  position: absolute;
  border: 1px dashed #111827;
  background: rgba(37, 99, 235, 0.1);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.82) inset;
}

.vw-region--draft {
  pointer-events: none;
}

.vw-region::before,
.vw-region::after {
  content: "";
  position: absolute;
  width: 7px;
  height: 7px;
  border: 1px solid #111827;
  background: #ffffff;
}

.vw-region::before {
  left: -4px;
  top: -4px;
}

.vw-region::after {
  right: -4px;
  bottom: -4px;
}

.vw-region button {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid #111827;
  border-radius: 2px;
  color: #111827;
  background: #ffffff;
}

.vw-empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #1d274c;
}

.vw-empty-preview__art {
  height: 136px;
  width: 160px;
  display: grid;
  place-items: center;
  color: #cbd9f4;
}

.vw-card--mode {
  gap: 14px;
}

.vw-segment {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.vw-segment button {
  height: 40px;
}

.vw-segment button.on,
.vw-action--primary {
  color: #fff;
  border-color: var(--primary);
  background: var(--primary);
}

.vw-mode-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fbfcff;
}

.vw-mode-box strong {
  font-size: 14px;
}

.vw-mode-box > p.vw-muted {
  display: none;
}

.vw-mode-progress {
  color: var(--muted);
  font-size: 13px;
}

.vw-bottom {
  flex: 0 0 auto;
  min-height: 168px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 24px 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}

.vw-bottom__summary {
  gap: 18px;
}

.vw-ring {
  --p: 0;
  width: 82px;
  height: 82px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(#7aa3ff calc(var(--p) * 1%), #edf1f7 0);
}

.vw-ring span {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #111936;
  background: #fff;
  font-size: 18px;
  font-weight: 800;
}

.vw-bottom__metrics {
  flex: 1;
  min-width: 0;
}

.vw-bottom__metrics h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 800;
}

.vw-metrics-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) minmax(110px, 0.8fr) minmax(110px, 0.8fr) minmax(160px, 1fr) minmax(240px, 1.6fr);
  gap: 18px;
  margin: 0;
}

.vw-metrics-grid dt {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 800;
}

.vw-metrics-grid dd {
  margin: 0;
  overflow: hidden;
  color: #5c698a;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vw-metrics-grid__progress dd {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  gap: 10px;
  align-items: center;
}

.vw-progress-line {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf1f7;
}

.vw-progress-line i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.vw-bottom__footer {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding-top: 16px;
  border-top: 1px solid #eef2f7;
}

.vw-bottom__output {
  gap: 10px;
  min-width: 0;
}

.vw-bottom__output label {
  flex: 0 0 auto;
  font-size: 15px;
  font-weight: 700;
}

.vw-bottom__output-row {
  width: min(420px, 100%);
  flex: 0 1 420px;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
}

.vw-bottom__output-row input,
.vw-bottom__output-row button {
  height: 42px;
  border: 1px solid var(--border-strong);
  background: #fff;
}

.vw-bottom__output-row input {
  min-width: 0;
  padding: 0 12px;
  border-right: 0;
  border-radius: 6px 0 0 6px;
  color: #1f2a55;
  font: inherit;
}

.vw-bottom__output-row button {
  display: grid;
  place-items: center;
  border-radius: 0 6px 6px 0;
  color: #1f2a55;
}

.vw-bottom__actions {
  justify-content: flex-end;
  gap: 10px;
}

.vw-action {
  min-width: 142px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
}

.vw-model-loading {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(6px);
}

.vw-model-loading__panel {
  width: min(520px, calc(100vw - 48px));
  display: grid;
  gap: 12px;
  padding: 22px 24px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 18px;
  color: #0f172a;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 32px 80px rgba(15, 23, 42, 0.18);
}

.vw-model-loading__panel strong {
  font-size: 18px;
}

.vw-model-loading__bar {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5edf9;
}

.vw-model-loading__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1769f6, #5ca5ff);
}

.vw-model-loading__meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #52617f;
  font-size: 13px;
}

.video-watermark-removal-page,
.vw-file-list {
  scrollbar-width: thin;
  scrollbar-color: #c9d4e8 transparent;
}

@media (max-width: 1480px) {
  .vw-workspace {
    grid-template-columns: minmax(260px, 0.82fr) minmax(620px, 2.15fr) minmax(240px, 0.7fr);
  }
}

@media (max-width: 1120px) {
  .vw-workspace {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .vw-canvas-shell {
    min-height: 0;
  }

  .vw-bottom__footer {
    grid-template-columns: 1fr;
  }

  .vw-bottom__actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .vw-metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
