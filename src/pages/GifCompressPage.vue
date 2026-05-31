<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useRouter } from "vue-router";
import {
  ChevronDown,
  ChevronUp,
  Folder,
  ImagePlus,
  Info,
  Minus,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  X
} from "@lucide/vue";
import { useInterruptOnRouteLeave } from "@/composables/useInterruptOnRouteLeave";
import { useBatchTask } from "@/modules/batch";
import type { BatchConcurrencyPreset } from "@/modules/batch/types";
import { useTaskBatchNotification } from "@/pages/shared/useTaskBatchNotification";
import {
  checkExportEntitlement,
  consumeExportEntitlement,
  promptEntitlementUpgrade
} from "@/modules/entitlement/exportEntitlementGuard";

const gifListImageUrl = "/resources/gifCompress/listImage.png";
const gifPreviewImageUrl = "/resources/gifCompress/preImage.png";

const { t, locale } = useI18n();
const router = useRouter();
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

useInterruptOnRouteLeave({
  when: () => isRunning.value,
  message: () =>
    locale.value.startsWith("zh")
      ? "当前页面任务正在进行，切换页面会中断任务。确定切换吗？"
      : "A task is still running on this page. Switching pages will interrupt it. Continue?",
  interrupt: () => cancel()
});

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
  return p.replace(/\\/g, "/").toLowerCase();
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
  const entitlement = await checkExportEntitlement("gif-compress");
  if (!entitlement.allowed) {
    if (entitlement.reason === "no_entitlement" || entitlement.reason === "service_error") {
      hintMessage.value = t("common.entitlement.noEntitlement");
      await promptEntitlementUpgrade(router, t, "gif-compress");
    }
    return;
  }
  const paths = items.value.map((i) => i.path);
  const consume = await consumeExportEntitlement({
    tool: "gif-compress",
    amount: Math.max(1, paths.length),
    sourceId: paths[0] ?? "batch",
    idempotencyKey: `gif-compress:batch:${pathKey(paths[0] ?? "batch")}:${paths.length}`
  });
  if (!consume.allowed) {
    if (consume.reason === "no_entitlement" || consume.reason === "service_error") {
      hintMessage.value = t("common.entitlement.noEntitlement");
      await promptEntitlementUpgrade(router, t, "gif-compress");
    }
    return;
  }
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
    <div class="gif-workspace">
      <section class="gif-card gif-card--list" aria-labelledby="gif-list-title">
        <div class="gif-card-head">
          <h3 id="gif-list-title" class="gif-card-head__title">{{ t("pages.gifCompress.listTitle") }} ({{ items.length }})</h3>
          <div class="gif-card-head__actions">
            <button type="button" class="gif-btn gif-btn--list-action" @click="pickFiles"><Plus :size="14" />{{ t("pages.gifCompress.addFiles") }}</button>
            <button type="button" class="gif-btn gif-btn--list-action" :disabled="isRunning || items.length === 0" @click="clearList"><Trash2 :size="14" />{{ t("pages.gifCompress.clearList") }}</button>
          </div>
        </div>

        <div v-if="items.length === 0" class="gif-drop gif-drop--empty" :class="{ 'gif-drop--active': isDropActive }" @click.self="pickFiles" @drop="handleDrop" @dragover="onDragOver" @dragleave="onDragLeave">
          <img class="gif-drop__image" :src="gifListImageUrl" alt="" />
          <p class="gif-drop__title">{{ t("pages.gifCompress.dropTitlePrefix") }}<span @click.stop="pickFiles">{{ t("pages.gifCompress.dropTitleAction") }}</span></p>
          <p class="gif-drop__sub">{{ t("pages.gifCompress.maxFilesHint", { n: MAX_FILES }) }}</p>
          <div class="gif-drop__rules"><p>{{ t("pages.gifCompress.formatHint") }}</p><p>{{ t("pages.gifCompress.sizeHint", { mb: RECOMMENDED_MB }) }}</p></div>
        </div>

        <template v-else>
          <div class="gif-drop gif-drop--compact" :class="{ 'gif-drop--active': isDropActive }" @click.self="pickFiles" @drop="handleDrop" @dragover="onDragOver" @dragleave="onDragLeave">
            <ImagePlus class="gif-drop__mini-icon" :size="34" :stroke-width="1.8" />
            <p class="gif-drop__compact-title">{{ t("pages.gifCompress.dropTitlePrefix") }}<span @click.stop="pickFiles">{{ t("pages.gifCompress.dropTitleAction") }}</span></p>
            <p class="gif-drop__sub">{{ t("pages.gifCompress.maxFilesHint", { n: MAX_FILES }) }}</p>
          </div>
          <ul class="gif-file-list">
            <li v-for="it in items" :key="it.id" class="gif-file" :class="{ 'gif-file--selected': it.id === selectedId }" @click="selectedId = it.id">
              <div class="gif-file__thumb-wrap">
                <img class="gif-file__thumb" :src="isTauri() ? convertFileSrc(it.path) : gifListImageUrl" alt="" />
                <PlayCircle class="gif-file__play" :size="31" :stroke-width="1.7" />
              </div>
              <div class="gif-file__meta"><span class="gif-file__name">{{ it.name }}</span><span class="gif-file__size">{{ formatBytes(it.bytes) }}</span></div>
              <span class="gif-file__status" :data-st="it.status">{{ statusLabel(it.status) }}</span>
              <button type="button" class="gif-file__remove" :disabled="isRunning" @click.stop="removeItem(it.id)"><X :size="18" /></button>
            </li>
          </ul>
        </template>
        <p v-if="hintMessage" class="gif-hint">{{ hintMessage }}</p>
        <footer v-if="items.length" class="gif-list-foot"><span>{{ t("pages.gifCompress.totalFiles", { n: items.length }) }}</span><span>{{ t("pages.gifCompress.totalSize", { size: formatBytes(totalBytes) }) }}</span></footer>
      </section>

      <section class="gif-card gif-card--preview" aria-labelledby="gif-preview-title">
        <div class="gif-card-head gif-card-head--preview"><div><h3 id="gif-preview-title" class="gif-card-head__title">{{ t("pages.gifCompress.previewTitle") }}</h3><p class="gif-card-head__sub">{{ t("pages.gifCompress.previewDisclaimer") }}</p></div></div>
        <div class="gif-preview-grid">
          <div class="gif-preview-pane">
            <div class="gif-preview-pane__label">{{ selectedItem ? t("pages.gifCompress.originalWithSize", { size: formatBytes(selectedItem.bytes) }) : t("pages.gifCompress.originalPreview") }}</div>
            <div class="gif-preview-box" :class="{ 'gif-preview-box--empty': !selectedItem }"><img v-if="selectedItem && originalPreviewSrc" class="gif-preview-img" :src="originalPreviewSrc" alt="" /></div>
          </div>
          <div class="gif-preview-pane">
            <div class="gif-preview-pane__label gif-preview-pane__label--right"><template v-if="selectedItem && estimatedCompressedBytes != null">{{ t("pages.gifCompress.compressedEstimate", { size: formatBytes(estimatedCompressedBytes) }) }}<span v-if="savingsPct != null" class="gif-badge">↓ {{ Math.max(0, savingsPct) }}%</span></template><template v-else>{{ t("pages.gifCompress.compressedPreview") }}</template></div>
            <div class="gif-preview-box" :class="{ 'gif-preview-box--empty': !selectedItem }"><img v-if="compressedPreviewSrc" class="gif-preview-img" :src="compressedPreviewSrc" alt="" /><img v-else-if="selectedItem && originalPreviewSrc" class="gif-preview-img" :src="originalPreviewSrc" alt="" /></div>
          </div>
          <div v-if="!selectedItem" class="gif-preview-empty"><img class="gif-preview-empty__image" :src="gifPreviewImageUrl" alt="" /><p class="gif-preview-empty__title">{{ t("pages.gifCompress.emptyPreviewTitle") }}</p><p class="gif-preview-empty__sub">{{ t("pages.gifCompress.emptyPreviewDesc") }}</p></div>
        </div>
        <div class="gif-size-card">
          <template v-if="selectedItem && estimatedCompressedBytes != null"><div class="gif-size-card__main"><strong>{{ formatBytes(selectedItem.bytes) }}</strong><span>→</span><strong class="gif-size-card__compressed">{{ formatBytes(estimatedCompressedBytes) }}</strong></div><p class="gif-savings">{{ t("pages.gifCompress.savings", { size: formatBytes(Math.max(0, selectedItem.bytes - estimatedCompressedBytes)), pct: Math.max(0, savingsPct ?? 0) }) }}</p></template>
          <template v-else><div class="gif-size-card__main gif-size-card__main--empty"><span>--</span><span>→</span><span>--</span></div><p class="gif-size-card__empty-row"><span>{{ t("pages.gifCompress.originalSizeShort") }}</span><span>{{ t("pages.gifCompress.compressedSizeShort") }}</span></p><p class="muted">{{ t("pages.gifCompress.savingsEmpty") }}</p></template>
        </div>
        <p class="gif-note"><Info :size="15" />{{ selectedItem ? t("pages.gifCompress.estimateDisclaimer") : t("pages.gifCompress.estimateNote") }}</p>
      </section>

      <section class="gif-card gif-card--settings" aria-labelledby="gif-settings-title">
        <div class="gif-card-head gif-card-head--row"><h3 id="gif-settings-title" class="gif-card-head__title">{{ t("pages.gifCompress.settingsTitle") }}</h3><button type="button" class="gif-btn gif-btn--light gif-btn--small" @click="restoreDefaults">{{ t("pages.gifCompress.restoreDefaults") }}</button></div>
        <div class="gif-settings-scroll">
          <div class="gif-accordion">
            <button type="button" class="gif-accordion__head" @click="basicOpen = !basicOpen"><span>{{ t("pages.gifCompress.basicSettings") }}</span><ChevronUp v-if="basicOpen" :size="17" /><ChevronDown v-else :size="17" /></button>
            <div v-show="basicOpen" class="gif-accordion__body">
              <div class="gif-field"><span class="gif-field__label">{{ t("pages.gifCompress.mode") }}</span><div class="gif-seg gif-seg--three"><button type="button" :class="{ on: mode === 'LIGHT' }" @click="applyModePreset('LIGHT')">{{ t("pages.gifCompress.modeLight") }}</button><button type="button" :class="{ on: mode === 'RECOMMENDED' }" @click="applyModePreset('RECOMMENDED')">{{ t("pages.gifCompress.modeRecommended") }}</button><button type="button" :class="{ on: mode === 'EXTREME' }" @click="applyModePreset('EXTREME')">{{ t("pages.gifCompress.modeExtreme") }}</button></div></div>
              <div class="gif-field"><span class="gif-field__label">{{ t("pages.gifCompress.resize") }}</span><div class="gif-seg gif-seg--four"><button type="button" :class="{ on: resize === 'KEEP' }" @click="resize = 'KEEP'">{{ t("pages.gifCompress.resizeKeep") }}</button><button type="button" :class="{ on: resize === 'P80' }" @click="resize = 'P80'">80%</button><button type="button" :class="{ on: resize === 'P60' }" @click="resize = 'P60'">60%</button><button type="button" :class="{ on: resize === 'P50' }" @click="resize = 'P50'">50%</button></div></div>
              <div class="gif-field"><span class="gif-field__label">{{ t("pages.gifCompress.fps") }}</span><div class="gif-seg gif-seg--three"><button type="button" :class="{ on: fps === 'FPS_15' }" @click="fps = 'FPS_15'">15fps</button><button type="button" :class="{ on: fps === 'FPS_12' }" @click="fps = 'FPS_12'">12fps</button><button type="button" :class="{ on: fps === 'FPS_10' }" @click="fps = 'FPS_10'">10fps</button></div></div>
              <div class="gif-field"><span class="gif-field__label">{{ t("pages.gifCompress.colors") }}</span><div class="gif-seg gif-seg--four"><button type="button" :class="{ on: colors === 'C256' }" @click="colors = 'C256'">256</button><button type="button" :class="{ on: colors === 'C128' }" @click="colors = 'C128'">128</button><button type="button" :class="{ on: colors === 'C64' }" @click="colors = 'C64'">64</button><button type="button" :class="{ on: colors === 'C32' }" @click="colors = 'C32'">32</button></div></div>
            </div>
          </div>
          <div class="gif-accordion">
            <button type="button" class="gif-accordion__head" @click="advancedOpen = !advancedOpen"><span>{{ t("pages.gifCompress.advancedSettings") }}</span><ChevronUp v-if="advancedOpen" :size="17" /><ChevronDown v-else :size="17" /></button>
            <div v-show="advancedOpen" class="gif-accordion__body gif-accordion__body--advanced">
              <label class="gif-switch-row"><span>{{ t("pages.gifCompress.removeDup") }}</span><input v-model="removeDuplicateFrames" type="checkbox" /><i aria-hidden="true" /></label>
              <div class="gif-select-row"><span>{{ t("pages.gifCompress.dither") }}</span><select v-model="dither"><option value="OFF">{{ t("pages.gifCompress.ditherOff") }}</option><option value="LOW">{{ t("pages.gifCompress.ditherLow") }}</option><option value="MEDIUM">{{ t("pages.gifCompress.ditherMedium") }}</option><option value="HIGH">{{ t("pages.gifCompress.ditherHigh") }}</option></select></div>
              <div class="gif-select-row"><span>{{ t("pages.gifCompress.loop") }}</span><select v-model="loopPolicy"><option value="PRESERVE_SOURCE">{{ t("pages.gifCompress.loopPreserve") }}</option><option value="FORCE_LOOP">{{ t("pages.gifCompress.loopForce") }}</option><option value="NO_LOOP">{{ t("pages.gifCompress.loopNone") }}</option></select></div>
              <div class="gif-stepper-row"><span>{{ t("pages.gifCompress.concurrency") }}</span><div class="gif-stepper"><button type="button" @click="concurrencyChoice = '1'"><Minus :size="15" /></button><strong>{{ concurrencyChoice === "auto" ? 3 : concurrencyChoice }}</strong><button type="button" @click="concurrencyChoice = '4'"><Plus :size="15" /></button></div></div>
              <div class="gif-select-row"><span>{{ t("pages.gifCompress.filenameRule") }}</span><select v-model="filenameRule"><option value="COMPRESSED_EN">{{ t("pages.gifCompress.filenameEn") }}</option><option value="COMPRESSED_ZH">{{ t("pages.gifCompress.filenameZh") }}</option></select></div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <footer class="gif-bottom">
      <div class="gif-bottom__progress"><div class="gif-ring" :style="{ '--p': progress?.percent ?? 0 }"><span>{{ progress?.percent ?? 0 }}%</span></div><div class="gif-bottom__summary"><div class="gif-bottom__title">{{ t("pages.gifCompress.bottomOverall") }}</div><div v-if="!isRunning && (!progress || progress.total === 0)" class="muted">{{ t("pages.gifCompress.bottomNoTask") }}</div><div v-else-if="progress" class="muted">{{ t("pages.gifCompress.bottomProcessing", { cur: displayProcessingIndex, total: progress.total }) }}</div><div class="muted">{{ t("pages.gifCompress.totalFiles", { n: items.length }) }}</div></div></div>
      <div class="gif-bottom__current"><template v-if="selectedItem && isRunning"><img class="gif-bottom__thumb" :src="isTauri() ? convertFileSrc(selectedItem.path) : gifListImageUrl" alt="" /><div class="gif-bottom__file"><strong>{{ selectedItem.name }}</strong><span>{{ t("pages.gifCompress.statusCompressing") }}</span></div></template><div class="gif-bottom__bar-wrap"><div class="gif-bottom__bar" :style="{ width: `${progress?.percent ?? 0}%` }" /></div><span class="gif-bottom__percent">{{ isRunning ? `${progress?.percent ?? 0}%` : "--" }}</span></div>
      <div class="gif-bottom__actions"><button type="button" class="gif-action gif-action--primary" :disabled="!canStart" @click="startCompression"><PlayCircle :size="18" />{{ t("pages.gifCompress.start") }}</button><button type="button" class="gif-action gif-action--secondary" :disabled="!isRunning" @click="cancel"><PauseCircle :size="18" />{{ t("pages.gifCompress.stop") }}</button><button type="button" class="gif-action gif-action--secondary" @click="onOpenOutput"><Folder :size="18" />{{ t("pages.gifCompress.openOutput") }}</button></div>
    </footer>
  </div>
</template>

<style scoped>
.gif-compress-page {
  --bottom-height: 108px;
  --surface-muted: #f5f6fa;
  --surface: #ffffff;
  --border: #eef0f4;
  --border-weak: #e7e9ee;
  --text: #1f2937;
  --text-secondary: #4b5563;
  --text-muted: #6b7280;
  --text-hint: #9ca3af;
  --primary: #6366f1;
  --accent-link: #f97316;
  --accent-link-hover: #ea580c;
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: calc(100vh - 96px);
  min-height: 640px;
  width: 100%;
  min-width: 0;
  padding: 18px 12px 12px;
  color: var(--text-secondary);
  letter-spacing: 0;
  background: var(--surface-muted);
  overflow: auto;
  scrollbar-gutter: stable;
}

.gif-workspace {
  display: grid;
  grid-template-columns: minmax(240px, 0.92fr) minmax(320px, 1.34fr) minmax(240px, 0.88fr);
  gap: 12px;
  min-height: 0;
  height: calc(100% - var(--bottom-height) - 14px);
}

.gif-compress-page,
.gif-file-list,
.gif-settings-scroll {
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}

.gif-compress-page::-webkit-scrollbar,
.gif-file-list::-webkit-scrollbar,
.gif-settings-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.gif-compress-page::-webkit-scrollbar-track,
.gif-file-list::-webkit-scrollbar-track,
.gif-settings-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.gif-compress-page::-webkit-scrollbar-thumb,
.gif-file-list::-webkit-scrollbar-thumb,
.gif-settings-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #dbe4f3, #b9c7dd);
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}

.gif-compress-page::-webkit-scrollbar-thumb:hover,
.gif-file-list::-webkit-scrollbar-thumb:hover,
.gif-settings-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #c8d6eb, #9fb2cf);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.gif-card {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  overflow: hidden;
}

.gif-card--list {
  padding: 0;
  background: var(--surface);
}
.gif-card--preview { padding: clamp(16px, 1.8vh, 24px) 18px 16px; }
.gif-card--settings { padding: clamp(14px, 1.4vh, 20px) 22px 18px; }

.gif-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  margin-bottom: clamp(12px, 1.5vh, 18px);
  min-width: 0;
}

.gif-card-head--preview {
  align-items: flex-start;
  margin-bottom: clamp(14px, 2vh, 26px);
}

.gif-card-head__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.gif-card-head__sub {
  margin: 7px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.gif-card-head__actions,
.gif-bottom__progress,
.gif-bottom__current,
.gif-bottom__actions,
.gif-bottom__file {
  display: flex;
  align-items: center;
}

.gif-card-head__actions { gap: 14px; }

.gif-card--list .gif-card-head {
  align-items: center;
  margin: 0 0 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.gif-card--list .gif-card-head__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gif-card--list .gif-card-head__actions {
  flex-shrink: 0;
  gap: 8px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.gif-card--list .gif-drop,
.gif-card--list .gif-file-list,
.gif-card--list .gif-hint,
.gif-card--list .gif-list-foot {
  margin-left: 12px;
  margin-right: 12px;
}

.gif-card--list .gif-drop--empty {
  margin: 12px;
  border-style: dashed;
  border-color: #e0e3ea;
  border-radius: 14px;
  background: #f5f6fa;
}

.gif-card--list .gif-drop--compact {
  margin: 12px 12px 0;
}

.gif-card--list .gif-file-list {
  margin-top: 0;
  padding-bottom: 4px;
}

.gif-card--list .gif-list-foot {
  margin-bottom: 12px;
}

.gif-btn,
.gif-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 6px;
  border: 1px solid #d9e1ee;
  background: #fff;
  color: #1b2748;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.gif-btn {
  height: 34px;
  padding: 0 14px;
  font-size: 13px;
}

.gif-btn--small {
  height: 32px;
  padding: 0 13px;
}

.gif-btn--list-action {
  height: auto;
  min-height: 28px;
  padding: 6px 12px;
  gap: 5px;
  border-radius: 999px;
  border: 1px solid var(--border-weak);
  background: #fff;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.gif-btn--list-action:hover:not(:disabled) {
  border-color: #dbeafe;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.06);
}

.gif-btn--list-action:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

.gif-btn--light {
  border-color: var(--border-weak);
  background: #fff;
  color: var(--text-secondary);
  font-weight: 500;
}

.gif-btn--light:hover:not(:disabled) {
  border-color: #dbeafe;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.06);
}

.gif-btn:disabled,
.gif-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.gif-drop {
  border: 1px dashed #d6d9e0;
  border-radius: 12px;
  background: #fafbfd;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.gif-drop:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.gif-drop:hover:not(.gif-drop--active) {
  border-color: #c7d2fe;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
}

.gif-drop--active {
  border-color: #c7d2fe;
  background: #f5f6fa;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.gif-drop--empty {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(18px, 3vh, 34px) 20px;
  text-align: center;
}

.gif-drop--compact {
  flex: 0 0 clamp(104px, 15vh, 130px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  text-align: center;
}

.gif-drop__image {
  width: min(178px, 62%);
  margin-bottom: clamp(18px, 3vh, 34px);
  filter: drop-shadow(0 14px 22px rgba(79, 118, 214, 0.1));
  opacity: 0.96;
}

.gif-drop__mini-icon {
  color: var(--text-muted);
  margin-bottom: 8px;
}

.gif-drop__title,
.gif-drop__compact-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.gif-drop__compact-title {
  font-size: 14px;
}

.gif-drop__title span,
.gif-drop__compact-title span {
  color: var(--accent-link);
  cursor: pointer;
}

.gif-drop__title span:hover,
.gif-drop__compact-title span:hover {
  color: var(--accent-link-hover);
}

.gif-drop__sub {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.gif-drop__rules {
  margin-top: clamp(22px, 5vh, 52px);
  color: var(--text-hint);
  font-size: 13px;
  line-height: 1.8;
}

.gif-drop__rules p { margin: 0; }

.gif-file-list {
  list-style: none;
  margin: 0;
  padding: 0 2px 0 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
  min-height: 0;
}

.gif-file {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto 26px;
  align-items: center;
  gap: 16px;
  min-height: 86px;
  padding: 8px 10px 8px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
}

.gif-file--selected {
  border-color: #2d6cff;
  background: #f7fbff;
  box-shadow: 0 0 0 1px rgba(45, 108, 255, 0.12);
}

.gif-file__thumb-wrap {
  position: relative;
  width: 96px;
  height: 72px;
  overflow: hidden;
  border-radius: 6px;
  background: #e9eef8;
}

.gif-file__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gif-file__play {
  position: absolute;
  inset: 0;
  margin: auto;
  color: #fff;
  fill: rgba(16, 24, 48, 0.45);
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.25));
}

.gif-file__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.gif-file__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.gif-file__size {
  font-size: 13px;
  color: var(--text-muted);
}

.gif-file__status {
  justify-self: end;
  padding: 6px 10px;
  border-radius: 6px;
  background: #dcf7e8;
  color: #17a650;
  font-size: 13px;
  font-weight: 800;
}

.gif-file__status[data-st="failed"] { background: #fee2e2; color: #e04444; }
.gif-file__status[data-st="processing"],
.gif-file__status[data-st="saving"] { background: #eaf2ff; color: #1664e8; }

.gif-file__remove {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.gif-file__remove:hover:not(:disabled) {
  background: #fef2f2;
  color: #dc2626;
}

.gif-file__remove:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

.gif-list-foot {
  display: flex;
  justify-content: space-between;
  flex: 0 0 auto;
  margin-top: auto;
  padding-top: 15px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-muted);
}

.gif-hint {
  margin: 10px 0 0;
  color: #ef4444;
  font-size: 12px;
  line-height: 1.5;
}

.gif-preview-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
}

.gif-preview-pane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.gif-preview-pane__label {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  min-height: 26px;
  margin: 0 0 10px;
  padding-left: 8px;
  font-size: 15px;
  font-weight: 800;
  color: #263556;
}

.gif-preview-pane__label--right {
  flex-wrap: wrap;
  justify-content: space-between;
}

.gif-badge {
  padding: 5px 10px;
  border-radius: 6px;
  background: #dcf7e8;
  color: #12a653;
  font-size: 14px;
  font-weight: 900;
}

.gif-preview-box {
  flex: 1 1 auto;
  min-height: 260px;
  border: 1px solid #e4eaf4;
  border-radius: 7px;
  background: #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}


.gif-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gif-preview-empty {
  position: absolute;
  inset: 28% 42px auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  pointer-events: none;
}

.gif-preview-empty__image {
  width: min(218px, 52%);
  margin-bottom: clamp(12px, 2vh, 20px);
  filter: drop-shadow(0 14px 22px rgba(79, 118, 214, 0.1));
  opacity: 0.96;
}

.gif-preview-empty__title {
  margin: 0;
  color: #111936;
  font-size: 14px;
  font-weight: 800;
}

.gif-preview-empty__sub {
  margin: 10px 0 0;
  color: #657493;
  font-size: 13px;
}

.gif-size-card {
  flex: 0 0 auto;
  margin-top: 12px;
  padding: clamp(14px, 1.8vh, 20px) 26px 14px;
  border: 1px solid #e4eaf4;
  border-radius: 7px;
  background: #fff;
  text-align: center;
}

.gif-size-card__main {
  display: grid;
  grid-template-columns: 1fr 48px 1fr;
  align-items: center;
  color: #15224b;
  font-size: clamp(18px, 2.4vh, 24px);
  font-weight: 900;
}

.gif-size-card__main--empty {
  font-size: 18px;
  font-weight: 800;
}

.gif-size-card__compressed,
.gif-savings { color: #16ad5d; }

.gif-savings {
  margin: 9px 0 0;
  font-size: 16px;
  font-weight: 800;
}

.gif-size-card__empty-row {
  display: flex;
  justify-content: center;
  gap: 150px;
  margin: 7px 0 12px;
  color: #71809e;
  font-size: 13px;
}

.gif-note {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  margin: 14px 0 0;
  color: #8090ad;
  font-size: 13px;
}

.gif-settings-scroll {
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
  border-top: 1px solid #e7edf6;
}

.gif-accordion {
  border-bottom: 1px solid #e7edf6;
  padding: 0 0 14px;
}

.gif-accordion + .gif-accordion { padding-top: 12px; }

.gif-accordion__head {
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  background: transparent;
  color: #121a37;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  padding: 0;
}

.gif-accordion__body { padding-top: 8px; }
.gif-field { margin-bottom: 19px; }

.gif-field__label {
  display: block;
  margin-bottom: 9px;
  color: #1c294a;
  font-size: 13px;
  font-weight: 800;
}

.gif-seg {
  display: grid;
  gap: 8px;
}

.gif-seg--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.gif-seg--four { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.gif-seg button {
  height: 35px;
  border: 1px solid #d9e1ee;
  border-radius: 6px;
  background: #fff;
  color: #273654;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.gif-seg button.on {
  border-color: #1764ff;
  color: #075df5;
  background: #f7fbff;
  box-shadow: inset 0 0 0 1px rgba(23, 100, 255, 0.22);
  font-weight: 900;
}

.gif-switch-row,
.gif-select-row,
.gif-stepper-row {
  min-height: 42px;
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  color: #263556;
  font-size: 13px;
  font-weight: 600;
}

.gif-switch-row { position: relative; }
.gif-switch-row input { position: absolute; opacity: 0; }

.gif-switch-row i {
  justify-self: end;
  position: relative;
  width: 34px;
  height: 18px;
  border-radius: 999px;
  background: #d6ddea;
}

.gif-switch-row i::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #fff;
  transition: transform 0.16s;
  box-shadow: 0 1px 3px rgba(18, 26, 55, 0.25);
}

.gif-switch-row input:checked + i { background: #1764ff; }
.gif-switch-row input:checked + i::after { transform: translateX(16px); }

.gif-select-row select {
  width: 100%;
  height: 38px;
  border: 1px solid #d9e1ee;
  border-radius: 6px;
  background: #fff;
  padding: 0 12px;
  color: #263556;
  font-size: 13px;
}

.gif-stepper {
  justify-self: end;
  display: grid;
  grid-template-columns: 34px 42px 34px;
  height: 32px;
  border: 1px solid #d9e1ee;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.gif-stepper button {
  border: 0;
  background: #fff;
  color: #71809e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.gif-stepper strong {
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid #e7edf6;
  border-right: 1px solid #e7edf6;
  color: #1c294a;
}

.gif-bottom {
  flex: 0 0 var(--bottom-height);
  display: grid;
  grid-template-columns: minmax(210px, 250px) minmax(220px, 1fr) minmax(390px, auto);
  gap: 18px;
  align-items: center;
  padding: 12px 26px;
  border: 1px solid #dfe6f2;
  border-radius: 10px;
  background: #fff;
}

.gif-bottom__progress { gap: 16px; }

.gif-ring {
  width: 68px;
  height: 68px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #121a37;
  font-size: 16px;
  font-weight: 900;
  background: conic-gradient(#8fb4ff calc(var(--p) * 1%), #e9edf4 0);
  position: relative;
}

.gif-ring::after {
  content: "";
  position: absolute;
  inset: 6px;
  border-radius: inherit;
  background: #fff;
}

.gif-ring span {
  position: relative;
  z-index: 1;
}

.gif-bottom__title {
  color: #121a37;
  font-size: 14px;
  font-weight: 900;
  margin-bottom: 6px;
}

.muted {
  color: #71809e;
  font-size: 13px;
  line-height: 1.55;
}

.gif-bottom__current {
  gap: 16px;
  min-width: 0;
  border-left: 1px solid #e7edf6;
  padding-left: 22px;
}

.gif-bottom__thumb {
  width: 62px;
  height: 62px;
  object-fit: cover;
  border-radius: 6px;
}

.gif-bottom__file {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 88px;
}

.gif-bottom__file strong {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  color: #121a37;
}

.gif-bottom__file span {
  color: #71809e;
  font-size: 13px;
}

.gif-bottom__bar-wrap {
  flex: 1;
  min-width: 160px;
  height: 9px;
  border-radius: 999px;
  background: #e9edf4;
  overflow: hidden;
}

.gif-bottom__bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1764ff, #2d73ff);
  transition: width 0.2s ease;
}

.gif-bottom__percent {
  min-width: 42px;
  color: #657493;
  font-size: 13px;
}

.gif-bottom__actions {
  justify-content: flex-end;
  gap: 12px;
}

.gif-action {
  min-width: 128px;
  height: 48px;
  padding: 0 22px;
  font-size: 15px;
}

.gif-action--primary {
  border-color: #1764ff;
  background: linear-gradient(180deg, #1d68ff 0%, #075df5 100%);
  color: #fff;
  box-shadow: 0 8px 18px rgba(23, 100, 255, 0.18);
}

.gif-action--secondary { background: #fff; }
.gif-action--secondary:disabled { background: #eef2f7; }
</style>
