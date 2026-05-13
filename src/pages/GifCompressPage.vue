<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useBatchTask } from "@/modules/batch";
import type { BatchConcurrencyPreset } from "@/modules/batch/types";
import { useTaskBatchNotification } from "@/pages/shared/useTaskBatchNotification";

const { t } = useI18n();
const { notifyTaskBatchCompleted } = useTaskBatchNotification();
const {
  submit,
  cancel,
  openOutputDirectory,
  progress,
  isRunning,
  failures,
  successOutputs,
  result
} = useBatchTask();

const MAX_FILES = 20;
const RECOMMENDED_MB = 200;

type ListStatus = "ready" | "pending" | "processing" | "saving" | "done" | "failed";

interface GifItem {
  id: string;
  path: string;
  name: string;
  bytes: number;
  status: ListStatus;
}

type CompressionMode = "LIGHT" | "RECOMMENDED" | "EXTREME";
type ResizePolicy = "KEEP" | "P80" | "P60" | "P50" | "CUSTOM_WIDTH";
type FpsPreset = "SOURCE" | "FPS_15" | "FPS_12" | "FPS_10" | "FPS_8";
type ColorCount = "C256" | "C128" | "C64" | "C32";
type CompressQuality = "LOW" | "MEDIUM" | "HIGH";
type DitherLevel = "OFF" | "LOW" | "MEDIUM" | "HIGH";
type LoopPolicy = "PRESERVE_SOURCE" | "FORCE_LOOP" | "NO_LOOP";
type OutputDirPolicy = "SAME_AS_SOURCE" | "SOURCE_SUBFOLDER" | "CUSTOM";
type FilenameRule = "COMPRESSED_EN" | "COMPRESSED_ZH";
type ConcurrencyChoice = "auto" | "1" | "2" | "4";

const items = ref<GifItem[]>([]);
const selectedId = ref<string | null>(null);
const hintMessage = ref("");
const isDropActive = ref(false);
const basicOpen = ref(true);
const advancedOpen = ref(false);
const batchStartedAt = ref<number | null>(null);

const mode = ref<CompressionMode>("RECOMMENDED");
const resize = ref<ResizePolicy>("KEEP");
const fps = ref<FpsPreset>("FPS_12");
const colors = ref<ColorCount>("C128");
const quality = ref<CompressQuality>("MEDIUM");
const removeDuplicateFrames = ref(true);
const targetSizeMb = ref<string>("");
const outputDirPolicy = ref<OutputDirPolicy>("SAME_AS_SOURCE");
const customOutputDir = ref("");
const dither = ref<DitherLevel>("MEDIUM");
const loopPolicy = ref<LoopPolicy>("PRESERVE_SOURCE");
const keepTransparency = ref(true);
const filenameRule = ref<FilenameRule>("COMPRESSED_EN");
const fastMode = ref(false);
const concurrencyChoice = ref<ConcurrencyChoice>("auto");
const customWidth = ref<number>(480);

let disposeDrop: UnlistenFn | null = null;
const lastNotifiedTaskId = ref<string | null>(null);

const selectedItem = computed(() => items.value.find((i) => i.id === selectedId.value) ?? null);

const totalBytes = computed(() => items.value.reduce((s, i) => s + i.bytes, 0));

const displayProcessingIndex = computed(() => {
  const p = progress.value;
  if (!p?.total) return 0;
  if (!isRunning.value) return p.finished;
  if (p.currentFile && p.status === "RUNNING") {
    return Math.min(p.finished + 1, p.total);
  }
  return Math.max(1, p.finished);
});

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(2) : v.toFixed(1)} ${u[i]}`;
}

function extractName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts.pop() || path;
}

function pathKey(p: string): string {
  return p.replaceAll("\\", "/").toLowerCase();
}

function stemOfFileName(name: string): string {
  return name.replace(/\.gif$/i, "");
}

function statusLabel(st: ListStatus): string {
  const key: Record<ListStatus, string> = {
    ready: "statusReady",
    pending: "statusPending",
    processing: "statusProcessing",
    saving: "statusSaving",
    done: "statusDone",
    failed: "statusFailed"
  };
  return t(`pages.gifCompress.${key[st]}`);
}

function hasSuccessForInput(inputPath: string, outs: readonly string[]): boolean {
  const stem = stemOfFileName(extractName(inputPath));
  return outs.some((o) => {
    const base = stemOfFileName(extractName(o));
    return base.startsWith(`${stem}_`) && (base.includes("COMPRESSED") || base.includes("压缩"));
  });
}

/** When source FPS is unknown, avoid underestimating frame count impact. */
const ASSUMED_REFERENCE_FPS = 12;

/**
 * Heuristic ratio (compressed / original). GIF re-encode can exceed 1.0 (palette + dither + LZW),
 * so we do not cap at &lt;1 — the old 0.95 cap made previews far smaller than disk output.
 */
function estimateOutputRatio(): number {
  let base = 0.92;
  if (mode.value === "LIGHT") base = 1.05;
  if (mode.value === "EXTREME") base = 0.72;

  const fpsOutMap: Record<FpsPreset, number> = {
    SOURCE: 14,
    FPS_15: 15,
    FPS_12: 12,
    FPS_10: 10,
    FPS_8: 8
  };
  const fpsOut = fpsOutMap[fps.value] ?? 12;
  const frameLoad = Math.min(1.12, fpsOut / ASSUMED_REFERENCE_FPS);

  let r = base * frameLoad;

  if (resize.value === "P80") r *= 0.94;
  else if (resize.value === "P60") r *= 0.82;
  else if (resize.value === "P50") r *= 0.7;
  else if (resize.value === "CUSTOM_WIDTH") r *= 0.88;

  const colMap: Record<ColorCount, number> = {
    C256: 1.08,
    C128: 1.02,
    C64: 0.94,
    C32: 0.85
  };
  r *= colMap[colors.value] ?? 1;

  if (quality.value === "HIGH") r *= 1.06;
  if (quality.value === "LOW") r *= 0.94;

  if (removeDuplicateFrames.value && fps.value !== "SOURCE" && !fastMode.value) {
    r *= 0.9;
  } else if (!removeDuplicateFrames.value) {
    r *= 1.05;
  }

  if (fastMode.value) r *= 0.97;

  const ditherMap: Record<DitherLevel, number> = {
    OFF: 0.96,
    LOW: 1,
    MEDIUM: 1.05,
    HIGH: 1.12
  };
  r *= ditherMap[dither.value] ?? 1.05;

  if (!keepTransparency.value) r *= 0.98;

  r *= 1.06;

  return Math.min(1.5, Math.max(0.05, r));
}

/** Bytes of on-disk output for current selection, when a matching success path exists. */
const measuredCompressedBytes = ref<number | null>(null);

const estimatedCompressedBytes = computed(() => {
  if (!selectedItem.value) return null;
  if (measuredCompressedBytes.value != null && measuredCompressedBytes.value > 0) {
    return measuredCompressedBytes.value;
  }
  return Math.round(selectedItem.value.bytes * estimateOutputRatio());
});

const savingsPct = computed(() => {
  if (!selectedItem.value || estimatedCompressedBytes.value == null) return null;
  const o = selectedItem.value.bytes;
  if (o <= 0) return null;
  return Math.round((1 - estimatedCompressedBytes.value / o) * 1000) / 10;
});

const originalPreviewSrc = computed(() => {
  const p = selectedItem.value?.path;
  if (!p || !isTauri()) return "";
  return convertFileSrc(p);
});

const compressedPreviewSrc = ref("");

watch([successOutputs, selectedItem], async () => {
  const sel = selectedItem.value;
  if (!sel || successOutputs.value.length === 0) {
    compressedPreviewSrc.value = "";
    measuredCompressedBytes.value = null;
    return;
  }
  const stem = sel.name.replace(/\.gif$/i, "");
  const hit = successOutputs.value.find(
    (p) =>
      p.toLowerCase().endsWith(".gif") &&
      (p.includes(`${stem}_COMPRESSED`) || p.includes(`${stem}_压缩`))
  );
  compressedPreviewSrc.value = hit && isTauri() ? convertFileSrc(hit) : "";

  if (!hit || !isTauri()) {
    measuredCompressedBytes.value = null;
    return;
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const m = await invoke<{ size: number }>("get_path_metadata", { path: hit });
    measuredCompressedBytes.value = Number(m.size ?? 0) || null;
  } catch {
    measuredCompressedBytes.value = null;
  }
});

watch(
  [
    mode,
    resize,
    fps,
    colors,
    quality,
    removeDuplicateFrames,
    dither,
    fastMode,
    keepTransparency,
    loopPolicy,
    customWidth,
    outputDirPolicy,
    filenameRule
  ],
  () => {
    measuredCompressedBytes.value = null;
  }
);

function applyModePreset(m: CompressionMode) {
  mode.value = m;
  if (m === "LIGHT") {
    fps.value = "FPS_15";
    colors.value = "C256";
    quality.value = "HIGH";
    removeDuplicateFrames.value = false;
    dither.value = "HIGH";
  } else if (m === "EXTREME") {
    fps.value = "FPS_8";
    colors.value = "C64";
    quality.value = "LOW";
    removeDuplicateFrames.value = true;
    dither.value = "LOW";
  } else {
    fps.value = "FPS_12";
    colors.value = "C128";
    quality.value = "MEDIUM";
    removeDuplicateFrames.value = true;
    dither.value = "MEDIUM";
  }
}

function restoreDefaults() {
  applyModePreset("RECOMMENDED");
  resize.value = "KEEP";
  outputDirPolicy.value = "SAME_AS_SOURCE";
  customOutputDir.value = "";
  loopPolicy.value = "PRESERVE_SOURCE";
  keepTransparency.value = true;
  filenameRule.value = "COMPRESSED_EN";
  fastMode.value = false;
  concurrencyChoice.value = "auto";
  targetSizeMb.value = "";
}

function mapConcurrency(): { preset: BatchConcurrencyPreset; custom?: number } {
  if (concurrencyChoice.value === "auto") return { preset: "balanced" };
  const n = Number(concurrencyChoice.value);
  if (n === 1) return { preset: "lowUsage" };
  return { preset: "custom", custom: n };
}

function resolveSubmitOutputDir(paths: string[]): string {
  const firstDir = paths[0].replace(/[/\\][^/\\]+$/, "");
  if (outputDirPolicy.value === "CUSTOM") {
    return (customOutputDir.value || firstDir).trim() || firstDir;
  }
  return firstDir;
}

function buildOptions(): Record<string, unknown> {
  return {
    mode: mode.value,
    resize: resize.value,
    fps: fps.value,
    colors: colors.value,
    quality: quality.value,
    removeDuplicateFrames: removeDuplicateFrames.value,
    targetSizeMb: null,
    outputDirPolicy: outputDirPolicy.value,
    dither: dither.value,
    loopPolicy: loopPolicy.value,
    keepTransparency: keepTransparency.value,
    filenameRule: filenameRule.value,
    fastMode: fastMode.value,
    customWidth: resize.value === "CUSTOM_WIDTH" ? customWidth.value : null
  };
}

function appendPaths(paths: string[]) {
  const gifPaths = paths.filter((p) => p.toLowerCase().endsWith(".gif"));
  if (gifPaths.length === 0) {
    hintMessage.value = t("pages.gifCompress.hints.unsupportedFormat");
    return;
  }
  hintMessage.value = "";
  const existing = new Set(items.value.map((i) => i.path));
  for (const p of gifPaths) {
    if (items.value.length >= MAX_FILES) break;
    if (existing.has(p)) continue;
    existing.add(p);
    items.value.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      path: p,
      name: extractName(p),
      bytes: 0,
      status: "ready"
    });
  }
  if (!selectedId.value && items.value.length > 0) {
    selectedId.value = items.value[0]?.id ?? null;
  }
  void hydrateSizes();
}

async function hydrateSizes() {
  const { invoke } = await import("@tauri-apps/api/core");
  for (const it of items.value) {
    if (it.bytes > 0) continue;
    try {
      const m = await invoke<{ size: number }>("get_path_metadata", { path: it.path });
      it.bytes = Number(m.size ?? 0);
    } catch {
      it.bytes = 0;
    }
  }
}

async function pickFiles() {
  try {
    const selected = await open({
      multiple: true,
      filters: [{ name: "GIF", extensions: ["gif"] }]
    });
    if (!selected) return;
    const list = Array.isArray(selected) ? selected : [selected];
    appendPaths(list);
  } catch (e) {
    hintMessage.value = t("pages.gifCompress.pickFailed", { message: String(e) });
  }
}

function clearList() {
  if (isRunning.value) return;
  items.value = [];
  selectedId.value = null;
  hintMessage.value = "";
}

function removeItem(id: string) {
  if (isRunning.value) return;
  items.value = items.value.filter((i) => i.id !== id);
  if (selectedId.value === id) selectedId.value = items.value[0]?.id ?? null;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDropActive.value = false;
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  const paths: string[] = [];
  for (const f of Array.from(files)) {
    const p = (f as File & { path?: string }).path;
    if (p) paths.push(p);
  }
  if (!paths.length) {
    hintMessage.value = t("pages.gifCompress.hints.dragNoPath");
    return;
  }
  appendPaths(paths);
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  isDropActive.value = true;
}

function onDragLeave() {
  isDropActive.value = false;
}

async function setupNativeDrop() {
  if (!isTauri()) return;
  const w = getCurrentWindow();
  disposeDrop = await w.onDragDropEvent((ev) => {
    if (ev.payload.type === "over" || ev.payload.type === "enter") {
      isDropActive.value = true;
      return;
    }
    if (ev.payload.type === "leave") {
      isDropActive.value = false;
      return;
    }
    if (ev.payload.type === "drop") {
      isDropActive.value = false;
      appendPaths(ev.payload.paths);
    }
  });
}

async function pickCustomOutput() {
  const dir = await open({ directory: true, multiple: false });
  if (!dir || Array.isArray(dir)) return;
  customOutputDir.value = dir;
  outputDirPolicy.value = "CUSTOM";
}

const canStart = computed(() => items.value.length > 0 && !isRunning.value);

async function startCompression() {
  if (!canStart.value) return;
  const paths = items.value.map((i) => i.path);
  const outDir = resolveSubmitOutputDir(paths);
  const { preset, custom } = mapConcurrency();
  const payload = {
    taskType: "GIF_COMPRESS" as const,
    inputFiles: paths,
    outputDir: outDir,
    options: buildOptions(),
    concurrencyPreset: preset,
    ...(preset === "custom" && custom != null ? { customConcurrency: custom } : {})
  };
  items.value.forEach((i) => {
    i.status = "pending";
  });
  batchStartedAt.value = Date.now();
  lastNotifiedTaskId.value = null;
  await submit(payload);
}

watch(
  () => progress.value,
  (p) => {
    if (!p || !isRunning.value) return;
    const cur = p.currentFile;
    const failedKeys = new Set(failures.value.map((f) => pathKey(f.inputPath)));
    for (const it of items.value) {
      if (failedKeys.has(pathKey(it.path))) {
        it.status = "failed";
        continue;
      }
      if (cur && (pathKey(cur) === pathKey(it.path) || pathKey(cur).endsWith("/" + pathKey(it.name)))) {
        it.status = "processing";
      } else if (it.status === "processing") {
        it.status = "pending";
      }
    }
  },
  { deep: true }
);

watch([result, failures, successOutputs], () => {
  const r = result.value;
  if (!r) return;
  if (r.status === "RUNNING" || r.status === "PENDING" || r.status === "PAUSED") return;

  const failedKeys = new Set(failures.value.map((f) => pathKey(f.inputPath)));
  const outs = successOutputs.value;

  for (const it of items.value) {
    if (failedKeys.has(pathKey(it.path))) {
      it.status = "failed";
    } else if (hasSuccessForInput(it.path, outs)) {
      it.status = "done";
    } else if (r.status === "CANCELED") {
      it.status = "ready";
    } else {
      it.status = "failed";
    }
  }

  if (lastNotifiedTaskId.value === r.taskId) return;
  lastNotifiedTaskId.value = r.taskId;

  const elapsed = batchStartedAt.value ? Date.now() - batchStartedAt.value : 0;
  const fmt =
    elapsed >= 3600000
      ? `${Math.floor(elapsed / 3600000)}h ${Math.floor((elapsed % 3600000) / 60000)}m`
      : elapsed >= 60000
        ? `${Math.floor(elapsed / 60000)}m ${Math.floor((elapsed % 60000) / 1000)}s`
        : `${Math.max(1, Math.round(elapsed / 1000))}s`;
  notifyTaskBatchCompleted("pages.home.tools.gifCompress.shortTitle", {
    total: r.total,
    success: r.success,
    failed: r.failed,
    elapsedMs: elapsed
  }, fmt);
});

onMounted(() => {
  void setupNativeDrop();
});

onBeforeUnmount(() => {
  disposeDrop?.();
});

async function onOpenOutput() {
  await openOutputDirectory();
}
</script>

<template>
  <div class="gif-compress-page">
    <header class="gif-page-head">
      <h2 class="gif-page-head__title">{{ t("pages.gifCompress.title") }}</h2>
      <p class="gif-page-head__desc">{{ t("pages.gifCompress.description") }}</p>
    </header>

    <div class="gif-workspace">
      <!-- 左：文件列表 -->
      <section class="gif-col gif-col--list" aria-labelledby="gif-list-title">
        <div class="gif-card-head">
          <h3 id="gif-list-title" class="gif-card-head__title">
            {{ t("pages.gifCompress.listTitle") }} ({{ items.length }})
          </h3>
          <div class="gif-card-head__actions">
            <button type="button" class="btn btn--secondary btn--sm" @click="pickFiles">
              + {{ t("pages.gifCompress.addFiles") }}
            </button>
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              :disabled="isRunning || items.length === 0"
              :aria-label="t('pages.gifCompress.clearListAria')"
              @click="clearList"
            >
              <span class="gif-icon-trash" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          class="gif-drop"
          :class="{ 'gif-drop--active': isDropActive }"
          @click.self="pickFiles"
          @drop="handleDrop"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
        >
          <template v-if="items.length === 0">
            <div class="gif-drop__illu" aria-hidden="true" />
            <p class="gif-drop__title">{{ t("pages.gifCompress.dropTitle") }}</p>
            <p class="gif-drop__meta">{{ t("pages.gifCompress.maxFilesHint", { n: MAX_FILES }) }}</p>
            <p class="gif-drop__meta">{{ t("pages.gifCompress.formatHint") }}</p>
            <p class="gif-drop__meta">{{ t("pages.gifCompress.sizeHint", { mb: RECOMMENDED_MB }) }}</p>
          </template>
          <ul v-else class="gif-file-list">
            <li
              v-for="it in items"
              :key="it.id"
              class="gif-file"
              :class="{ 'gif-file--selected': it.id === selectedId }"
              @click="selectedId = it.id"
            >
              <div class="gif-file__thumb-wrap">
                <img v-if="isTauri()" class="gif-file__thumb" :src="convertFileSrc(it.path)" :alt="''" />
                <span class="gif-file__play" aria-hidden="true" />
              </div>
              <div class="gif-file__meta">
                <span class="gif-file__name">{{ it.name }}</span>
                <span class="gif-file__size">{{ formatBytes(it.bytes) }}</span>
                <span class="gif-file__status" :data-st="it.status">{{ statusLabel(it.status) }}</span>
              </div>
              <button
                type="button"
                class="gif-file__remove"
                :disabled="isRunning"
                :aria-label="t('pages.gifCompress.removeFileAria')"
                @click.stop="removeItem(it.id)"
              >
                ×
              </button>
            </li>
          </ul>
        </div>
        <p v-if="hintMessage" class="gif-hint">{{ hintMessage }}</p>
        <footer v-if="items.length" class="gif-list-foot">
          <span>{{ t("pages.gifCompress.totalFiles", { n: items.length }) }}</span>
          <span>{{ t("pages.gifCompress.totalSize", { size: formatBytes(totalBytes) }) }}</span>
        </footer>
      </section>

      <!-- 中：预览 -->
      <section class="gif-col gif-col--preview" aria-labelledby="gif-preview-title">
        <div class="gif-card-head">
          <div>
            <h3 id="gif-preview-title" class="gif-card-head__title">{{ t("pages.gifCompress.previewTitle") }}</h3>
            <p class="gif-card-head__sub">{{ t("pages.gifCompress.previewDisclaimer") }}</p>
          </div>
        </div>

        <div class="gif-preview-grid">
          <div class="gif-preview-pane">
            <div class="gif-preview-pane__label">
              {{
                selectedItem
                  ? t("pages.gifCompress.originalWithSize", { size: formatBytes(selectedItem.bytes) })
                  : t("pages.gifCompress.originalPreview")
              }}
            </div>
            <div class="gif-preview-box">
              <img
                v-if="selectedItem && originalPreviewSrc"
                class="gif-preview-img"
                :src="originalPreviewSrc"
                alt=""
              />
              <div v-else class="gif-preview-placeholder">
                <p>{{ t("pages.gifCompress.emptyPreviewTitle") }}</p>
                <p class="muted">{{ t("pages.gifCompress.emptyPreviewDesc") }}</p>
              </div>
            </div>
          </div>
          <div class="gif-preview-pane">
            <div class="gif-preview-pane__label gif-preview-pane__label--right">
              <template v-if="selectedItem && estimatedCompressedBytes != null">
                {{ t("pages.gifCompress.compressedEstimate", { size: formatBytes(estimatedCompressedBytes) }) }}
                <span v-if="savingsPct != null" class="gif-badge">{{ t("pages.gifCompress.reductionBadge", { pct: savingsPct }) }}</span>
              </template>
              <template v-else>{{ t("pages.gifCompress.compressedPreview") }}</template>
            </div>
            <div class="gif-preview-box">
              <img
                v-if="compressedPreviewSrc"
                class="gif-preview-img"
                :src="compressedPreviewSrc"
                alt=""
              />
              <img
                v-else-if="selectedItem && originalPreviewSrc"
                class="gif-preview-img gif-preview-img--estimate"
                :src="originalPreviewSrc"
                alt=""
              />
              <div v-else class="gif-preview-placeholder">
                <p>{{ t("pages.gifCompress.emptyPreviewTitle") }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="gif-size-bar">
          <template v-if="selectedItem && estimatedCompressedBytes != null">
            <strong>{{ t("pages.gifCompress.sizeArrow", { from: formatBytes(selectedItem.bytes), to: formatBytes(estimatedCompressedBytes) }) }}</strong>
            <p class="gif-savings">
              {{ t("pages.gifCompress.savings", { size: formatBytes(selectedItem.bytes - estimatedCompressedBytes), pct: savingsPct ?? 0 }) }}
            </p>
          </template>
          <template v-else>
            <span class="muted">-- → --</span>
            <p class="muted">{{ t("pages.gifCompress.savingsShort", { v: "--" }) }}</p>
          </template>
          <p class="gif-micro muted">
            <span class="gif-icon-info" aria-hidden="true" />
            {{ t("pages.gifCompress.estimateNote") }}
          </p>
          <p class="gif-micro muted">{{ t("pages.gifCompress.estimateDisclaimer") }}</p>
        </div>
      </section>

      <!-- 右：设置 -->
      <section class="gif-col gif-col--settings" aria-labelledby="gif-settings-title">
        <div class="gif-card-head gif-card-head--row">
          <h3 id="gif-settings-title" class="gif-card-head__title">{{ t("pages.gifCompress.settingsTitle") }}</h3>
          <button type="button" class="btn btn--link btn--sm" @click="restoreDefaults">
            {{ t("pages.gifCompress.restoreDefaults") }}
          </button>
        </div>

        <div class="gif-settings-scroll">
          <div class="gif-accordion">
            <button type="button" class="gif-accordion__head" @click="basicOpen = !basicOpen">
              {{ t("pages.gifCompress.basicSettings") }}
            </button>
            <div v-show="basicOpen" class="gif-accordion__body">
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.mode") }}</span>
                <div class="gif-seg">
                  <button type="button" :class="{ on: mode === 'LIGHT' }" @click="applyModePreset('LIGHT')">{{ t("pages.gifCompress.modeLight") }}</button>
                  <button type="button" :class="{ on: mode === 'RECOMMENDED' }" @click="applyModePreset('RECOMMENDED')">{{ t("pages.gifCompress.modeRecommended") }}</button>
                  <button type="button" :class="{ on: mode === 'EXTREME' }" @click="applyModePreset('EXTREME')">{{ t("pages.gifCompress.modeExtreme") }}</button>
                </div>
              </div>
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.resize") }}</span>
                <div class="gif-seg gif-seg--wrap">
                  <button type="button" :class="{ on: resize === 'KEEP' }" @click="resize = 'KEEP'">{{ t("pages.gifCompress.resizeKeep") }}</button>
                  <button type="button" :class="{ on: resize === 'P80' }" @click="resize = 'P80'">{{ t("pages.gifCompress.resizeP80") }}</button>
                  <button type="button" :class="{ on: resize === 'P60' }" @click="resize = 'P60'">{{ t("pages.gifCompress.resizeP60") }}</button>
                  <button type="button" :class="{ on: resize === 'P50' }" @click="resize = 'P50'">{{ t("pages.gifCompress.resizeP50") }}</button>
                  <button type="button" :class="{ on: resize === 'CUSTOM_WIDTH' }" @click="resize = 'CUSTOM_WIDTH'">{{ t("pages.gifCompress.resizeCustom") }}</button>
                </div>
                <div v-if="resize === 'CUSTOM_WIDTH'" class="gif-row-input">
                  <label class="muted" for="gif-custom-width">{{ t("pages.gifCompress.customWidthLabel") }}</label>
                  <input id="gif-custom-width" v-model.number="customWidth" type="number" min="2" step="2" class="gif-input" />
                </div>
              </div>
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.fps") }}</span>
                <div class="gif-seg gif-seg--wrap">
                  <button type="button" :class="{ on: fps === 'FPS_15' }" @click="fps = 'FPS_15'">{{ t("pages.gifCompress.fpsSmooth") }}</button>
                  <button type="button" :class="{ on: fps === 'FPS_12' }" @click="fps = 'FPS_12'">{{ t("pages.gifCompress.fpsStandard") }}</button>
                  <button type="button" :class="{ on: fps === 'FPS_10' }" @click="fps = 'FPS_10'">{{ t("pages.gifCompress.fpsCompact") }}</button>
                  <button type="button" :class="{ on: fps === 'FPS_8' }" @click="fps = 'FPS_8'">{{ t("pages.gifCompress.fpsTiny") }}</button>
                  <button type="button" :class="{ on: fps === 'SOURCE' }" @click="fps = 'SOURCE'">{{ t("pages.gifCompress.fpsSource") }}</button>
                </div>
              </div>
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.colors") }}</span>
                <div class="gif-seg">
                  <button type="button" :class="{ on: colors === 'C256' }" @click="colors = 'C256'">256</button>
                  <button type="button" :class="{ on: colors === 'C128' }" @click="colors = 'C128'">128</button>
                  <button type="button" :class="{ on: colors === 'C64' }" @click="colors = 'C64'">64</button>
                  <button type="button" :class="{ on: colors === 'C32' }" @click="colors = 'C32'">32</button>
                </div>
              </div>
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.quality") }}</span>
                <div class="gif-seg">
                  <button type="button" :class="{ on: quality === 'LOW' }" @click="quality = 'LOW'">{{ t("pages.gifCompress.qualityLow") }}</button>
                  <button type="button" :class="{ on: quality === 'MEDIUM' }" @click="quality = 'MEDIUM'">{{ t("pages.gifCompress.qualityMedium") }}</button>
                  <button type="button" :class="{ on: quality === 'HIGH' }" @click="quality = 'HIGH'">{{ t("pages.gifCompress.qualityHigh") }}</button>
                </div>
              </div>
              <label class="gif-toggle">
                <input v-model="removeDuplicateFrames" type="checkbox" />
                {{ t("pages.gifCompress.removeDup") }}
              </label>
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.targetSize") }}</span>
                <div class="gif-row-input">
                  <input v-model="targetSizeMb" type="text" class="gif-input" disabled :placeholder="t('pages.gifCompress.targetSizePlaceholder')" />
                  <span class="muted">{{ t("pages.gifCompress.targetSizeMb") }}</span>
                </div>
                <p class="gif-micro muted">{{ t("pages.gifCompress.targetSizeDisabled") }}</p>
                <p class="gif-micro muted">{{ t("pages.gifCompress.estimatedOutSize", { v: selectedItem && estimatedCompressedBytes != null ? formatBytes(estimatedCompressedBytes) : '--' }) }}</p>
              </div>
            </div>
          </div>

          <div class="gif-accordion">
            <button type="button" class="gif-accordion__head" @click="advancedOpen = !advancedOpen">
              {{ t("pages.gifCompress.advancedSettings") }}
            </button>
            <div v-show="advancedOpen" class="gif-accordion__body">
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.dither") }}</span>
                <select v-model="dither" class="gif-select">
                  <option value="OFF">{{ t("pages.gifCompress.ditherOff") }}</option>
                  <option value="LOW">{{ t("pages.gifCompress.ditherLow") }}</option>
                  <option value="MEDIUM">{{ t("pages.gifCompress.ditherMedium") }}</option>
                  <option value="HIGH">{{ t("pages.gifCompress.ditherHigh") }}</option>
                </select>
              </div>
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.loop") }}</span>
                <select v-model="loopPolicy" class="gif-select">
                  <option value="PRESERVE_SOURCE">{{ t("pages.gifCompress.loopPreserve") }}</option>
                  <option value="FORCE_LOOP">{{ t("pages.gifCompress.loopForce") }}</option>
                  <option value="NO_LOOP">{{ t("pages.gifCompress.loopNone") }}</option>
                </select>
              </div>
              <label class="gif-toggle">
                <input v-model="keepTransparency" type="checkbox" />
                {{ t("pages.gifCompress.transparency") }}
              </label>
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.concurrency") }}</span>
                <div class="gif-seg">
                  <button type="button" :class="{ on: concurrencyChoice === 'auto' }" @click="concurrencyChoice = 'auto'">{{ t("pages.gifCompress.concurrencyAuto") }}</button>
                  <button type="button" :class="{ on: concurrencyChoice === '1' }" @click="concurrencyChoice = '1'">1</button>
                  <button type="button" :class="{ on: concurrencyChoice === '2' }" @click="concurrencyChoice = '2'">2</button>
                  <button type="button" :class="{ on: concurrencyChoice === '4' }" @click="concurrencyChoice = '4'">4</button>
                </div>
              </div>
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.filenameRule") }}</span>
                <select v-model="filenameRule" class="gif-select">
                  <option value="COMPRESSED_EN">{{ t("pages.gifCompress.filenameEn") }}</option>
                  <option value="COMPRESSED_ZH">{{ t("pages.gifCompress.filenameZh") }}</option>
                </select>
              </div>
              <div class="gif-field">
                <span class="gif-field__label">{{ t("pages.gifCompress.outputDir") }}</span>
                <select v-model="outputDirPolicy" class="gif-select">
                  <option value="SAME_AS_SOURCE">{{ t("pages.gifCompress.outputSame") }}</option>
                  <option value="SOURCE_SUBFOLDER">{{ t("pages.gifCompress.outputSubfolder") }}</option>
                  <option value="CUSTOM">{{ t("pages.gifCompress.outputCustom") }}</option>
                </select>
                <button v-if="outputDirPolicy === 'CUSTOM'" type="button" class="btn btn--secondary btn--sm" @click="pickCustomOutput">
                  {{ t("pages.gifCompress.pickOutputDir") }}
                </button>
                <p v-if="outputDirPolicy === 'CUSTOM' && customOutputDir" class="gif-micro muted">{{ customOutputDir }}</p>
              </div>
              <label class="gif-toggle">
                <input v-model="fastMode" type="checkbox" />
                {{ t("pages.gifCompress.fastMode") }}
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 底栏 -->
    <footer class="gif-bottom">
      <div class="gif-bottom__progress">
        <div class="gif-ring" :style="{ '--p': progress?.percent ?? 0 }">
          <span>{{ progress?.percent ?? 0 }}%</span>
        </div>
        <div>
          <div class="gif-bottom__title">{{ t("pages.gifCompress.bottomOverall") }}</div>
          <div v-if="!isRunning && (!progress || progress.total === 0)" class="muted">{{ t("pages.gifCompress.bottomNoTask") }}</div>
          <div v-else-if="progress" class="muted">
            {{ t("pages.gifCompress.bottomProcessing", { cur: displayProcessingIndex, total: progress.total }) }}
          </div>
          <div class="muted">{{ t("pages.gifCompress.totalFiles", { n: items.length }) }}</div>
        </div>
      </div>
      <div class="gif-bottom__bar-wrap">
        <div class="gif-bottom__bar" :style="{ width: `${progress?.percent ?? 0}%` }" />
      </div>
      <div class="gif-bottom__actions">
        <button type="button" class="btn btn--primary" :disabled="!canStart" :aria-label="t('pages.gifCompress.startAria')" @click="startCompression">
          {{ t("pages.gifCompress.start") }}
        </button>
        <button type="button" class="btn btn--secondary" :disabled="!isRunning" :aria-label="t('pages.gifCompress.stopAria')" @click="cancel">
          {{ t("pages.gifCompress.stop") }}
        </button>
        <button type="button" class="btn btn--secondary" :aria-label="t('pages.gifCompress.openOutputAria')" @click="onOpenOutput">
          {{ t("pages.gifCompress.openOutput") }}
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.gif-compress-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: calc(100vh - 120px);
  padding: 14px 18px 96px;
  color: #1f2937;
  background: #f5f6fa;
}
.gif-page-head__title {
  margin: 0;
  font-size: clamp(20px, 1.8vw, 22px);
  font-weight: 700;
}
.gif-page-head__desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
  max-width: 720px;
}
.gif-workspace {
  display: grid;
  grid-template-columns: minmax(220px, 0.95fr) minmax(280px, 1.4fr) minmax(240px, 0.85fr);
  gap: 14px;
  align-items: stretch;
  min-width: 0;
}
@media (max-width: 1100px) {
  .gif-workspace {
    grid-template-columns: 1fr;
  }
}
.gif-col {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 16px;
  padding: 14px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.gif-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.gif-card-head--row {
  align-items: center;
}
.gif-card-head__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.gif-card-head__sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9ca3af;
}
.gif-drop {
  flex: 1;
  min-height: 200px;
  border: 1px dashed #d6d9e0;
  border-radius: 12px;
  background: #fafbfd;
  padding: 12px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.gif-drop--active {
  border-color: #6366f1;
  background: #eef2ff;
}
.gif-drop__title {
  font-weight: 600;
  margin: 8px 0 4px;
}
.gif-drop__meta {
  margin: 2px 0;
  font-size: 12px;
  color: #6b7280;
}
.gif-file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 420px;
  overflow: auto;
}
.gif-file {
  display: grid;
  grid-template-columns: 56px 1fr 28px;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid #eef0f4;
  cursor: pointer;
}
.gif-file--selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
}
.gif-file__thumb {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 8px;
}
.gif-file__thumb-wrap {
  position: relative;
}
.gif-file__play {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: none;
}
.gif-file__play::after {
  content: "";
  position: absolute;
  left: 8px;
  top: 6px;
  border-style: solid;
  border-width: 5px 0 5px 8px;
  border-color: transparent transparent transparent #fff;
}
.gif-file__name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gif-file__size {
  font-size: 12px;
  color: #6b7280;
}
.gif-file__status {
  font-size: 12px;
  color: #22c55e;
}
.gif-file__status[data-st="failed"] {
  color: #ef4444;
}
.gif-file__status[data-st="processing"] {
  color: #2563eb;
}
.gif-file__remove {
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
.gif-file__remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.gif-list-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 12px;
  color: #6b7280;
}
.gif-preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-height: 220px;
}
.gif-preview-pane__label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #4b5563;
}
.gif-preview-pane__label--right {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.gif-badge {
  background: #bbf7d0;
  color: #166534;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.gif-preview-box {
  border: 1px solid #eef0f4;
  border-radius: 12px;
  background: #fafbfd;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.gif-preview-img {
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
}
.gif-preview-img--estimate {
  opacity: 0.55;
  filter: saturate(0.85);
}
.gif-preview-placeholder {
  text-align: center;
  padding: 16px;
  font-size: 13px;
  color: #6b7280;
}
.gif-size-bar {
  margin-top: 12px;
  padding: 10px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #eef0f4;
  font-size: 13px;
}
.gif-savings {
  color: #15803d;
  font-weight: 600;
  margin: 4px 0 0;
}
.gif-micro {
  font-size: 11px;
  margin: 6px 0 0;
}
.muted {
  color: #9ca3af;
}
.gif-settings-scroll {
  overflow: auto;
  max-height: min(560px, calc(100vh - 260px));
  padding-right: 4px;
}
.gif-field {
  margin-bottom: 12px;
}
.gif-field__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 6px;
}
.gif-seg {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.gif-seg button {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #374151;
}
.gif-seg button.on {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}
.gif-seg button:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
.gif-row-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.gif-input {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 13px;
  min-width: 0;
}
.gif-select {
  width: 100%;
  margin-top: 4px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 8px;
  font-size: 13px;
  background: #fff;
}
.gif-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin: 8px 0;
  cursor: pointer;
}
.gif-accordion__head {
  width: 100%;
  text-align: left;
  border: 1px solid #eef0f4;
  background: #f9fafb;
  border-radius: 10px;
  padding: 10px 12px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 8px;
}
.gif-accordion__body {
  padding: 4px 2px 8px;
}
.gif-bottom {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0 -18px -14px;
  padding: 12px 18px;
  background: #fff;
  border-top: 1px solid #eef0f4;
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: 14px;
  align-items: center;
  z-index: 2;
}
@media (max-width: 900px) {
  .gif-bottom {
    grid-template-columns: 1fr;
  }
}
.gif-bottom__progress {
  display: flex;
  align-items: center;
  gap: 12px;
}
.gif-ring {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  border: 4px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #1e3a8a;
  background: conic-gradient(#2563eb calc(var(--p) * 1%), #e5e7eb 0);
}
.gif-bottom__title {
  font-weight: 600;
  font-size: 13px;
}
.gif-bottom__bar-wrap {
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}
.gif-bottom__bar {
  height: 100%;
  background: #2563eb;
  border-radius: 999px;
  transition: width 0.2s;
}
.gif-bottom__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.btn--link {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  font-size: 13px;
}
.btn--ghost {
  background: #f9fafb;
}
.gif-icon-trash::before {
  content: "🗑";
  font-size: 14px;
}
.gif-icon-info::before {
  content: "ⓘ ";
}
</style>
