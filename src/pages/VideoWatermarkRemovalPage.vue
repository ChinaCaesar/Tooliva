<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useRouter } from "vue-router";
import { Folder, Info, Maximize2, PauseCircle, PlayCircle, Trash2, Video, Volume2, VolumeX, X } from "@lucide/vue";
import AiEnhancementStatusPanel from "@/components/ai-runtime/AiEnhancementStatusPanel.vue";
import AiRuntimeInstallLoadingOverlay from "@/components/ai-runtime/AiRuntimeInstallLoadingOverlay.vue";
import { useInterruptOnRouteLeave } from "@/composables/useInterruptOnRouteLeave";
import { useAiEnhancementPanel } from "@/modules/ai-runtime/useAiEnhancementPanel";
import { useBatchTask } from "@/modules/batch";
import { useTaskBatchNotification } from "@/pages/shared/useTaskBatchNotification";
import {
  checkExportEntitlement,
  consumeExportEntitlement,
  promptEntitlementUpgrade
} from "@/modules/entitlement/exportEntitlementGuard";

const { t, locale } = useI18n();
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
const aiPanel = useAiEnhancementPanel();
const {
  aiRuntime,
  hasInstalledAiRuntime,
  aiRuntimeProgress,
  isRuntimeBusy,
  aiRuntimeStatusText,
  runtimeDevice,
  torchVersion,
  refreshStatus,
  ensureRuntimeReady,
  ensureModelReady
} = aiPanel;
const { submit, cancel, openOutputDirectory: openBatchOutputDirectory, progress, isRunning, result, failures } = useBatchTask();
const { notifyTaskBatchCompleted } = useTaskBatchNotification();
const lastNotifiedTaskId = ref<string | null>(null);

useInterruptOnRouteLeave({
  when: () => isRunning.value,
  message: () =>
    locale.value.startsWith("zh")
      ? "当前页面任务正在进行，切换页面会中断任务。确定切换吗？"
      : "A task is still running on this page. Switching pages will interrupt it. Continue?",
  interrupt: async () => {
    await cancel();
    stopTimers();
  }
});

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
    return hasInstalledAiRuntime.value;
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
const processingEngineLabel = computed(() => {
  if (removalMode.value === "fast") return t("pages.videoWatermarkRemoval.engine.fastLocal");
  return runtimeDevice.value
    ? `${runtimeDevice.value.toUpperCase()}${torchVersion.value ? ` / Torch ${torchVersion.value}` : ""}`
    : t("pages.videoWatermarkRemoval.engine.aiEnhanced");
});
const progressTitle = computed(() => {
  if (progress.value?.message && isRunning.value) return progress.value.message;
  if (!isRunning.value) return t("pages.videoWatermarkRemoval.progressPanel.idleTitle");
  const current = Math.min((progress.value?.finished ?? 0) + 1, items.value.length);
  return t("pages.videoWatermarkRemoval.progressPanel.processingTitle", { current, total: items.value.length });
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
  return t(`pages.videoWatermarkRemoval.status.${status}`);
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
    hintMessage.value = t("pages.videoWatermarkRemoval.hints.unsupportedFormats");
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
    filters: [{ name: t("pages.videoWatermarkRemoval.filePicker.videoFilter"), extensions: supportedExtensions }]
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

async function ensureAiReady(): Promise<boolean> {
  const ready = await ensureRuntimeReady();
  if (!ready) {
    hintMessage.value =
      aiRuntime.error.value || aiRuntime.environment.value?.reasons?.[0] || t("aiEnhancement.errors.notReady");
    return false;
  }
  try {
    await ensureModelReady();
    return true;
  } catch (error) {
    hintMessage.value = error instanceof Error ? error.message : String(error);
    return false;
  }
}

async function startRemoval() {
  if (isRunning.value || isSubmittingRemoval.value) return;
  if (!canStart.value) {
    hintMessage.value =
      items.value.length === 0
        ? t("pages.videoWatermarkRemoval.hints.addVideoFirst")
        : t("pages.videoWatermarkRemoval.hints.selectRegionFirst");
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
  lastNotifiedTaskId.value = null;
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
    hintMessage.value = message || t("pages.videoWatermarkRemoval.hints.startTaskFailed");
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

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${mins}m ${remain}s`;
}

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
    hintMessage.value = failures.value[0]?.errorMessage || snapshot.message || t("pages.videoWatermarkRemoval.hints.taskFailed");
  }
  if (snapshot.status === "FINISHED" || snapshot.status === "FAILED") {
    if (lastNotifiedTaskId.value !== snapshot.taskId) {
      lastNotifiedTaskId.value = snapshot.taskId;
      const elapsedMs =
        snapshot.finishedAtMs && snapshot.startedAtMs
          ? snapshot.finishedAtMs - snapshot.startedAtMs
          : elapsedSeconds.value * 1000;
      notifyTaskBatchCompleted(
        "pages.videoWatermarkRemoval.title",
        {
          total: snapshot.total,
          success: snapshot.success,
          failed: snapshot.failed,
          elapsedMs
        },
        formatElapsed(elapsedMs)
      );
    }
  }
  stopTimers();
});

onMounted(() => {
  void setupNativeDrop();
  void refreshStatus(() => syncRemovalModeWithAi());
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
      <section class="vw-card vw-card--list" aria-labelledby="vw-list-title">
        <div class="vw-card-head">
          <h3 id="vw-list-title" class="vw-card-head__title">{{ t("pages.videoWatermarkRemoval.list.title", { count: items.length }) }}</h3>
          <div class="vw-card-head__actions">
            <button type="button" class="vw-btn vw-btn--small" :disabled="items.length === 0 || isRunning" @click="clearList">
              <Trash2 :size="15" />{{ t("pages.videoWatermarkRemoval.list.clearList") }}
            </button>
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
            <Video :size="items.length ? 34 : 72" :stroke-width="1.6" />
            <span class="vw-drop__plus">+</span>
          </div>
          <p class="vw-drop__title">
            {{ t("pages.videoWatermarkRemoval.list.dropHint") }}<span @click.stop="pickFiles">{{ t("pages.videoWatermarkRemoval.list.dropAddLink") }}</span>
          </p>
          <p class="vw-drop__sub">{{ t("pages.videoWatermarkRemoval.list.formatsLine") }}</p>
          <template v-if="items.length === 0">
            <strong class="vw-drop__batch">{{ t("pages.videoWatermarkRemoval.list.batchImport") }}</strong>
            <p class="vw-drop__sub">{{ t("pages.videoWatermarkRemoval.list.sharedRegionHint") }}</p>
          </template>
        </div>

        <ul v-if="items.length" class="vw-file-list">
          <li
            v-for="item in items"
            :key="item.id"
            class="vw-file"
            :class="{ 'vw-file--selected': item.id === selectedId }"
            @click="selectedId = item.id"
          >
            <div v-if="item.previewUrl" class="vw-file__thumb-shell" aria-hidden="true">
              <video class="vw-file__thumb" :src="item.previewUrl" muted playsinline preload="metadata" tabindex="-1" />
            </div>
            <div v-else class="vw-file__thumb--placeholder" aria-hidden="true">
              <Video :size="22" />
            </div>
            <div class="vw-file__meta">
              <strong>{{ item.name }}</strong>
              <span>{{ formatBytes(item.bytes) }} · {{ formatDuration(item.duration) }}</span>
              <span>{{ item.width || "--" }} × {{ item.height || "--" }}</span>
            </div>
            <span class="vw-file__status" :data-status="item.status">{{ statusLabel(item.status) }}</span>
            <button
              type="button"
              class="vw-file__remove"
              :disabled="isRunning"
              :title="t('pages.videoWatermarkRemoval.list.removeItem')"
              :aria-label="t('pages.videoWatermarkRemoval.list.removeItem')"
              @click.stop="removeItem(item.id)"
            >
              <X :size="18" />
            </button>
          </li>
        </ul>

        <p v-if="hintMessage" class="vw-hint">{{ hintMessage }}</p>
        <footer class="vw-list-foot">
          <span>{{ t("pages.videoWatermarkRemoval.list.totalVideos", { count: items.length }) }}</span>
          <span>{{ t("pages.videoWatermarkRemoval.list.totalSize", { size: formatBytes(totalBytes) }) }}</span>
        </footer>
      </section>

      <section class="vw-card vw-card--preview">
        <header class="vw-preview-head">
          <div>
            <h3 class="vw-card-head__title">{{ selectedItem?.name || t("pages.videoWatermarkRemoval.preview.titleFallback") }}</h3>
            <p class="vw-warning"><Info :size="14" />{{ t("pages.videoWatermarkRemoval.preview.instruction") }}</p>
          </div>
          <button type="button" class="vw-btn vw-btn--small" :disabled="!selectedItem || isRunning" @click="clearRegions">{{ t("pages.videoWatermarkRemoval.preview.clearRegions") }}</button>
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
            <strong>{{ t("pages.videoWatermarkRemoval.preview.emptyTitle") }}</strong>
            <span>{{ t("pages.videoWatermarkRemoval.preview.emptyDesc") }}</span>
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
          <p><Info :size="14" />{{ t("pages.videoWatermarkRemoval.preview.footTipPause") }}</p>
          <span v-if="selectedItem">{{ t("pages.videoWatermarkRemoval.preview.regionsSelected", { count: selectedItem.regions.length }) }}</span>
        </footer>
      </section>

      <section class="vw-card vw-card--mode">
        <div class="vw-card-head">
          <h3 class="vw-card-head__title">{{ t("pages.videoWatermarkRemoval.mode.title") }}</h3>
        </div>
        <div class="mode-options" role="radiogroup" :aria-label="t('pages.videoWatermarkRemoval.mode.ariaLabel')">
          <label class="mode-option" :class="{ 'mode-option--active': removalMode === 'fast' }">
            <input type="radio" name="videoRemovalMode" value="fast" :checked="removalMode === 'fast'" @change="applyMode('fast')" />
            <span>{{ t("pages.videoWatermarkRemoval.mode.fast") }}</span>
          </label>
          <label class="mode-option" :class="{ 'mode-option--active': removalMode === 'ai' }">
            <input type="radio" name="videoRemovalMode" value="ai" :checked="removalMode === 'ai'" @change="applyMode('ai')" />
            <span>{{ t("pages.videoWatermarkRemoval.mode.ai") }}</span>
          </label>
        </div>
        <p class="vw-muted" v-if="removalMode === 'fast'">{{ t("pages.videoWatermarkRemoval.mode.fastHint") }}</p>
        <p class="vw-muted" v-else>{{ t("pages.videoWatermarkRemoval.mode.aiHint") }}</p>

        <div class="vw-engine">
          <span class="vw-engine__label">{{ t("pages.videoWatermarkRemoval.mode.engineLabel") }}</span>
          <span class="vw-engine__value">{{ processingEngineLabel }}</span>
        </div>

        <AiEnhancementStatusPanel @synced="syncRemovalModeWithAi(true)" />
      </section>
    </div>

    <footer class="vw-bottom">
      <div class="vw-bottom__summary">
        <div class="vw-ring" :style="{ '--p': progressPercent }"><span>{{ Math.round(progressPercent) }}%</span></div>
        <div class="vw-bottom__metrics">
          <h3>{{ t("pages.videoWatermarkRemoval.bottomBar.overallProgress") }}</h3>
          <dl class="vw-metrics-grid">
            <div>
              <dt>{{ t("pages.videoWatermarkRemoval.bottomBar.status") }}</dt>
              <dd>{{ isRunning ? progressTitle : t("pages.videoWatermarkRemoval.progressPanel.idleTitle") }}</dd>
            </div>
            <div>
              <dt>{{ t("pages.videoWatermarkRemoval.bottomBar.currentFile") }}</dt>
              <dd>{{ currentProgressItem?.name || "--" }}</dd>
            </div>
            <div>
              <dt>{{ t("pages.videoWatermarkRemoval.bottomBar.estimatedRemaining") }}</dt>
              <dd>{{ remainingTime }}</dd>
            </div>
            <div>
              <dt>{{ t("pages.videoWatermarkRemoval.bottomBar.elapsed") }}</dt>
              <dd>{{ isRunning || elapsedSeconds > 0 ? formatDuration(elapsedSeconds) : "--:--:--" }}</dd>
            </div>
            <div class="vw-metrics-grid__progress">
              <dt>{{ t("pages.videoWatermarkRemoval.bottomBar.progressDetail") }}</dt>
              <dd>
                <span>{{ isRunning ? `${Math.round(progressPercent)}%` : "--" }}</span>
                <div class="vw-progress-line"><i :style="{ width: `${progressPercent}%` }" /></div>
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <div class="vw-bottom__footer">
        <div class="vw-bottom__output">
          <label>{{ t("pages.videoWatermarkRemoval.bottomBar.outputDirLabel") }}</label>
          <div class="vw-bottom__output-row">
            <input v-model="outputDir" :disabled="isRunning" />
            <button type="button" :disabled="isRunning" @click="pickOutputDir"><Folder :size="18" /></button>
          </div>
        </div>
        <div class="vw-bottom__actions">
          <button type="button" class="vw-action" :disabled="!result?.successOutputPaths?.length" @click="openOutputDirectory"><Folder :size="18" />{{ t("pages.videoWatermarkRemoval.bottomBar.openOutput") }}</button>
          <button v-if="isRunning" type="button" class="vw-action" @click="stopTask"><PauseCircle :size="18" />{{ t("pages.videoWatermarkRemoval.bottomBar.stopTask") }}</button>
          <button v-else type="button" class="vw-action vw-action--primary" :disabled="!canStart" @click="startRemoval"><PlayCircle :size="18" />{{ t("pages.videoWatermarkRemoval.bottomBar.start") }}</button>
        </div>
      </div>
    </footer>
    <AiRuntimeInstallLoadingOverlay
      v-if="isRuntimeBusy"
      :title="t('aiEnhancement.overlay.processingTitle')"
      :message="aiRuntimeProgress?.message || aiRuntimeStatusText"
    />
  </div>
</template>

<style scoped>
.video-watermark-removal-page {
  --surface: #ffffff;
  --surface-muted: #f5f6fa;
  --border: #eef0f4;
  --border-weak: #e7e9ee;
  --border-strong: #e7e9ee;
  --text: #1f2937;
  --text-secondary: #4b5563;
  --text-muted: #6b7280;
  --text-hint: #9ca3af;
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-soft: #f5f6fa;
  --accent-link: #f97316;
  --accent-link-hover: #ea580c;
  --cta-shadow: 0 4px 12px rgba(243, 132, 30, 0.25);
  --warning: #f59e0b;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 14px 18px 10px;
  overflow: hidden;
  color: var(--text);
  background: var(--surface-muted);
  box-sizing: border-box;
  letter-spacing: 0;
}

.vw-workspace {
  display: grid;
  grid-template-columns: minmax(240px, 0.72fr) minmax(420px, 1.55fr) minmax(240px, 0.78fr);
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
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  overflow: hidden;
}

.vw-card--list,
.vw-card--preview,
.vw-card--mode {
  padding: clamp(12px, 1.5vh, 18px);
}

.vw-card--list {
  overflow: hidden;
}

.vw-card--preview {
  min-height: 0;
}

.vw-card-head,
.vw-preview-head,
.vw-card-head__actions,
.vw-preview-foot,
.vw-bottom,
.vw-bottom__summary,
.vw-bottom__output,
.vw-bottom__actions {
  display: flex;
  align-items: center;
}

.vw-card-head,
.vw-preview-head {
  flex: 0 0 auto;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: clamp(8px, 1.2vh, 14px);
}

.vw-card-head__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
  letter-spacing: 0;
}

.vw-card-head__actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.vw-btn,
.vw-action {
  border: 1px solid var(--border-weak);
  background: #fff;
  color: var(--text-secondary);
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;
}

.vw-btn:focus-visible,
.vw-action:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.vw-btn {
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  white-space: nowrap;
}

.vw-btn--small {
  height: 34px;
  padding: 0 12px;
  font-size: 12px;
}

.vw-btn:hover:not(:disabled) {
  border-color: #dbeafe;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.06);
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
  min-height: 0;
  flex: 1;
  padding: 22px 18px;
  border: 1px dashed #d6d9e0;
  border-radius: 14px;
  background: #fafbfd;
  text-align: center;
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.vw-drop--compact {
  flex: 0 1 auto;
  min-height: 62px;
  flex-direction: row;
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 10px;
  padding: 10px 12px;
  text-align: left;
}

.vw-drop--compact .vw-drop__art {
  flex: 0 0 auto;
  margin-bottom: 0;
}

.vw-drop--compact .vw-drop__plus {
  right: -8px;
  bottom: -5px;
  width: 20px;
  height: 20px;
  font-size: 16px;
}

.vw-drop--compact .vw-drop__title {
  margin: 0;
  font-size: 13px;
}

.vw-drop--compact .vw-drop__sub,
.vw-drop--compact .vw-drop__batch {
  display: none;
}

.vw-drop--active {
  border-color: #c7d2fe;
  background: var(--surface-muted);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.vw-drop__art {
  position: relative;
  color: var(--primary);
  opacity: 0.85;
  margin-bottom: 10px;
}

.vw-drop__plus {
  position: absolute;
  right: -6px;
  bottom: -4px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--primary);
  font-size: 22px;
  line-height: 1;
}

.vw-drop__title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.vw-drop__batch {
  margin-top: clamp(12px, 5vh, 28px);
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.vw-drop__title span {
  color: var(--primary);
  cursor: pointer;
}

.vw-drop__sub,
.vw-muted,
.vw-list-foot,
.vw-preview-foot {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.vw-hint {
  color: #ef4444;
  font-size: 13px;
  line-height: 1.45;
}

.vw-file-list {
  flex: 1 1 96px;
  min-height: 72px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vw-file {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto 28px;
  align-items: center;
  gap: 10px;
  min-height: 68px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}

.vw-file--selected {
  border-color: #c7d2fe;
  background: #fafbfd;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.08);
}

.vw-file__thumb-shell {
  width: 72px;
  height: 52px;
  overflow: hidden;
  border-radius: 6px;
  background: #eef2f8;
}

.vw-file__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}

.vw-file__thumb--placeholder {
  width: 72px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: var(--primary);
  background: #f5f6fa;
}

.vw-file__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.vw-file__meta strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.vw-file__meta span {
  color: var(--text-muted);
  font-size: 12px;
}

.vw-file__status {
  padding: 6px 9px;
  border-radius: 8px;
  color: var(--primary);
  background: #f5f6fa;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
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
  color: var(--text-secondary);
  cursor: pointer;
}

.vw-list-foot,
.vw-preview-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.vw-list-foot {
  flex: 0 0 auto;
  padding-top: 14px;
  margin-top: auto;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-muted);
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
  font-size: 13px;
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
  border-radius: 14px;
  background: #fafbfd;
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
  color: var(--text);
}

.vw-empty-preview strong {
  font-size: 14px;
  font-weight: 600;
}

.vw-empty-preview span {
  font-size: 13px;
  color: var(--text-secondary);
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
  overflow: auto;
}

.mode-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-option {
  position: relative;
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  background: var(--surface-muted);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s,
    box-shadow 0.15s;
}

.mode-option:hover:not(.mode-option--active) {
  border-color: #dbeafe;
  background: #fafbfd;
}

.mode-option--active {
  border-color: #c7d2fe;
  background: #fafbfd;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.08);
  color: var(--primary);
  font-weight: 600;
}

.mode-option input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.vw-bottom {
  flex: 0 0 auto;
  min-height: 176px;
  flex-direction: column;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
}

.vw-bottom__summary {
  width: 100%;
  min-width: 0;
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
  background: conic-gradient(var(--primary) calc(var(--p) * 1%), #e7e9ee 0);
}

.vw-ring span {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--text);
  background: #fff;
  font-size: 15px;
  font-weight: 700;
}

.vw-bottom__metrics {
  flex: 1;
  min-width: 0;
}

.vw-bottom__metrics h3 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.vw-engine {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fafbfd;
}

.vw-engine__label {
  color: var(--text-hint);
  font-size: 12px;
  font-weight: 600;
}

.vw-engine__value {
  color: var(--text);
  font-size: 13px;
  line-height: 1.45;
  word-break: break-word;
}

.vw-metrics-grid {
  display: grid;
  grid-template-columns: minmax(92px, 0.8fr) minmax(180px, 1.25fr) minmax(110px, 0.9fr) minmax(110px, 0.9fr) minmax(280px, 1.9fr);
  gap: 18px;
  margin: 0;
}

.vw-metrics-grid > div {
  min-width: 0;
}

.vw-metrics-grid dt {
  margin: 0 0 6px;
  color: var(--text-hint);
  font-size: 12px;
  font-weight: 600;
}

.vw-metrics-grid dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text);
  font-size: 13px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vw-metrics-grid__progress dd {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px;
  align-items: center;
  gap: 10px;
  white-space: normal;
}

.vw-metrics-grid__progress dd > span {
  order: 2;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  text-align: right;
}

.vw-progress-line {
  height: 8px;
  min-width: 0;
  overflow: hidden;
  border-radius: 999px;
  background: #e7e9ee;
}

.vw-progress-line i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.vw-bottom__footer {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(420px, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.vw-bottom__output {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.vw-bottom__output label {
  flex: 0 0 auto;
  color: var(--text-hint);
  font-size: 12px;
  font-weight: 600;
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
  border-radius: 12px 0 0 12px;
  color: var(--text);
  font: inherit;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vw-bottom__output-row button {
  display: grid;
  place-items: center;
  border-radius: 0 12px 12px 0;
  color: var(--text-secondary);
}

.vw-bottom__output-row button:hover:not(:disabled) {
  color: var(--primary);
  border-color: #c7d2fe;
  background: #fafbfd;
}

.vw-bottom__actions {
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: nowrap;
}

.vw-action {
  min-width: 142px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 999px;
}

.vw-action--primary {
  color: #fff;
  border: none;
  font-weight: 700;
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
  box-shadow: var(--cta-shadow);
}

.vw-action--primary:hover:not(:disabled) {
  filter: brightness(1.03);
  box-shadow: 0 6px 16px rgba(243, 132, 30, 0.32);
}

.vw-action--primary:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

.video-watermark-removal-page,
.vw-card--list,
.vw-file-list,
.vw-card--mode {
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}

.video-watermark-removal-page::-webkit-scrollbar,
.vw-card--list::-webkit-scrollbar,
.vw-file-list::-webkit-scrollbar,
.vw-card--mode::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.video-watermark-removal-page::-webkit-scrollbar-track,
.vw-card--list::-webkit-scrollbar-track,
.vw-file-list::-webkit-scrollbar-track,
.vw-card--mode::-webkit-scrollbar-track {
  background: transparent;
}

.video-watermark-removal-page::-webkit-scrollbar-thumb,
.vw-card--list::-webkit-scrollbar-thumb,
.vw-file-list::-webkit-scrollbar-thumb,
.vw-card--mode::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: #d6d9e0;
  background-clip: padding-box;
}

</style>
