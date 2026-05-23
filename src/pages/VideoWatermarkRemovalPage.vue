<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { Folder, Info, Maximize2, MoreVertical, PauseCircle, PlayCircle, Plus, Trash2, Video, Volume2, VolumeX, X } from "@lucide/vue";
import { useBatchTask } from "@/modules/batch";

const { t } = useI18n();

type RemovalStatus = "pending" | "processing" | "done" | "failed";

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
const items = ref<RemovalItem[]>([]);
const selectedId = ref<string | null>(null);
const isDropActive = ref(false);
const outputDir = ref(t("pages.videoWatermarkRemoval.output.defaultDirectory"));
const hintMessage = ref("");
const elapsedSeconds = ref(0);
const draftRegion = ref<WatermarkRegion | null>(null);
const previewVideoRef = ref<HTMLVideoElement | null>(null);
const previewShellRef = ref<HTMLElement | null>(null);
const previewStageRef = ref<HTMLElement | null>(null);
const videoLayerSize = ref({ width: 0, height: 0 });
const isPreviewPlaying = ref(false);
const isPreviewMuted = ref(true);
const previewCurrentTime = ref(0);
const previewDuration = ref(0);

const { submit, cancel, openOutputDirectory: openBatchOutputDirectory, progress, isRunning, result, failures } = useBatchTask();

let disposeDrop: UnlistenFn | null = null;
let elapsedTimer: number | null = null;
let dragStart: { x: number; y: number } | null = null;
let previewResizeObserver: ResizeObserver | null = null;

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
const currentDisplayIndex = computed(() => (items.value.length === 0 ? 0 : Math.min(currentIndex.value + 1, items.value.length)));
const canStart = computed(() => items.value.length > 0 && hasRegions.value && !isRunning.value);
const currentProgressItem = computed(() => items.value[Math.min(currentIndex.value, Math.max(0, items.value.length - 1))] ?? selectedItem.value);
const progressTitle = computed(() => {
  if (progress.value?.message && isRunning.value) return progress.value.message;
  if (!isRunning.value) return t("pages.videoWatermarkRemoval.progressPanel.idleTitle");
  return t("pages.videoWatermarkRemoval.progressPanel.processingTitle", {
    current: currentDisplayIndex.value,
    total: items.value.length
  });
});
const processingEngineLabel = computed(() => t("pages.videoWatermarkRemoval.engine.label"));
const remainingTime = computed(() => {
  if (!isRunning.value) return "--";
  const remaining = Math.max(0, Math.round(((100 - progressPercent.value) / Math.max(1, progressPercent.value)) * elapsedSeconds.value));
  return formatDuration(remaining || 120);
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
const selectedPreviewFit = computed<"landscape" | "portrait">(() => {
  const item = selectedItem.value;
  if (!item || item.width <= 0 || item.height <= 0) return "landscape";
  return item.height > item.width ? "portrait" : "landscape";
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
    case "pending":
      return t("pages.videoWatermarkRemoval.status.pending");
    case "processing":
      return t("pages.videoWatermarkRemoval.status.processing");
    case "done":
      return t("pages.videoWatermarkRemoval.status.done");
    case "failed":
      return t("pages.videoWatermarkRemoval.status.failed");
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

async function startRemoval() {
  if (!canStart.value) {
    hintMessage.value =
      items.value.length === 0
        ? t("pages.videoWatermarkRemoval.hints.addVideoFirst")
        : t("pages.videoWatermarkRemoval.hints.selectRegionFirst");
    return;
  }
  stopTimers();
  elapsedSeconds.value = 0;
  items.value.forEach((item) => {
    item.status = "pending";
    item.outputPath = undefined;
  });
  try {
    const startedAt = Date.now();
    elapsedTimer = window.setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);
    }, 1000);
    await submit({
      taskType: "VIDEO_WATERMARK_REMOVAL",
      inputFiles: items.value.map((item) => item.path),
      outputDir: outputDir.value,
      options: {
        regionsByFile: buildRegionsByFile()
      },
      concurrencyPreset: "balanced"
    });
  } catch (error) {
    stopTimers();
    const message = error instanceof Error ? error.message : String(error);
    hintMessage.value = message || t("pages.videoWatermarkRemoval.hints.startTaskFailed");
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
  stopTimers();
});

onMounted(() => {
  void setupNativeDrop();
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
            <button type="button" class="vw-btn vw-btn--small" @click="pickFiles"><Plus :size="15" />{{ t("pages.videoWatermarkRemoval.list.addVideos") }}</button>
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
            <Video :size="items.length ? 34 : 56" :stroke-width="1.6" />
            <span class="vw-drop__plus">+</span>
          </div>
          <p class="vw-drop__title">{{ t("pages.videoWatermarkRemoval.list.dropHint") }}<span @click.stop="pickFiles">{{ t("pages.videoWatermarkRemoval.list.dropAddLink") }}</span></p>
          <p class="vw-drop__sub">{{ t("pages.videoWatermarkRemoval.list.formatsLine") }}</p>
          <template v-if="items.length === 0">
            <strong class="vw-drop__batch">{{ t("pages.videoWatermarkRemoval.list.batchImport") }}</strong>
            <p class="vw-drop__sub">{{ t("pages.videoWatermarkRemoval.list.sharedRegionHint") }}</p>
          </template>
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
          <span>{{ t("pages.videoWatermarkRemoval.list.totalVideos", { count: items.length }) }}</span>
          <span>{{ t("pages.videoWatermarkRemoval.list.totalSize", { size: formatBytes(totalBytes) }) }}</span>
        </footer>
      </section>

      <section class="vw-card vw-card--preview" :aria-label="t('pages.videoWatermarkRemoval.preview.aria')">
        <div class="vw-preview-head">
          <div>
            <h3 class="vw-card-head__title">{{ selectedItem?.name || t("pages.videoWatermarkRemoval.preview.titleFallback") }}</h3>
            <p class="vw-muted">{{ t("pages.videoWatermarkRemoval.preview.instruction") }}</p>
          </div>
          <button type="button" class="vw-btn vw-btn--small" :disabled="!selectedItem || isRunning" @click="clearRegions">{{ t("pages.videoWatermarkRemoval.preview.clearRegions") }}</button>
        </div>

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
              ></video>
              <div
                v-for="region in selectedItem.regions"
                :key="region.id"
                class="vw-region"
                :style="{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }"
              >
                <button type="button" :disabled="isRunning" @pointerdown.stop @click.stop="removeRegion(region.id)"><X :size="11" /></button>
              </div>
              <div
                v-if="draftRegion"
                class="vw-region vw-region--draft"
                :style="{ left: `${draftRegion.x}%`, top: `${draftRegion.y}%`, width: `${draftRegion.width}%`, height: `${draftRegion.height}%` }"
              ></div>
            </div>
          </div>
          <div v-else class="vw-empty-preview">
            <div class="vw-empty-preview__art"><Video :size="92" :stroke-width="1.2" /></div>
            <strong>{{ t("pages.videoWatermarkRemoval.preview.emptyTitle") }}</strong>
            <span>{{ t("pages.videoWatermarkRemoval.preview.emptyDesc") }}</span>
          </div>
        </div>

        <div v-if="selectedItem" class="vw-player-controls" :aria-label="t('pages.videoWatermarkRemoval.preview.controlsAria')">
          <button type="button" class="vw-player-button" @click="togglePreviewPlayback">
            <PauseCircle v-if="isPreviewPlaying" :size="19" />
            <PlayCircle v-else :size="19" />
          </button>
          <span class="vw-player-time">{{ formatDuration(previewCurrentTime) }}</span>
          <input
            class="vw-player-seek"
            type="range"
            min="0"
            max="100"
            step="0.1"
            :value="previewProgress"
            :style="{ '--preview-progress': `${previewProgress}%` }"
            @input="seekPreview"
          />
          <span class="vw-player-time">{{ formatDuration(previewDuration || selectedItem.duration) }}</span>
          <button type="button" class="vw-player-button" @click="togglePreviewMuted">
            <VolumeX v-if="isPreviewMuted" :size="19" />
            <Volume2 v-else :size="19" />
          </button>
          <button type="button" class="vw-player-button" @click="requestPreviewFullscreen"><Maximize2 :size="18" /></button>
          <button type="button" class="vw-player-button"><MoreVertical :size="18" /></button>
        </div>

        <footer class="vw-preview-foot">
          <p><Info :size="15" />{{ t("pages.videoWatermarkRemoval.preview.outputNote") }}</p>
          <span v-if="selectedItem">{{ t("pages.videoWatermarkRemoval.preview.regionsSelected", { count: selectedItem.regions.length }) }}</span>
        </footer>
      </section>

    </div>

    <section class="vw-bottom" :aria-label="t('pages.videoWatermarkRemoval.progressPanel.aria')">
      <div class="vw-bottom__summary">
        <div class="vw-ring" :style="{ '--p': progressPercent }"><span>{{ Math.round(progressPercent) }}%</span></div>
        <div class="vw-bottom__metrics">
          <h3>{{ progressTitle }}</h3>
          <dl class="vw-metrics-grid">
            <div>
              <dt>{{ t("pages.videoWatermarkRemoval.progressPanel.taskCount") }}</dt>
              <dd>{{ progress?.finished ?? 0 }} / {{ items.length }}</dd>
            </div>
            <div>
              <dt>{{ t("pages.videoWatermarkRemoval.progressPanel.currentFile") }}</dt>
              <dd>{{ currentProgressItem?.name || "--" }}</dd>
            </div>
            <div>
              <dt>{{ t("pages.videoWatermarkRemoval.progressPanel.estimatedRemaining") }}</dt>
              <dd>{{ remainingTime }}</dd>
            </div>
            <div>
              <dt>{{ t("pages.videoWatermarkRemoval.progressPanel.elapsed") }}</dt>
              <dd>{{ isRunning || elapsedSeconds > 0 ? formatDuration(elapsedSeconds) : "--:--:--" }}</dd>
            </div>
            <div>
              <dt>{{ t("pages.videoWatermarkRemoval.progressPanel.engine") }}</dt>
              <dd :title="processingEngineLabel">{{ processingEngineLabel }}</dd>
            </div>
            <div class="vw-metrics-grid__progress">
              <dt>{{ t("pages.videoWatermarkRemoval.progressPanel.overallProgress") }}</dt>
              <dd><span>{{ Math.round(progressPercent) }}%</span><i class="vw-progress-line"><i :style="{ width: `${progressPercent}%` }"></i></i></dd>
            </div>
          </dl>
        </div>
      </div>
      <div class="vw-bottom__footer">
        <div class="vw-bottom__output">
          <label>{{ t("pages.videoWatermarkRemoval.output.directoryLabel") }}</label>
          <div class="vw-bottom__output-row">
            <input v-model="outputDir" :disabled="isRunning" />
            <button type="button" :disabled="isRunning" @click="pickOutputDir"><Folder :size="18" /></button>
          </div>
        </div>
        <div class="vw-bottom__actions">
          <button type="button" class="vw-action" :disabled="!result?.successOutputPaths?.length" @click="openOutputDirectory"><Folder :size="18" />{{ t("pages.videoWatermarkRemoval.output.openFolder") }}</button>
          <button v-if="isRunning" type="button" class="vw-action" @click="stopTask"><PauseCircle :size="19" />{{ t("pages.videoWatermarkRemoval.actions.stop") }}</button>
          <button v-else type="button" class="vw-action vw-action--primary" :disabled="!canStart" @click="startRemoval">
            <PlayCircle :size="19" />{{ t("pages.videoWatermarkRemoval.actions.start") }}
          </button>
        </div>
      </div>
    </section>

    <p class="vw-toast-tip">{{ t("pages.videoWatermarkRemoval.tip") }}</p>
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
  letter-spacing: 0;
}

.vw-workspace {
  display: grid;
  grid-template-columns: minmax(280px, 0.82fr) minmax(480px, 2.18fr);
  gap: 12px;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.vw-card {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(27, 46, 94, 0.04);
}

.vw-card--list,
.vw-card--preview {
  padding: clamp(12px, 1.5vh, 18px);
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
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
}

.vw-card-head__actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.vw-btn,
.vw-action {
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
  gap: 7px;
  padding: 0 13px;
  white-space: nowrap;
}

.vw-btn--small {
  height: 34px;
  font-size: 13px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.vw-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  flex: 1;
  padding: 16px 16px;
  border: 1px dashed #cbd6ea;
  border-radius: 8px;
  background: #fbfdff;
  text-align: center;
  overflow: hidden;
}

.vw-drop--compact {
  flex: 0 1 auto;
  min-height: 62px;
  flex-direction: row;
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 8px;
  padding: 10px 12px;
  text-align: left;
}

.vw-drop--active {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.vw-drop__art {
  position: relative;
  color: #2d72f6;
  opacity: 0.8;
  margin-bottom: 10px;
}

.vw-drop--compact .vw-drop__art {
  flex: 0 0 auto;
  margin-bottom: 0;
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

.vw-drop--compact .vw-drop__plus {
  right: -8px;
  bottom: -5px;
  width: 20px;
  height: 20px;
  font-size: 16px;
}

.vw-drop__title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 700;
}

.vw-drop--compact .vw-drop__title {
  margin: 0;
  font-size: 13px;
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
.vw-bottom small {
  color: var(--muted);
  font-size: 13px;
}

.vw-drop--compact .vw-drop__sub {
  display: none;
}

.vw-drop__batch {
  margin-top: 10px;
  font-size: 16px;
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
  grid-template-columns: 58px minmax(0, 1fr) auto 28px;
  align-items: center;
  gap: 10px;
  min-height: 68px;
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
  gap: 5px;
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
  color: #1f2a55;
  cursor: pointer;
}

.vw-hint {
  margin: 10px 0 0;
  color: #f97316;
}

.vw-list-foot,
.vw-preview-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex: 0 0 auto;
}

.vw-list-foot {
  padding-top: 14px;
  margin-top: auto;
  white-space: nowrap;
}

.vw-muted,
.vw-warning {
  margin: 8px 0 0;
  line-height: 1.55;
}

.vw-warning,
.vw-preview-foot p {
  display: flex;
  align-items: center;
  gap: 6px;
}

.vw-warning {
  color: var(--warning);
}

.vw-canvas-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  padding: 12px;
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
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
}

.vw-video-layer--landscape {
  width: 100%;
  height: auto;
}

.vw-video-layer--portrait {
  width: auto;
  height: 100%;
}

.vw-stage__video {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  background: #111827;
}

.vw-stage__video::-webkit-media-controls {
  display: none !important;
}

.vw-player-controls {
  --preview-progress: 0%;
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 34px auto minmax(120px, 1fr) auto 34px 34px 34px;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  color: #ffffff;
  background: #111827;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.vw-player-button {
  width: 34px;
  height: 30px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 5px;
  color: #ffffff;
  background: transparent;
  cursor: pointer;
}

.vw-player-button:hover {
  background: rgba(255, 255, 255, 0.12);
}

.vw-player-time {
  min-width: 54px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.82);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.vw-player-seek {
  width: 100%;
  height: 18px;
  margin: 0;
  accent-color: #ffffff;
  cursor: pointer;
}

.vw-player-seek::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffffff var(--preview-progress), rgba(255, 255, 255, 0.28) 0);
}

.vw-player-seek::-webkit-slider-thumb {
  width: 12px;
  height: 12px;
  margin-top: -4px;
  border-radius: 50%;
  background: #ffffff;
}

.vw-region {
  position: absolute;
  border: 1px dashed #111827;
  background: rgba(37, 99, 235, 0.1);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.86) inset,
    0 0 0 1px rgba(255, 255, 255, 0.72);
  pointer-events: auto;
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
  cursor: pointer;
  pointer-events: auto;
}

.vw-region button:hover {
  color: #ffffff;
  border-color: #dc2626;
  background: #dc2626;
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

.vw-preview-foot {
  align-items: center;
  margin-top: 12px;
}

.vw-preview-foot p {
  margin: 0;
}

.vw-bottom {
  flex: 0 0 auto;
  min-height: 176px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 24px 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}

.vw-bottom__summary {
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
  color: var(--text);
  font-size: 16px;
  font-weight: 800;
}

.vw-metrics-grid {
  display: grid;
  grid-template-columns: minmax(92px, 0.75fr) minmax(180px, 1.2fr) minmax(110px, 0.8fr) minmax(110px, 0.8fr) minmax(110px, 0.85fr) minmax(260px, 1.7fr);
  gap: 18px;
  margin: 0;
}

.vw-metrics-grid > div {
  min-width: 0;
}

.vw-metrics-grid dt {
  margin: 0 0 8px;
  color: #111936;
  font-size: 13px;
  font-weight: 800;
}

.vw-metrics-grid dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #5c698a;
  font-size: 13px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vw-metrics-grid__progress dd {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  gap: 10px;
}

.vw-metrics-grid__progress dd > span {
  order: 2;
  color: #5c698a;
  font-weight: 700;
  text-align: right;
}

.vw-progress-line {
  height: 8px;
  min-width: 0;
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
  min-width: 0;
  gap: 10px;
}

.vw-bottom__output label {
  flex: 0 0 auto;
  color: #111936;
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
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vw-bottom__output-row button {
  display: grid;
  place-items: center;
  border-radius: 0 6px 6px 0;
  color: #1f2a55;
  cursor: pointer;
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
}

.vw-action--primary {
  color: #fff;
  border-color: var(--primary);
  background: var(--primary);
}

.vw-toast-tip {
  margin: -4px 0 0;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}

.video-watermark-removal-page,
.vw-card--list,
.vw-file-list {
  scrollbar-width: thin;
  scrollbar-color: #c9d4e8 transparent;
}

.video-watermark-removal-page::-webkit-scrollbar,
.vw-card--list::-webkit-scrollbar,
.vw-file-list::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.video-watermark-removal-page::-webkit-scrollbar-track,
.vw-card--list::-webkit-scrollbar-track,
.vw-file-list::-webkit-scrollbar-track {
  background: transparent;
}

.video-watermark-removal-page::-webkit-scrollbar-thumb,
.vw-card--list::-webkit-scrollbar-thumb,
.vw-file-list::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: #c9d4e8;
  background-clip: padding-box;
}

@media (max-width: 1120px) {
  .vw-workspace {
    grid-template-columns: minmax(260px, 0.88fr) minmax(380px, 1.72fr);
  }

  .vw-metrics-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .vw-metrics-grid__progress {
    grid-column: 1 / -1;
  }

  .vw-bottom__footer {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .vw-bottom__actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 900px) {
  .video-watermark-removal-page {
    padding: 10px;
  }

  .vw-workspace {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .vw-bottom {
    padding: 16px;
  }

  .vw-bottom__summary {
    align-items: flex-start;
  }

  .vw-metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .vw-bottom__actions,
  .vw-bottom__output {
    flex-direction: column;
    align-items: stretch;
  }

  .vw-action {
    width: 100%;
  }
}
</style>
