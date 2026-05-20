<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  Brush,
  Folder,
  ImagePlus,
  Info,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  X
} from "@lucide/vue";
import { tauriClient } from "@/bridge/tauriClient";
import { useBatchTask } from "@/modules/batch";

type RemovalStatus = "pending" | "processing" | "done" | "failed";
type RemovalMode = "standard" | "quality";
type OutputFormat = "auto" | "png" | "jpg";

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
  previewUrl: string;
  outputPath?: string;
  processedPreviewUrl?: string;
  status: RemovalStatus;
  regions: WatermarkRegion[];
}

const supportedExtensions = ["jpg", "jpeg", "png", "bmp", "webp"];
const items = ref<RemovalItem[]>([]);
const selectedId = ref<string | null>(null);
const isDropActive = ref(false);
const removalMode = ref<RemovalMode>("standard");
const batchApply = ref(true);
const outputFormat = ref<OutputFormat>("auto");
const outputDir = ref("D:\\工具箱\\去水印结果");
const elapsedSeconds = ref(0);
const hintMessage = ref("");
const showProcessed = ref(false);
const draftRegion = ref<WatermarkRegion | null>(null);
const modelLoading = ref(false);
const modelPercent = ref(0);
const modelStage = ref("");
const modelError = ref("");
const modelStorePath = ref("");
const runtimeDevice = ref("");
const torchVersion = ref("");

const { submit, cancel, openOutputDirectory: openBatchOutputDirectory, progress, isRunning, result, failures } = useBatchTask();

let disposeDrop: UnlistenFn | null = null;
let disposeModelProgress: UnlistenFn | null = null;
let elapsedTimer: number | null = null;
let dragStart: { x: number; y: number } | null = null;

const selectedItem = computed(() => items.value.find((item) => item.id === selectedId.value) ?? null);
const canShowProcessed = computed(() => Boolean(selectedItem.value?.processedPreviewUrl && selectedItem.value.status === "done"));
const selectedPreviewUrl = computed(() =>
  showProcessed.value && canShowProcessed.value && selectedItem.value?.processedPreviewUrl
    ? selectedItem.value.processedPreviewUrl
    : selectedItem.value?.previewUrl ?? ""
);
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
const canStart = computed(() => items.value.length > 0 && hasRegions.value && !isRunning.value && !modelLoading.value);
const currentProgressItem = computed(() => items.value[Math.min(currentIndex.value, Math.max(0, items.value.length - 1))] ?? selectedItem.value);
const selectedPreviewFit = computed<"landscape" | "portrait">(() => {
  const item = selectedItem.value;
  if (!item || item.width <= 0 || item.height <= 0) return "landscape";
  return item.height > item.width ? "portrait" : "landscape";
});

const progressTitle = computed(() => {
  if (!isRunning.value) return "暂无任务";
  return `正在处理 ${currentDisplayIndex.value} / ${items.value.length} 张图片`;
});

const remainingTime = computed(() => {
  if (!isRunning.value) return "--";
  const remaining = Math.max(0, Math.round(((100 - progressPercent.value) / Math.max(1, progressPercent.value)) * elapsedSeconds.value));
  return formatDuration(remaining || 88);
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
  const s = totalSeconds % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function extractName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

function isSupportedImage(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return supportedExtensions.includes(ext);
}

function statusLabel(status: RemovalStatus): string {
  const labels: Record<RemovalStatus, string> = {
    pending: "待处理",
    processing: "处理中",
    done: "已完成",
    failed: "失败"
  };
  return labels[status];
}

async function readMetadata(path: string): Promise<{ bytes: number; width: number; height: number; previewUrl: string }> {
  let bytes = 0;
  let previewUrl = isTauri() ? convertFileSrc(path) : "";
  try {
    const meta = await invoke<{ size: number }>("get_path_metadata", { path });
    bytes = Number(meta.size ?? 0);
  } catch {
    bytes = 0;
  }
  try {
    const preview = await tauriClient.getImagePreviewDataUrl({ filePath: path });
    previewUrl = preview.dataUrl || previewUrl;
  } catch {
    // The converted file URL remains usable in the desktop runtime.
  }
  const dims = await loadImageDimensions(previewUrl);
  return { bytes, width: dims.width, height: dims.height, previewUrl };
}

function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (!src) {
      resolve({ width: 0, height: 0 });
      return;
    }
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = src;
  });
}

async function appendPaths(paths: string[]) {
  const unique = paths.filter(isSupportedImage).filter((path) => !items.value.some((item) => item.path === path));
  if (unique.length === 0) {
    hintMessage.value = "仅支持 JPG / PNG / BMP / WEBP 格式图片";
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
    filters: [{ name: "Images", extensions: supportedExtensions }]
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
  if (!selectedItem.value) return;
  selectedItem.value.regions = [];
}

function removeRegion(regionId: string) {
  if (!selectedItem.value || isRunning.value) return;
  selectedItem.value.regions = selectedItem.value.regions.filter((region) => region.id !== regionId);
}

function applyMode(mode: RemovalMode) {
  removalMode.value = mode;
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
  return {
    x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
    y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
  };
}

function onPreviewPointerDown(event: PointerEvent) {
  if (!selectedItem.value || showProcessed.value || isRunning.value || event.button !== 0) return;
  const target = event.currentTarget as HTMLElement;
  dragStart = pointerToPercent(event, target);
  draftRegion.value = { id: "draft", x: dragStart.x, y: dragStart.y, width: 0, height: 0 };
  target.setPointerCapture(event.pointerId);
}

function onPreviewPointerMove(event: PointerEvent) {
  if (!selectedItem.value || showProcessed.value || !dragStart) return;
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
  if (!selectedItem.value || showProcessed.value || !dragStart) return;
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

async function startRemoval() {
  if (!canStart.value) {
    hintMessage.value = items.value.length === 0 ? "请先添加图片" : "请先在图片上框选需要去除的水印区域";
    return;
  }
  stopTimers();
  showProcessed.value = false;
  elapsedSeconds.value = 0;
  modelError.value = "";
  items.value.forEach((item) => {
    item.status = "pending";
    item.outputPath = undefined;
    item.processedPreviewUrl = undefined;
  });
  try {
    if (removalMode.value === "quality") {
      await ensureLamaModelReady();
      modelLoading.value = true;
      modelPercent.value = 100;
      modelStage.value = `正在启动 LaMA worker（${runtimeDevice.value ? runtimeDevice.value.toUpperCase() : "CPU"}）`;
    } else {
      await refreshAiRuntimeStatus();
    }
    const startedAt = Date.now();
    elapsedTimer = window.setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);
    }, 1000);
    await submit({
      taskType: "AI_INPAINT",
      inputFiles: items.value.map((item) => item.path),
      outputDir: outputDir.value,
      options: {
        outputFormat: outputFormat.value,
        mode: removalMode.value,
        regionsByFile: buildRegionsByFile()
      },
      concurrencyPreset: "lowUsage"
    });
    modelLoading.value = false;
  } catch (error) {
    stopTimers();
    modelLoading.value = false;
    const message = error instanceof Error ? error.message : String(error);
    hintMessage.value = message || "启动 AI 去水印任务失败";
    modelError.value = hintMessage.value;
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
  const sharedRegions = batchApply.value && selectedItem.value?.regions.length ? selectedItem.value.regions : null;
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

async function ensureLamaModelReady(): Promise<void> {
  modelLoading.value = true;
  modelPercent.value = 0;
  modelStage.value = "正在检测 CUDA / CPU";
  try {
    const status = await tauriClient.getAiModelStatus();
    modelStorePath.value = status.modelsRoot;
    runtimeDevice.value = status.runtimeDevice || "";
    torchVersion.value = status.torchVersion || "";
    if (!status.downloaded) {
      modelStage.value = "首次使用正在下载 LaMA 模型";
      const downloadedStatus = await tauriClient.downloadAiModel("lama");
      modelStorePath.value = downloadedStatus.modelsRoot;
      runtimeDevice.value = downloadedStatus.runtimeDevice || runtimeDevice.value;
      torchVersion.value = downloadedStatus.torchVersion || torchVersion.value;
    }
  } finally {
    modelLoading.value = false;
  }
}

async function refreshAiRuntimeStatus(): Promise<void> {
  try {
    const status = await tauriClient.getAiModelStatus();
    modelStorePath.value = status.modelsRoot;
    runtimeDevice.value = status.runtimeDevice || "";
    torchVersion.value = status.torchVersion || "";
  } catch {
    runtimeDevice.value = "";
    torchVersion.value = "";
  }
}

watch(
  canShowProcessed,
  (canShow) => {
    if (!canShow) showProcessed.value = false;
  }
);

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
      item.processedPreviewUrl = undefined;
      return;
    }
    if (failed.has(itemKey)) {
      item.status = "failed";
      item.outputPath = undefined;
      item.processedPreviewUrl = undefined;
      return;
    }
    const outputPath = outputPaths.shift();
    item.status = "done";
    item.outputPath = outputPath;
    item.processedPreviewUrl = outputPath ? (isTauri() ? convertFileSrc(outputPath) : outputPath) : undefined;
  });
  if (snapshot.status === "FINISHED") showProcessed.value = true;
  if (snapshot.status === "FAILED") {
    modelError.value = failures.value[0]?.errorMessage || snapshot.message || "AI 去水印任务失败";
    hintMessage.value = modelError.value;
  }
  stopTimers();
});

onMounted(async () => {
  void setupNativeDrop();
  void refreshAiRuntimeStatus();
  void tauriClient.warmAiInpaintWorker();
  disposeModelProgress = await tauriClient.onAiModelProgress((payload) => {
    if (payload.modelId !== "lama") return;
    modelPercent.value = payload.percent;
    modelStage.value = payload.message || (payload.stage === "ready" ? "LaMA 模型已准备完成" : "正在下载 LaMA 模型");
  });
});

onBeforeUnmount(() => {
  disposeDrop?.();
  disposeModelProgress?.();
  stopTimers();
});
</script>

<template>
  <div class="image-watermark-removal-page">
    <div class="wm-workspace">
      <section class="wm-card wm-card--list" aria-labelledby="wm-list-title">
        <div class="wm-card-head">
          <h3 id="wm-list-title" class="wm-card-head__title">文件列表（{{ items.length }}）</h3>
          <div class="wm-card-head__actions">
            <button type="button" class="wm-btn wm-btn--small" @click="pickFiles"><Plus :size="15" />添加图片</button>
            <button type="button" class="wm-btn wm-btn--small" :disabled="items.length === 0 || isRunning" @click="clearList">
              <Trash2 :size="15" />清空列表
            </button>
          </div>
        </div>

        <div
          class="wm-drop"
          :class="{ 'wm-drop--compact': items.length > 0, 'wm-drop--active': isDropActive }"
          @click.self="pickFiles"
          @drop="handleDrop"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
        >
          <div class="wm-drop__art" aria-hidden="true">
            <ImagePlus :size="items.length ? 34 : 72" :stroke-width="1.6" />
            <span class="wm-drop__plus">+</span>
          </div>
          <p class="wm-drop__title">拖拽图片到此处，或<span @click.stop="pickFiles">点击添加图片</span></p>
          <p class="wm-drop__sub">支持 JPG / PNG / BMP / WEBP 等格式</p>
          <template v-if="items.length === 0">
            <strong class="wm-drop__batch">支持批量导入</strong>
            <p class="wm-drop__sub">可同时添加多张图片进行处理</p>
          </template>
        </div>

        <ul v-if="items.length" class="wm-file-list">
          <li v-for="item in items" :key="item.id" class="wm-file" :class="{ 'wm-file--selected': item.id === selectedId }" @click="selectedId = item.id">
            <img class="wm-file__thumb" :src="item.previewUrl" alt="" />
            <div class="wm-file__meta">
              <strong>{{ item.name }}</strong>
              <span>{{ formatBytes(item.bytes) }}</span>
              <span>{{ item.width || "--" }} × {{ item.height || "--" }}</span>
            </div>
            <span class="wm-file__status" :data-status="item.status">{{ statusLabel(item.status) }}</span>
            <button type="button" class="wm-file__remove" :disabled="isRunning" @click.stop="removeItem(item.id)"><X :size="18" /></button>
          </li>
        </ul>

        <p v-if="hintMessage" class="wm-hint">{{ hintMessage }}</p>
        <footer class="wm-list-foot">
          <span>共 {{ items.length }} 张图片</span>
          <span>总大小：{{ formatBytes(totalBytes) }}</span>
        </footer>
      </section>

      <section class="wm-card wm-card--preview" aria-labelledby="wm-preview-title">
        <header class="wm-preview-head">
          <div>
            <h3 id="wm-preview-title" class="wm-card-head__title">图片标注与预览</h3>
            <p class="wm-warning"><Info :size="14" />{{ selectedItem ? "在图片上拖拽矩形框选水印位置，可添加多个框，框右上角可删除" : "请先添加图片，并在图片上框选需要去除的水印区域" }}</p>
          </div>
          <div class="wm-tabs">
            <button type="button" :class="{ on: !showProcessed }" @click="showProcessed = false">原图</button>
            <button type="button" :class="{ on: showProcessed }" :disabled="!canShowProcessed" @click="showProcessed = true">处理后</button>
          </div>
        </header>

        <div class="wm-canvas-shell" :class="{ 'wm-canvas-shell--empty': !selectedItem }">
          <div v-if="selectedItem" class="wm-stage">
            <div
              class="wm-image-layer"
              :class="`wm-image-layer--${selectedPreviewFit}`"
              :style="{ aspectRatio: `${selectedItem.width || 1} / ${selectedItem.height || 1}` }"
              @pointerdown="onPreviewPointerDown"
              @pointermove="onPreviewPointerMove"
              @pointerup="onPreviewPointerUp"
              @pointercancel="onPreviewPointerCancel"
            >
              <img class="wm-stage__image" :src="selectedPreviewUrl" alt="" draggable="false" />
              <span
                v-for="region in showProcessed ? [] : selectedItem.regions"
                :key="region.id"
                class="wm-region"
                :style="{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }"
              >
                <button type="button" title="删除框选区域" aria-label="删除框选区域" @pointerdown.stop @click.stop="removeRegion(region.id)">
                  <X :size="13" />
                </button>
              </span>
              <span
                v-if="draftRegion"
                class="wm-region wm-region--draft"
                :style="{
                  left: `${draftRegion.x}%`,
                  top: `${draftRegion.y}%`,
                  width: `${draftRegion.width}%`,
                  height: `${draftRegion.height}%`
                }"
              />
            </div>
          </div>
          <div v-else class="wm-empty-preview">
            <div class="wm-empty-preview__art" aria-hidden="true"><ImagePlus :size="96" /><Brush :size="50" /></div>
            <strong>暂无图片</strong>
            <span>请从左侧添加图片开始处理</span>
          </div>
        </div>

        <footer class="wm-preview-foot">
          <p><Info :size="14" />提示：请尽量完整框选水印区域，边缘可稍大一些，效果更佳</p>
          <button v-if="selectedItem" type="button" class="wm-btn wm-btn--small" @click="clearRegions"><Trash2 :size="14" />清除全部框选</button>
        </footer>
      </section>

      <section class="wm-card wm-card--settings" aria-labelledby="wm-settings-title">
        <h3 id="wm-settings-title" class="wm-card-head__title">去除设置</h3>
        <div class="wm-separator" />

        <div class="wm-settings-section">
          <h4>基础设置</h4>
          <label class="wm-field-label">去除模式</label>
          <div class="wm-segment wm-segment--two">
            <button type="button" :class="{ on: removalMode === 'standard' }" @click="applyMode('standard')">标准</button>
            <button type="button" :class="{ on: removalMode === 'quality' }" @click="applyMode('quality')">高清</button>
          </div>
          <p class="wm-muted">标准模式按原图局部修复并融合回原图；高清模式使用 LaMA，速度更慢</p>
        </div>

        <label class="wm-switch-row">
          <span><strong>批量应用</strong><em>将当前标注区域应用到全部图片</em></span>
          <input v-model="batchApply" type="checkbox" />
          <i />
        </label>

        <div class="wm-separator" />

        <div class="wm-settings-section">
          <h4>输出设置</h4>
          <label class="wm-field-label">输出格式</label>
          <div class="wm-segment">
            <button type="button" :class="{ on: outputFormat === 'auto' }" @click="outputFormat = 'auto'">原格式</button>
            <button type="button" :class="{ on: outputFormat === 'png' }" @click="outputFormat = 'png'">PNG</button>
            <button type="button" :class="{ on: outputFormat === 'jpg' }" @click="outputFormat = 'jpg'">JPG</button>
          </div>
          <p class="wm-muted">默认按原图格式输出；PNG 无损，JPG 体积更小</p>
        </div>

        <div class="wm-settings-section">
          <label class="wm-field-label">输出目录</label>
          <div class="wm-output-row">
            <input v-model="outputDir" type="text" />
            <button type="button" @click="pickOutputDir"><Folder :size="18" /></button>
          </div>
          <p class="wm-muted">默认保存到“去水印结果”文件夹</p>
        </div>
      </section>
    </div>

    <footer class="wm-bottom">
      <div class="wm-bottom__overall">
        <div class="wm-ring" :style="{ '--p': progressPercent }"><span>{{ progressPercent }}%</span></div>
        <div>
          <strong>整体进度</strong>
          <span>{{ progressTitle }}</span>
          <span v-if="runtimeDevice">AI：{{ runtimeDevice.toUpperCase() }}{{ torchVersion ? ` / Torch ${torchVersion}` : "" }}</span>
          <span>共 {{ items.length }} 张图片</span>
        </div>
      </div>

      <div class="wm-bottom__current">
        <template v-if="modelLoading">
          <div>
            <strong>LaMA 模型准备中</strong>
            <span>{{ modelStage || "正在准备模型文件" }}</span>
          </div>
        </template>
        <template v-else-if="currentProgressItem && isRunning">
          <img :src="currentProgressItem.previewUrl" alt="" />
          <div>
            <strong>{{ currentProgressItem.name }}</strong>
            <span>处理进度</span>
          </div>
        </template>
        <template v-else>
          <span>当前图片：--</span>
          <span>状态：--</span>
        </template>
        <div class="wm-progress-line"><i :style="{ width: `${modelLoading ? modelPercent : progressPercent}%` }" /></div>
        <em>{{ modelLoading ? `${modelPercent}%` : isRunning ? `${progressPercent}%` : "--" }}</em>
        <small v-if="isRunning">已用时间：{{ formatDuration(elapsedSeconds) }} / 预计时间：{{ remainingTime }}</small>
      </div>

      <div class="wm-bottom__actions">
        <button type="button" class="wm-action wm-action--primary" :disabled="!canStart" @click="startRemoval"><PlayCircle :size="18" />{{ modelLoading ? "模型准备中" : "开始去除" }}</button>
        <button type="button" class="wm-action" :disabled="!isRunning" @click="stopTask"><PauseCircle :size="18" />停止任务</button>
        <button type="button" class="wm-action" @click="openOutputDirectory"><Folder :size="18" />打开输出目录</button>
      </div>
    </footer>
    <div v-if="modelLoading" class="wm-model-loading" role="status" aria-live="polite">
      <div class="wm-model-loading__panel">
        <strong>正在准备 LaMA 修复模型</strong>
        <span>{{ modelStage || "正在准备模型文件" }}</span>
        <div class="wm-model-loading__bar"><i :style="{ width: `${modelPercent}%` }" /></div>
        <div class="wm-model-loading__meta">
          <span>{{ runtimeDevice ? `当前设备：${runtimeDevice.toUpperCase()}` : "正在检测 CUDA / CPU" }}</span>
          <span v-if="torchVersion">Torch {{ torchVersion }}</span>
        </div>
        <p v-if="modelStorePath">模型保存位置：{{ modelStorePath }}</p>
      </div>
    </div>
    <div v-if="modelError && !modelLoading" class="wm-model-error" role="alert">
      <div>
        <strong>AI 模型准备失败</strong>
        <span>{{ modelError }}</span>
      </div>
      <button type="button" @click="modelError = ''">关闭</button>
    </div>
    <p class="wm-toast-tip">温馨提示：请先在图片上框选需要去除的水印区域，才能开始处理。</p>
  </div>
</template>

<style scoped>
.image-watermark-removal-page {
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

.wm-workspace {
  display: grid;
  grid-template-columns: minmax(230px, 0.82fr) minmax(340px, 1.5fr) minmax(220px, 0.72fr);
  gap: 12px;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.wm-card {
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

.wm-card--list,
.wm-card--preview,
.wm-card--settings {
  padding: clamp(12px, 1.5vh, 18px);
}

.wm-card-head,
.wm-preview-head,
.wm-card-head__actions,
.wm-preview-foot,
.wm-bottom,
.wm-bottom__overall,
.wm-bottom__current,
.wm-bottom__actions {
  display: flex;
  align-items: center;
}

.wm-card-head,
.wm-preview-head {
  justify-content: space-between;
  gap: 14px;
  margin-bottom: clamp(8px, 1.2vh, 14px);
}

.wm-card-head__title {
  margin: 0;
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
}

.wm-card-head__actions {
  gap: 10px;
}

.wm-btn,
.wm-action {
  border: 1px solid var(--border-strong);
  background: #fff;
  color: #18244a;
  border-radius: 6px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.wm-btn {
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  white-space: nowrap;
}

.wm-btn--small {
  height: 34px;
  font-size: 13px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.wm-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  flex: 1;
  padding: 22px 18px;
  border: 1px dashed #cbd6ea;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  text-align: center;
}

.wm-drop--compact {
  flex: 0 0 auto;
  min-height: 96px;
  margin-bottom: 10px;
}

.wm-drop--active {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.wm-drop__art {
  position: relative;
  color: #2d72f6;
  opacity: 0.8;
  margin-bottom: 10px;
}

.wm-drop__plus {
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

.wm-drop__title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
}

.wm-drop__title span {
  color: var(--primary);
  cursor: pointer;
}

.wm-drop__sub,
.wm-muted,
.wm-hint,
.wm-list-foot,
.wm-warning,
.wm-preview-foot,
.wm-bottom span,
.wm-bottom small {
  color: var(--muted);
  font-size: 13px;
}

.wm-drop__batch {
  margin-top: 28px;
  font-size: 16px;
}

.wm-file-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.wm-file {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto 28px;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}

.wm-file--selected {
  border-color: var(--primary);
  background: #fbfdff;
}

.wm-file__thumb {
  width: 72px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
  background: #eef2f8;
}

.wm-file__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.wm-file__meta strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.wm-file__meta span {
  color: #5f6c8d;
  font-size: 12px;
}

.wm-file__status {
  padding: 6px 9px;
  border-radius: 5px;
  color: var(--primary);
  background: #eaf2ff;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.wm-file__status[data-status="done"] {
  color: #059669;
  background: #e8f8f1;
}

.wm-file__status[data-status="failed"] {
  color: #dc2626;
  background: #fee2e2;
}

.wm-file__remove {
  width: 28px;
  height: 28px;
  border: 0;
  background: transparent;
  color: #1f2a55;
  cursor: pointer;
}

.wm-hint {
  margin: 10px 0 0;
  color: #f97316;
}

.wm-list-foot {
  display: flex;
  justify-content: space-between;
  padding-top: 14px;
  margin-top: auto;
  flex: 0 0 auto;
}

.wm-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0;
  color: var(--warning);
  line-height: 1.45;
}

.wm-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 172px;
  height: 36px;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  overflow: hidden;
}

.wm-tabs button,
.wm-segment button {
  border: 0;
  background: #fff;
  color: #243054;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.wm-tabs button.on,
.wm-segment button.on {
  color: #fff;
  background: var(--primary);
}

.wm-canvas-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fbfcff;
  overflow: hidden;
}

.wm-stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wm-image-layer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  max-width: 100%;
  max-height: 100%;
  cursor: crosshair;
  user-select: none;
}

.wm-image-layer--landscape {
  width: 100%;
  height: auto;
}

.wm-image-layer--portrait {
  width: auto;
  height: 100%;
}

.wm-stage__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 4px;
  user-select: none;
  pointer-events: none;
}

.wm-image-layer--landscape .wm-stage__image {
  width: 100%;
  height: 100%;
}

.wm-image-layer--portrait .wm-stage__image {
  width: 100%;
  height: 100%;
}

.wm-stage__processed {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: saturate(1.05);
  pointer-events: none;
}

.wm-region {
  position: absolute;
  border: 1px dashed #111827;
  background: rgba(37, 99, 235, 0.08);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.86) inset,
    0 0 0 1px rgba(255, 255, 255, 0.72);
  pointer-events: none;
}

.wm-region::before,
.wm-region::after {
  content: "";
  position: absolute;
  width: 7px;
  height: 7px;
  border: 1px solid #111827;
  background: #ffffff;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
}

.wm-region::before {
  left: -4px;
  top: -4px;
}

.wm-region::after {
  right: -4px;
  bottom: -4px;
}

.wm-region--draft {
  border-style: dashed;
  background: rgba(37, 99, 235, 0.08);
  pointer-events: none;
}

.wm-region button {
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
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.24);
  cursor: pointer;
  pointer-events: auto;
}

.wm-region button:hover {
  color: #ffffff;
  border-color: #dc2626;
  background: #dc2626;
}

.wm-empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #1d274c;
}

.wm-empty-preview__art {
  position: relative;
  height: 136px;
  width: 160px;
  display: grid;
  place-items: center;
  color: #cbd9f4;
}

.wm-empty-preview__art svg:last-child {
  position: absolute;
  right: 20px;
  bottom: 10px;
  color: #5f93f8;
}

.wm-preview-foot {
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  flex: 0 0 auto;
}

.wm-preview-foot p {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
}

.wm-card--settings {
  gap: 20px;
  overflow: auto;
}

.image-watermark-removal-page,
.wm-file-list,
.wm-card--settings {
  scrollbar-width: thin;
  scrollbar-color: #c9d4e8 transparent;
}

.image-watermark-removal-page::-webkit-scrollbar,
.wm-file-list::-webkit-scrollbar,
.wm-card--settings::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.image-watermark-removal-page::-webkit-scrollbar-track,
.wm-file-list::-webkit-scrollbar-track,
.wm-card--settings::-webkit-scrollbar-track {
  background: transparent;
}

.image-watermark-removal-page::-webkit-scrollbar-thumb,
.wm-file-list::-webkit-scrollbar-thumb,
.wm-card--settings::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: #c9d4e8;
  background-clip: padding-box;
}

.wm-separator {
  height: 1px;
  background: var(--border);
}

.wm-settings-section h4 {
  margin: 0 0 18px;
  font-size: 15px;
}

.wm-field-label {
  display: block;
  margin-bottom: 12px;
  color: #253052;
  font-size: 14px;
  font-weight: 700;
}

.wm-segment {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.wm-segment--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wm-segment button {
  height: 38px;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
}

.wm-segment button.on {
  border-color: var(--primary);
  color: var(--primary);
  background: #f8fbff;
}

.wm-muted {
  margin: 10px 0 0;
  line-height: 1.6;
}

.wm-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.wm-switch-row span {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wm-switch-row strong {
  font-size: 14px;
}

.wm-switch-row em {
  color: var(--muted);
  font-style: normal;
  font-size: 13px;
}

.wm-switch-row input {
  position: absolute;
  opacity: 0;
}

.wm-switch-row i {
  position: relative;
  width: 40px;
  height: 22px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #c7d1e1;
}

.wm-switch-row i::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.18s ease;
}

.wm-switch-row input:checked + i {
  background: var(--primary);
}

.wm-switch-row input:checked + i::after {
  transform: translateX(18px);
}

.wm-output-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  gap: 8px;
}

.wm-output-row input,
.wm-output-row button {
  height: 38px;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  background: #fff;
}

.wm-output-row input {
  min-width: 0;
  padding: 0 12px;
  color: #1f2a55;
  font: inherit;
}

.wm-output-row button {
  display: grid;
  place-items: center;
  color: #1f2a55;
  cursor: pointer;
}

.wm-bottom {
  flex: 0 0 auto;
  min-height: 96px;
  display: grid;
  grid-template-columns: minmax(190px, 0.72fr) minmax(260px, 1fr) minmax(0, max-content);
  gap: 14px;
  padding: 14px 18px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}

.wm-bottom__overall {
  min-width: 0;
  gap: 12px;
}

.wm-bottom__overall > div:last-child,
.wm-bottom__current > div {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.wm-ring {
  --p: 0;
  width: 60px;
  height: 60px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(#7aa3ff calc(var(--p) * 1%), #edf1f7 0);
}

.wm-ring::before {
  content: "";
  position: absolute;
}

.wm-ring span {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #111936;
  background: #fff;
  font-size: 16px;
  font-weight: 800;
}

.wm-bottom__current {
  position: relative;
  min-width: 0;
  gap: 12px;
  padding-right: 16px;
  border-right: 1px solid var(--border);
}

.wm-bottom__current img {
  width: 72px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
}

.wm-progress-line {
  flex: 1;
  height: 8px;
  min-width: 90px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf1f7;
}

.wm-progress-line i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.wm-bottom__current em {
  color: #5f6c8d;
  font-style: normal;
  font-weight: 700;
}

.wm-bottom__current small {
  position: static;
  grid-column: 1 / -1;
}

.wm-bottom__actions {
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.wm-action {
  min-width: 132px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
}

.wm-action--primary {
  color: #fff;
  border-color: var(--primary);
  background: var(--primary);
}

.wm-model-loading {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(3px);
}

.wm-model-loading__panel,
.wm-model-error {
  width: min(560px, calc(100vw - 48px));
  padding: 18px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(16, 25, 54, 0.18);
}

.wm-model-loading__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--border);
}

.wm-model-loading__bar {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf1f7;
}

.wm-model-loading__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.wm-model-loading__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted);
  font-size: 13px;
}

.wm-model-loading__panel p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  word-break: break-all;
}

.wm-model-error {
  position: fixed;
  right: 24px;
  bottom: 92px;
  z-index: 31;
  display: flex;
  gap: 14px;
  border: 1px solid #fecaca;
  color: #7f1d1d;
  background: #fff7f7;
}

.wm-model-error div {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wm-model-error span {
  word-break: break-all;
}

.wm-model-error button {
  height: 32px;
  padding: 0 12px;
  color: #991b1b;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: #fff;
}

.wm-toast-tip {
  margin: -4px 0 0;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}

@media (max-width: 1120px) {
  .wm-workspace {
    grid-template-columns: minmax(260px, 0.9fr) minmax(420px, 1.3fr);
  }

  .wm-card--settings {
    grid-column: 1 / -1;
  }

  .wm-bottom {
    grid-template-columns: 1fr;
  }

  .wm-bottom__current {
    border-right: 0;
    padding-right: 0;
  }

  .wm-bottom__actions {
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .image-watermark-removal-page {
    height: 100%;
    min-height: 0;
    padding: 10px;
    overflow: hidden;
  }

  .wm-workspace {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .wm-bottom {
    padding: 16px;
  }

  .wm-bottom__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .wm-action {
    width: 100%;
  }
}
</style>
