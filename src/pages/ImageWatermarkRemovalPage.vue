<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useRouter } from "vue-router";
import {
  Brush,
  Folder,
  ImagePlus,
  Info,
  PauseCircle,
  PlayCircle,
  Trash2,
  X
} from "@lucide/vue";
import AiEnhancementStatusPanel from "@/components/ai-runtime/AiEnhancementStatusPanel.vue";
import AiRuntimeInstallLoadingOverlay from "@/components/ai-runtime/AiRuntimeInstallLoadingOverlay.vue";
import { tauriClient } from "@/bridge/tauriClient";
import { useBatchTask } from "@/modules/batch";
import { useTaskBatchNotification } from "@/pages/shared/useTaskBatchNotification";
import { useAiEnhancementPanel } from "@/modules/ai-runtime/useAiEnhancementPanel";
import {
  checkExportEntitlement,
  consumeExportEntitlement,
  promptEntitlementUpgrade
} from "@/modules/entitlement/exportEntitlementGuard";

const { t } = useI18n();
const router = useRouter();

type RemovalStatus = "pending" | "processing" | "done" | "failed";
type RemovalMode = "fast" | "ai";
type InpaintAlgorithm = "telea" | "ns";
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
const removalMode = ref<RemovalMode>("fast");
const basicAlgorithm = ref<InpaintAlgorithm>("telea");
const basicRadius = ref(3);
const batchApply = ref(true);
const outputFormat = ref<OutputFormat>("auto");
const outputDir = ref(t("pages.imageWatermarkRemoval.output.defaultDirectory"));
const elapsedSeconds = ref(0);
const hintMessage = ref("");
const showProcessed = ref(false);
const draftRegion = ref<WatermarkRegion | null>(null);
const modelError = ref("");
const aiPanel = useAiEnhancementPanel();
const {
  aiRuntime,
  hasInstalledAiRuntime,
  aiRuntimeSimpleStatusText,
  aiRuntimeStatus,
  aiRuntimeProgress,
  isRuntimeBusy,
  aiRuntimeStatusText,
  refreshStatus,
  ensureRuntimeReady,
  ensureModelReady
} = aiPanel;
const { submit, cancel, openOutputDirectory: openBatchOutputDirectory, progress, isRunning, result, failures } = useBatchTask();
const { notifyTaskBatchCompleted } = useTaskBatchNotification();
const lastNotifiedTaskId = ref<string | null>(null);

let disposeDrop: UnlistenFn | null = null;
let elapsedTimer: number | null = null;
let dragStart: { x: number; y: number } | null = null;
let hasManualModeSelection = false;

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
const canStart = computed(() => {
  if (isRunning.value) return false;
  if (items.value.length === 0 || !hasRegions.value) return false;
  if (removalMode.value === "ai") {
    return hasInstalledAiRuntime.value;
  }
  return true;
});
const currentProgressItem = computed(() => items.value[Math.min(currentIndex.value, Math.max(0, items.value.length - 1))] ?? selectedItem.value);
const selectedPreviewFit = computed<"landscape" | "portrait">(() => {
  const item = selectedItem.value;
  if (!item || item.width <= 0 || item.height <= 0) return "landscape";
  return item.height > item.width ? "portrait" : "landscape";
});

const progressTitle = computed(() => {
  if (!isRunning.value) return t("pages.imageWatermarkRemoval.progress.noTask");
  return t("pages.imageWatermarkRemoval.progress.processing", {
    current: currentDisplayIndex.value,
    total: items.value.length
  });
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
  return t(`pages.imageWatermarkRemoval.itemStatus.${status}`);
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
    hintMessage.value = t("pages.imageWatermarkRemoval.hints.unsupportedFormats");
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
    filters: [{ name: t("pages.imageWatermarkRemoval.dialog.imagesFilterName"), extensions: supportedExtensions }]
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
    hintMessage.value =
      items.value.length === 0
        ? t("pages.imageWatermarkRemoval.hints.addImagesFirst")
        : t("pages.imageWatermarkRemoval.hints.selectRegionsFirst");
    return;
  }
  const entitlement = await checkExportEntitlement("image-watermark-removal");
  if (!entitlement.allowed) {
    if (entitlement.reason === "no_entitlement" || entitlement.reason === "service_error") {
      hintMessage.value = t("common.entitlement.noEntitlement");
      await promptEntitlementUpgrade(router, t, "image-watermark-removal");
    }
    return;
  }
  const consume = await consumeExportEntitlement({
    tool: "image-watermark-removal",
    amount: Math.max(1, items.value.length),
    sourceId: items.value[0]?.id ?? "batch",
    idempotencyKey: `image-watermark-removal:batch:${items.value.length}:${items.value[0]?.id ?? "batch"}`
  });
  if (!consume.allowed) {
    if (consume.reason === "no_entitlement" || consume.reason === "service_error") {
      hintMessage.value = t("common.entitlement.noEntitlement");
      await promptEntitlementUpgrade(router, t, "image-watermark-removal");
    }
    return;
  }
  stopTimers();
  showProcessed.value = false;
  elapsedSeconds.value = 0;
  lastNotifiedTaskId.value = null;
  modelError.value = "";
  items.value.forEach((item) => {
    item.status = "pending";
    item.outputPath = undefined;
    item.processedPreviewUrl = undefined;
  });
  try {
    if (removalMode.value === "ai") {
      const ready = await ensureRuntimeReady();
      if (!ready) {
        hintMessage.value =
          aiRuntime.error.value || aiRuntime.environment.value?.reasons?.[0] || t("aiEnhancement.errors.notReady");
        return;
      }
      await ensureModelReady();
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
        algorithm: basicAlgorithm.value,
        radius: basicRadius.value,
        regionsByFile: buildRegionsByFile()
      },
      concurrencyPreset: "lowUsage"
    });
  } catch (error) {
    stopTimers();
    const message = error instanceof Error ? error.message : String(error);
    hintMessage.value = message || t("pages.imageWatermarkRemoval.hints.startTaskFailed");
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
    modelError.value =
      failures.value[0]?.errorMessage || snapshot.message || t("pages.imageWatermarkRemoval.hints.batchFailed");
    hintMessage.value = modelError.value;
  }
  if (snapshot.status === "FINISHED" || snapshot.status === "FAILED") {
    if (lastNotifiedTaskId.value !== snapshot.taskId) {
      lastNotifiedTaskId.value = snapshot.taskId;
      const elapsedMs =
        snapshot.finishedAtMs && snapshot.startedAtMs
          ? snapshot.finishedAtMs - snapshot.startedAtMs
          : elapsedSeconds.value * 1000;
      notifyTaskBatchCompleted(
        "pages.imageWatermarkRemoval.title",
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

onMounted(async () => {
  void setupNativeDrop();
  void refreshStatus(() => syncRemovalModeWithAi());
});

onBeforeUnmount(() => {
  disposeDrop?.();
  stopTimers();
});
</script>

<template>
  <div class="image-watermark-removal-page">
    <div class="wm-workspace">
      <section class="wm-card wm-card--list" aria-labelledby="wm-list-title">
        <div class="wm-card-head">
          <h3 id="wm-list-title" class="wm-card-head__title">{{ t("pages.imageWatermarkRemoval.list.fileListTitle", { count: items.length }) }}</h3>
          <div class="wm-card-head__actions">
            <button type="button" class="wm-btn wm-btn--small" :disabled="items.length === 0 || isRunning" @click="clearList">
              <Trash2 :size="15" />{{ t("pages.imageWatermarkRemoval.list.clearList") }}
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
          <p class="wm-drop__title">{{ t("pages.imageWatermarkRemoval.drop.titlePrefix") }}<span @click.stop="pickFiles">{{ t("pages.imageWatermarkRemoval.drop.titleAction") }}</span></p>
          <p class="wm-drop__sub">{{ t("pages.imageWatermarkRemoval.drop.formatsHint") }}</p>
          <template v-if="items.length === 0">
            <strong class="wm-drop__batch">{{ t("pages.imageWatermarkRemoval.drop.batchLabel") }}</strong>
            <p class="wm-drop__sub">{{ t("pages.imageWatermarkRemoval.drop.batchHint") }}</p>
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
          <span>{{ t("pages.imageWatermarkRemoval.list.summaryCount", { count: items.length }) }}</span>
          <span>{{ t("pages.imageWatermarkRemoval.list.totalSize", { size: formatBytes(totalBytes) }) }}</span>
        </footer>
      </section>

      <section class="wm-card wm-card--preview" aria-labelledby="wm-preview-title">
        <header class="wm-preview-head">
          <div>
            <h3 id="wm-preview-title" class="wm-card-head__title">{{ t("pages.imageWatermarkRemoval.preview.sectionTitle") }}</h3>
            <p class="wm-warning"><Info :size="14" />{{ selectedItem ? t("pages.imageWatermarkRemoval.preview.hintWithImage") : t("pages.imageWatermarkRemoval.preview.hintNoImage") }}</p>
          </div>
          <div class="wm-tabs">
            <button type="button" :class="{ on: !showProcessed }" @click="showProcessed = false">{{ t("pages.imageWatermarkRemoval.preview.tabOriginal") }}</button>
            <button type="button" :class="{ on: showProcessed }" :disabled="!canShowProcessed" @click="showProcessed = true">{{ t("pages.imageWatermarkRemoval.preview.tabProcessed") }}</button>
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
                <button
                  type="button"
                  :title="t('pages.imageWatermarkRemoval.preview.removeRegion')"
                  :aria-label="t('pages.imageWatermarkRemoval.preview.removeRegion')"
                  @pointerdown.stop
                  @click.stop="removeRegion(region.id)"
                >
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
            <strong>{{ t("pages.imageWatermarkRemoval.preview.emptyTitle") }}</strong>
            <span>{{ t("pages.imageWatermarkRemoval.preview.emptyHint") }}</span>
          </div>
        </div>

        <footer class="wm-preview-foot">
          <p><Info :size="14" />{{ t("pages.imageWatermarkRemoval.preview.footTip") }}</p>
          <button v-if="selectedItem" type="button" class="wm-btn wm-btn--small" @click="clearRegions"><Trash2 :size="14" />{{ t("pages.imageWatermarkRemoval.preview.clearRegions") }}</button>
        </footer>
      </section>

      <section class="wm-card wm-card--settings" aria-labelledby="wm-settings-title">
        <h3 id="wm-settings-title" class="wm-card-head__title">{{ t("pages.imageWatermarkRemoval.settings.title") }}</h3>
        <div class="wm-separator" />

        <div class="wm-settings-section">
          <h4>{{ t("pages.watermarkRemoval.mode.title") }}</h4>
          <div class="mode-options" role="radiogroup" :aria-label="t('pages.watermarkRemoval.mode.ariaLabel')">
            <label class="mode-option" :class="{ 'mode-option--active': removalMode === 'fast' }">
              <input type="radio" name="imageRemovalMode" value="fast" :checked="removalMode === 'fast'" @change="applyMode('fast')" />
              <span>{{ t("pages.watermarkRemoval.mode.fast") }}</span>
            </label>
            <label class="mode-option" :class="{ 'mode-option--active': removalMode === 'ai' }">
              <input type="radio" name="imageRemovalMode" value="ai" :checked="removalMode === 'ai'" @change="applyMode('ai')" />
              <span>{{ t("pages.watermarkRemoval.mode.ai") }}</span>
            </label>
          </div>
          <p v-if="removalMode === 'fast'" class="wm-muted">{{ t("pages.watermarkRemoval.mode.fastHintImage") }}</p>
          <p v-else class="wm-muted">{{ t("pages.watermarkRemoval.mode.aiHintImage") }}</p>
        </div>

        <AiEnhancementStatusPanel @synced="syncRemovalModeWithAi(true)" />
      </section>
    </div>

    <footer class="wm-bottom">
      <div class="wm-bottom__summary">
        <div class="wm-ring" :style="{ '--p': progressPercent }"><span>{{ progressPercent }}%</span></div>
        <div class="wm-bottom__metrics">
          <h3>{{ t("pages.imageWatermarkRemoval.bottomBar.overallProgress") }}</h3>
          <dl class="wm-metrics-grid">
            <div>
              <dt>{{ t("pages.imageWatermarkRemoval.bottomBar.status") }}</dt>
              <dd>{{ isRunning ? progressTitle : t("pages.imageWatermarkRemoval.progress.noTask") }}</dd>
            </div>
            <div>
              <dt>{{ t("pages.watermarkRemoval.aiComponentStatus") }}</dt>
              <dd>{{ aiRuntimeSimpleStatusText }}</dd>
            </div>
            <div>
              <dt>{{ t("pages.imageWatermarkRemoval.bottomBar.taskCount") }}</dt>
              <dd>{{ t("pages.imageWatermarkRemoval.bottomBar.taskCountValue", { count: items.length }) }}</dd>
            </div>
            <div>
              <dt>{{ t("pages.imageWatermarkRemoval.bottomBar.elapsed") }}</dt>
              <dd>{{ isRunning ? formatDuration(elapsedSeconds) : "--:--:--" }}</dd>
            </div>
            <div class="wm-metrics-grid__progress">
              <dt>{{ t("pages.imageWatermarkRemoval.bottomBar.overallProgressDetail") }}</dt>
              <dd>
                <span>{{ isRunning ? `${progressPercent}%` : "--" }}</span>
                <div class="wm-progress-line"><i :style="{ width: `${isRunning ? progressPercent : 0}%` }" /></div>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div class="wm-bottom__footer">
        <div class="wm-bottom__output">
          <label for="wm-bottom-output-dir">{{ t("pages.imageWatermarkRemoval.bottomBar.outputDirLabel") }}</label>
          <div class="wm-bottom__output-row">
            <input
              id="wm-bottom-output-dir"
              v-model="outputDir"
              type="text"
              :disabled="isRunning"
              :title="t('pages.imageWatermarkRemoval.bottomBar.outputDirTitle')"
            />
            <button
              type="button"
              :title="t('pages.imageWatermarkRemoval.bottomBar.pickOutputAria')"
              :aria-label="t('pages.imageWatermarkRemoval.bottomBar.pickOutputAria')"
              :disabled="isRunning"
              @click="pickOutputDir"
            >
              <Folder :size="18" />
            </button>
          </div>
        </div>

        <div class="wm-bottom__actions">
          <button type="button" class="wm-action wm-action--primary" :disabled="!canStart" @click="startRemoval">
            <PlayCircle :size="18" />{{ t("pages.imageWatermarkRemoval.bottomBar.start") }}
          </button>
          <button type="button" class="wm-action" :disabled="!isRunning" @click="stopTask"><PauseCircle :size="18" />{{ t("pages.imageWatermarkRemoval.bottomBar.stopTask") }}</button>
          <button type="button" class="wm-action" @click="openOutputDirectory"><Folder :size="18" />{{ t("pages.imageWatermarkRemoval.bottomBar.openOutput") }}</button>
        </div>
      </div>
    </footer>
    <AiRuntimeInstallLoadingOverlay
      v-if="isRuntimeBusy"
      :title="t('aiEnhancement.overlay.processingTitle')"
      :message="aiRuntimeProgress?.message || aiRuntimeStatusText"
    />
    <div v-if="modelError && !isRuntimeBusy" class="wm-model-error" role="alert">
      <div>
        <strong>{{ t("pages.imageWatermarkRemoval.model.prepFailedTitle") }}</strong>
        <span>{{ modelError }}</span>
      </div>
      <button type="button" @click="modelError = ''">{{ t("pages.imageWatermarkRemoval.model.close") }}</button>
    </div>
    <p class="wm-toast-tip">{{ t("pages.imageWatermarkRemoval.toastTip") }}</p>
  </div>
</template>

<style scoped>
.image-watermark-removal-page {
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

.wm-workspace {
  display: grid;
  grid-template-columns: minmax(220px, 0.78fr) minmax(260px, 1.15fr) minmax(240px, 0.82fr);
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
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
}

.wm-card--list,
.wm-card--preview,
.wm-card--settings {
  padding: clamp(12px, 1.5vh, 18px);
}

.wm-card--list {
  overflow: hidden;
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
  flex: 0 0 auto;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: clamp(8px, 1.2vh, 14px);
}

.wm-card-head__title {
  margin: 0;
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
}

.wm-card-head__actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.wm-btn,
.wm-action {
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

.wm-btn:focus-visible,
.wm-action:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.wm-btn {
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  white-space: nowrap;
}

.wm-btn--small {
  height: 34px;
  padding: 0 12px;
  font-size: 12px;
}

.wm-btn:hover:not(:disabled) {
  border-color: #dbeafe;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.06);
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

.wm-drop--compact {
  flex: 0 1 auto;
  min-height: 62px;
  flex-direction: row;
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 10px;
  padding: 10px 12px;
  text-align: left;
}

.wm-drop--compact .wm-drop__art {
  flex: 0 0 auto;
  margin-bottom: 0;
}

.wm-drop--compact .wm-drop__plus {
  right: -8px;
  bottom: -5px;
  width: 20px;
  height: 20px;
  font-size: 16px;
}

.wm-drop--compact .wm-drop__title {
  margin: 0;
  font-size: 13px;
}

.wm-drop--compact .wm-drop__sub {
  display: none;
}

.wm-drop--active {
  border-color: #c7d2fe;
  background: var(--surface-muted);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.wm-drop__art {
  position: relative;
  color: var(--primary);
  opacity: 0.85;
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
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.wm-drop__title span {
  color: var(--primary);
  cursor: pointer;
}

.wm-drop__sub,
.wm-muted,
.wm-list-foot,
.wm-preview-foot,
.wm-bottom span,
.wm-bottom small {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.wm-hint {
  color: #ef4444;
  font-size: 13px;
  line-height: 1.45;
}

.wm-warning,
.wm-preview-foot {
  font-size: 13px;
}

.wm-drop__batch {
  margin-top: clamp(12px, 5vh, 28px);
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.wm-file-list {
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

.wm-file {
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

.wm-file--selected {
  border-color: #c7d2fe;
  background: #fafbfd;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.08);
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
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.wm-file__meta span {
  color: var(--text-muted);
  font-size: 12px;
}

.wm-file__status {
  padding: 6px 9px;
  border-radius: 8px;
  color: var(--primary);
  background: #f5f6fa;
  font-size: 12px;
  font-weight: 600;
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
  color: var(--text-secondary);
  cursor: pointer;
}

.wm-list-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-top: 14px;
  margin-top: auto;
  flex: 0 0 auto;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-muted);
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
  border: 1px solid var(--border-weak);
  border-radius: 12px;
  overflow: hidden;
}

.wm-tabs button,
.wm-segment button {
  border: 0;
  background: #fff;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
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
  border-radius: 14px;
  background: #fafbfd;
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
  color: var(--text);
}

.wm-empty-preview strong {
  font-size: 14px;
  font-weight: 600;
}

.wm-empty-preview span {
  font-size: 13px;
  color: var(--text-secondary);
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
  color: var(--primary);
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
.wm-card--list,
.wm-file-list,
.wm-card--settings {
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}

.image-watermark-removal-page::-webkit-scrollbar,
.wm-card--list::-webkit-scrollbar,
.wm-file-list::-webkit-scrollbar,
.wm-card--settings::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.image-watermark-removal-page::-webkit-scrollbar-track,
.wm-card--list::-webkit-scrollbar-track,
.wm-file-list::-webkit-scrollbar-track,
.wm-card--settings::-webkit-scrollbar-track {
  background: transparent;
}

.image-watermark-removal-page::-webkit-scrollbar-thumb,
.wm-card--list::-webkit-scrollbar-thumb,
.wm-file-list::-webkit-scrollbar-thumb,
.wm-card--settings::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: #d6d9e0;
  background-clip: padding-box;
}

.wm-separator {
  height: 1px;
  background: var(--border);
}

.wm-settings-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.wm-field-label {
  display: block;
  margin-bottom: 12px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.wm-tabs button.on {
  color: #fff;
  background: var(--primary);
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

.wm-muted {
  margin: 10px 0 0;
  line-height: 1.5;
  color: var(--text-muted);
  font-size: 12px;
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
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.wm-switch-row em {
  color: var(--text-muted);
  font-style: normal;
  font-size: 12px;
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
  min-height: 176px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
}

.wm-bottom__summary {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 18px;
}

.wm-ring {
  --p: 0;
  width: 82px;
  height: 82px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(var(--primary) calc(var(--p) * 1%), #e7e9ee 0);
}

.wm-ring::before {
  content: "";
  position: absolute;
}

.wm-ring span {
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

.wm-bottom__metrics {
  flex: 1;
  min-width: 0;
}

.wm-bottom__metrics h3 {
  margin: 0 0 12px;
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.wm-metrics-grid {
  display: grid;
  grid-template-columns: minmax(92px, 0.8fr) minmax(180px, 1.25fr) minmax(120px, 0.9fr) minmax(110px, 0.9fr) minmax(280px, 1.9fr);
  gap: 18px;
  margin: 0;
}

.wm-metrics-grid > div {
  min-width: 0;
}

.wm-metrics-grid dt {
  margin: 0 0 6px;
  color: var(--text-hint);
  font-size: 12px;
  font-weight: 600;
}

.wm-metrics-grid dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text);
  font-size: 13px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wm-metrics-grid__progress dd {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  gap: 10px;
}

.wm-metrics-grid__progress dd > span {
  order: 2;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  text-align: right;
}

.wm-progress-line {
  height: 8px;
  min-width: 0;
  overflow: hidden;
  border-radius: 999px;
  background: #e7e9ee;
}

.wm-progress-line i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.wm-bottom__footer {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.wm-bottom__output {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.wm-bottom__output label {
  flex: 0 0 auto;
  color: var(--text-hint);
  font-size: 12px;
  font-weight: 600;
}

.wm-bottom__output-row {
  width: min(420px, 100%);
  flex: 0 1 420px;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 0;
}

.wm-bottom__output-row input,
.wm-bottom__output-row button {
  height: 42px;
  border: 1px solid var(--border-strong);
  background: #fff;
}

.wm-bottom__output-row input {
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

.wm-bottom__output-row button {
  display: grid;
  place-items: center;
  border-radius: 0 12px 12px 0;
  color: var(--text-secondary);
  cursor: pointer;
}

.wm-bottom__output-row button:hover:not(:disabled) {
  color: var(--primary);
  border-color: #c7d2fe;
  background: #fafbfd;
}

.wm-bottom__actions {
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: nowrap;
}

.wm-action {
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

.wm-action--primary {
  color: #fff;
  border: none;
  font-weight: 700;
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
  box-shadow: var(--cta-shadow);
}

.wm-action--primary:hover:not(:disabled) {
  filter: brightness(1.03);
  box-shadow: 0 6px 16px rgba(243, 132, 30, 0.32);
}

.wm-action--primary:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

.wm-model-error {
  width: min(560px, calc(100vw - 48px));
  padding: 18px;
  border-radius: 10px;
  box-shadow: 0 18px 48px rgba(16, 25, 54, 0.18);
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
  color: var(--text-hint);
  text-align: center;
  font-size: 12px;
  line-height: 1.5;
}

</style>
