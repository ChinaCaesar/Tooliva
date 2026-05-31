import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useRouter } from "vue-router";
import { useSettingsStore } from "@/stores/settings.store";
import { useTaskStore } from "@/stores/task.store";
import {
  tauriClient,
  type StartVideoToGifResult,
  type VideoGifQualityPreset,
  type VideoGifSizePreset,
  type VideoToGifOptionsPayload
} from "@/bridge/tauriClient";
import {
  checkExportEntitlement,
  consumeExportEntitlement,
  promptEntitlementUpgrade
} from "@/modules/entitlement/exportEntitlementGuard";
import { useTaskBatchNotification } from "@/pages/shared/useTaskBatchNotification";

type VideoGifStatus = "idle" | "running" | "completed" | "failed";

const SUPPORTED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mkv", ".mov", ".avi", ".m4v", ".wmv"];

export interface VideoClip {
  id: string;
  startSec: number;
  endSec: number;
  fps: number;
  width: number;
  height: number;
  status: VideoGifStatus;
  progress: number;
  outputPath?: string;
  error?: string;
}

export interface VideoGifResultSummary {
  total: number;
  success: number;
  failed: number;
  elapsedMs: number;
}

function extractFileName(path: string): string {
  const chunks = path.split(/[/\\]/);
  const fileName = chunks.pop();
  return fileName || path;
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${mins}m ${remain}s`;
}

function parentDir(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf("\\"), filePath.lastIndexOf("/"));
  return idx <= 0 ? "" : filePath.slice(0, idx);
}

function joinPath(parent: string, child: string): string {
  const base = parent.replace(/[/\\]+$/, "");
  const segment = child.replace(/^[/\\]+/, "");
  const sep = base.includes("\\") ? "\\" : "/";
  return `${base}${sep}${segment}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatTimeCode(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMs = Math.round(safe * 1000);
  const mm = Math.floor(totalMs / 60000);
  const ss = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return `${pad2(mm)}:${pad2(ss)}.${Math.floor(ms / 100)}`;
}

function formatTimeAxis(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const total = Math.round(safe);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useVideoToGifActions() {
  const { t } = useI18n();
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const taskStore = useTaskStore();
  const { notifyTaskBatchCompleted } = useTaskBatchNotification();

  const currentVideoPath = ref("");
  const currentVideoName = ref("");
  const currentVideoUrl = ref("");
  const videoDurationSec = ref(0);
  const videoNaturalWidth = ref(0);
  const videoNaturalHeight = ref(0);
  const isVideoLoading = ref(false);

  const selectionStartSec = ref(0);
  const selectionEndSec = ref(0);
  const previewCurrentSec = ref(0);
  const isPlaying = ref(false);
  const isDropActive = ref(false);
  const hintMessage = ref("");

  const clips = ref<VideoClip[]>([]);
  const isProcessing = ref(false);
  const outputDirectory = ref("");
  const resultSummary = ref<VideoGifResultSummary | null>(null);

  const sizePreset = ref<VideoGifSizePreset>("p720");
  const customWidth = ref<number>(720);
  const customHeight = ref<number>(405);
  const keepAspect = ref(true);

  const fpsOptions = [8, 12, 15, 20];
  const fpsValue = ref<number>(15);

  const qualityScore = ref<number>(80);
  const playbackSpeed = ref<0.5 | 1 | 2>(1);
  const loopPlayback = ref(true);

  const reduceSize = ref(true);
  const settingsExpanded = ref(true);

  let disposeDropListener: UnlistenFn | null = null;
  let disposeGifProgressListener: UnlistenFn | null = null;

  const effectiveFps = computed(() => clamp(Math.round(fpsValue.value || 0), 1, 60) || 15);

  const qualityPreset = computed<VideoGifQualityPreset>(() => {
    if (qualityScore.value < 34) return "low";
    if (qualityScore.value < 67) return "medium";
    return "high";
  });

  const hasVideo = computed(() => currentVideoPath.value.length > 0);

  const effectiveOutputDirectory = computed(() => {
    const custom = outputDirectory.value.trim();
    if (custom) return custom;
    const videoPath = currentVideoPath.value.trim();
    if (videoPath) {
      const dir = parentDir(videoPath);
      if (dir) return joinPath(dir, "gif");
    }
    const completed = clips.value.find((c) => c.status === "completed" && c.outputPath);
    if (completed?.outputPath) {
      return parentDir(completed.outputPath);
    }
    return "";
  });

  const canOpenOutputDirectory = computed(() => effectiveOutputDirectory.value.length > 0);

  const selectionDurationSec = computed(() =>
    Math.max(0, selectionEndSec.value - selectionStartSec.value)
  );

  const previewAspect = computed(() => {
    if (videoNaturalWidth.value > 0 && videoNaturalHeight.value > 0) {
      return videoNaturalWidth.value / videoNaturalHeight.value;
    }
    return 16 / 9;
  });

  const targetWidth = computed(() => {
    if (sizePreset.value === "original" && videoNaturalWidth.value > 0) {
      return Math.max(2, Math.floor(videoNaturalWidth.value / 2) * 2);
    }
    if (sizePreset.value === "p720") return 720;
    if (sizePreset.value === "p480") return 480;
    return Math.max(2, Math.floor((customWidth.value || 720) / 2) * 2);
  });

  const targetHeight = computed(() => {
    if (sizePreset.value === "original" && videoNaturalHeight.value > 0) {
      return Math.max(2, Math.floor(videoNaturalHeight.value / 2) * 2);
    }
    if (sizePreset.value === "p720") {
      return Math.max(2, Math.floor((720 / previewAspect.value) / 2) * 2);
    }
    if (sizePreset.value === "p480") {
      return Math.max(2, Math.floor((480 / previewAspect.value) / 2) * 2);
    }
    return Math.max(2, Math.floor((customHeight.value || 405) / 2) * 2);
  });

  watch([sizePreset, videoNaturalWidth, videoNaturalHeight], () => {
    if (sizePreset.value !== "custom") {
      customWidth.value = targetWidth.value;
      customHeight.value = targetHeight.value;
    }
  });

  watch(customWidth, (next, prev) => {
    if (sizePreset.value !== "custom" || !keepAspect.value) return;
    if (next === prev || !previewAspect.value) return;
    const proposed = Math.max(2, Math.floor((next / previewAspect.value) / 2) * 2);
    if (proposed !== customHeight.value) customHeight.value = proposed;
  });

  watch(customHeight, (next, prev) => {
    if (sizePreset.value !== "custom" || !keepAspect.value) return;
    if (next === prev || !previewAspect.value) return;
    const proposed = Math.max(2, Math.floor((next * previewAspect.value) / 2) * 2);
    if (proposed !== customWidth.value) customWidth.value = proposed;
  });

  const estimatedFramesTotal = computed(() =>
    clips.value.reduce((sum, clip) => {
      const dur = Math.max(0, clip.endSec - clip.startSec);
      return sum + Math.round(dur * clip.fps);
    }, 0)
  );

  const estimatedOutputDurationSec = computed(() =>
    clips.value.reduce(
      (sum, clip) => sum + Math.max(0, clip.endSec - clip.startSec) / playbackSpeed.value,
      0
    )
  );

  const estimatedSizeBytes = computed(() => {
    let sum = 0;
    for (const clip of clips.value) {
      const dur = Math.max(0, clip.endSec - clip.startSec);
      const frames = Math.round(dur * clip.fps);
      const bytesPerPixel = reduceSize.value ? 0.28 : 0.42;
      sum += clip.width * clip.height * frames * bytesPerPixel;
    }
    return Math.round(sum);
  });

  const estimateSize = computed(() => (clips.value.length === 0 ? "--" : formatSize(estimatedSizeBytes.value)));
  const estimateFrames = computed(() =>
    estimatedFramesTotal.value > 0 ? estimatedFramesTotal.value.toLocaleString() : "--"
  );
  const estimateDuration = computed(() =>
    estimatedOutputDurationSec.value > 0 ? `${estimatedOutputDurationSec.value.toFixed(1)} ${t("pages.videoToGif.preview.durationUnit")}` : "--"
  );
  const estimateResolution = computed(() =>
    clips.value.length > 0
      ? t("pages.videoToGif.clips.sizeUnit", { w: clips.value[0].width, h: clips.value[0].height })
      : t("pages.videoToGif.clips.sizeUnit", { w: targetWidth.value, h: targetHeight.value })
  );

  const canStart = computed(
    () => !isProcessing.value && hasVideo.value && clips.value.some((c) => c.status === "idle" || c.status === "failed")
  );

  function setCurrentVideo(path: string): void {
    if (!path) return;
    resultSummary.value = null;
    clips.value = [];
    currentVideoPath.value = path;
    currentVideoName.value = extractFileName(path);
    currentVideoUrl.value = isTauri() ? convertFileSrc(path) : "";
    videoDurationSec.value = 0;
    videoNaturalWidth.value = 0;
    videoNaturalHeight.value = 0;
    selectionStartSec.value = 0;
    selectionEndSec.value = 0;
    previewCurrentSec.value = 0;
    isVideoLoading.value = true;
    hintMessage.value = "";
  }

  function onVideoMetadataReady(payload: {
    durationSec: number;
    width: number;
    height: number;
  }): void {
    videoDurationSec.value = Math.max(0, payload.durationSec || 0);
    videoNaturalWidth.value = payload.width || 0;
    videoNaturalHeight.value = payload.height || 0;
    isVideoLoading.value = false;
    const defaultEnd = Math.min(videoDurationSec.value, Math.max(0.5, videoDurationSec.value));
    selectionStartSec.value = 0;
    selectionEndSec.value = defaultEnd;
    if (sizePreset.value !== "custom") {
      customWidth.value = targetWidth.value;
      customHeight.value = targetHeight.value;
    }
  }

  async function pickVideo(): Promise<void> {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Video", extensions: ["mp4", "webm", "mkv", "mov", "avi", "m4v", "wmv"] }]
      });
      if (!selected || Array.isArray(selected)) return;
      acceptVideoPath(selected);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message
        ? t("pages.videoToGif.errors.pickVideosFailed", { message })
        : t("pages.videoToGif.errors.pickVideosDialog");
    }
  }

  function acceptVideoPath(path: string): void {
    const normalized = path.trim();
    if (!normalized) return;
    const lower = normalized.toLowerCase();
    if (!SUPPORTED_VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      hintMessage.value = t("pages.videoToGif.hints.unsupportedFormat");
      return;
    }
    setCurrentVideo(normalized);
  }

  function replaceVideo(): void {
    pickVideo();
  }

  function clearVideo(): void {
    if (isProcessing.value) return;
    hintMessage.value = "";
    currentVideoPath.value = "";
    currentVideoName.value = "";
    currentVideoUrl.value = "";
    videoDurationSec.value = 0;
    videoNaturalWidth.value = 0;
    videoNaturalHeight.value = 0;
    selectionStartSec.value = 0;
    selectionEndSec.value = 0;
    previewCurrentSec.value = 0;
    clips.value = [];
    resultSummary.value = null;
  }

  function updateSelectionStart(sec: number): void {
    const clamped = clamp(sec, 0, Math.max(0, selectionEndSec.value - 0.1));
    selectionStartSec.value = Math.round(clamped * 100) / 100;
  }

  function updateSelectionEnd(sec: number): void {
    const clamped = clamp(sec, selectionStartSec.value + 0.1, videoDurationSec.value || sec);
    selectionEndSec.value = Math.round(clamped * 100) / 100;
  }

  function onPreviewTimeUpdate(sec: number): void {
    previewCurrentSec.value = sec;
  }

  function addCurrentClip(): void {
    if (!hasVideo.value) return;
    if (selectionDurationSec.value < 0.1) {
      hintMessage.value = t("pages.videoToGif.hints.rangeInvalid");
      return;
    }
    const w = targetWidth.value;
    const h = targetHeight.value;
    const newClip: VideoClip = {
      id: crypto.randomUUID(),
      startSec: selectionStartSec.value,
      endSec: selectionEndSec.value,
      fps: effectiveFps.value,
      width: w,
      height: h,
      status: "idle",
      progress: 0
    };
    const duplicate = clips.value.some(
      (c) =>
        Math.abs(c.startSec - newClip.startSec) < 0.05 &&
        Math.abs(c.endSec - newClip.endSec) < 0.05 &&
        c.fps === newClip.fps
    );
    if (duplicate) {
      hintMessage.value = t("pages.videoToGif.hints.duplicateClip");
      return;
    }
    clips.value = [...clips.value, newClip];
    hintMessage.value = "";
  }

  function removeClip(clipId: string): void {
    if (isProcessing.value) return;
    clips.value = clips.value.filter((c) => c.id !== clipId);
  }

  function setFpsPreset(value: number): void {
    fpsValue.value = value;
  }

  function buildOptionsPayload(clip: VideoClip): VideoToGifOptionsPayload {
    return {
      startTimeSec: clip.startSec,
      endTimeSec: clip.endSec,
      sizePreset: sizePreset.value,
      customWidth: sizePreset.value === "custom" || sizePreset.value === "original" ? clip.width : undefined,
      customHeight: sizePreset.value === "custom" || sizePreset.value === "original" ? clip.height : undefined,
      fps: clip.fps,
      quality: qualityPreset.value,
      loopPlayback: loopPlayback.value,
      maxFrames: undefined,
      playbackSpeed: playbackSpeed.value,
      paletteStatsMode: undefined,
      paletteMaxColors: reduceSize.value ? 128 : undefined,
      dither: reduceSize.value ? "none" : undefined,
      bayerScale: undefined,
      crop: undefined,
      outputSizeLimitBytes: undefined
    };
  }

  function applyResult(clipId: string, result: StartVideoToGifResult): void {
    clips.value = clips.value.map((c) => {
      if (c.id !== clipId) return c;
      if (result.success) {
        return { ...c, status: "completed", progress: 100, outputPath: result.outputPath, error: undefined };
      }
      return { ...c, status: "failed", progress: 100, error: result.error || t("pages.videoToGif.errors.genericFailed") };
    });
  }

  function updateClipProgress(clipId: string, patch: Partial<VideoClip>): void {
    clips.value = clips.value.map((c) => (c.id === clipId ? { ...c, ...patch } : c));
  }

  async function processSingleClip(clip: VideoClip): Promise<{ success: number; failed: number }> {
    const task = taskStore.createTask("video-to-gif", "video-to-gif");
    updateClipProgress(clip.id, { status: "running", progress: 0, error: undefined });
    taskStore.updateTaskProgress(task.id, 1, t("pages.videoToGif.taskRunning"));
    try {
      const consume = await consumeExportEntitlement({
        tool: "video-to-gif",
        amount: 1,
        sourceId: clip.id,
        idempotencyKey: `video-to-gif:${clip.id}`
      });
      if (!consume.allowed) {
        const consumeError = t("common.entitlement.noEntitlement");
        updateClipProgress(clip.id, { status: "failed", progress: 100, error: consumeError });
        taskStore.failTask(task.id, consumeError);
        await promptEntitlementUpgrade(router, t, "video-to-gif");
        return { success: 0, failed: 1 };
      }
      const result = await tauriClient.startVideoToGif({
        taskId: clip.id,
        inputPath: currentVideoPath.value,
        outputDirectory: outputDirectory.value.trim() || undefined,
        options: buildOptionsPayload(clip)
      });
      applyResult(clip.id, result);
      if (result.success) {
        taskStore.completeTask(task.id, t("pages.videoToGif.taskDone"));
        try {
          await tauriClient.recordToolUsage({
            toolKey: "video-to-gif",
            fileName: currentVideoName.value
          });
        } catch {
          /* ignore */
        }
        return { success: 1, failed: 0 };
      }
      taskStore.failTask(task.id, result.error || t("pages.videoToGif.errors.genericFailed"));
      return { success: 0, failed: 1 };
    } catch (error) {
      const message = error instanceof Error ? error.message : t("pages.videoToGif.errors.genericFailed");
      updateClipProgress(clip.id, { status: "failed", progress: 100, error: message });
      taskStore.failTask(task.id, message);
      return { success: 0, failed: 1 };
    }
  }

  async function startConversion(): Promise<void> {
    if (isProcessing.value) return;
    if (!hasVideo.value) return;
    const entitlement = await checkExportEntitlement("video-to-gif");
    if (!entitlement.allowed) {
      if (entitlement.reason === "no_entitlement" || entitlement.reason === "service_error") {
        hintMessage.value = t("common.entitlement.noEntitlement");
        await promptEntitlementUpgrade(router, t, "video-to-gif");
      }
      return;
    }
    const pending = clips.value.filter((c) => c.status === "idle" || c.status === "failed");
    if (pending.length === 0) {
      hintMessage.value = t("pages.videoToGif.hints.noClips");
      return;
    }
    isProcessing.value = true;
    resultSummary.value = null;
    hintMessage.value = "";
    try {
      disposeGifProgressListener ??= await tauriClient.onVideoToGifProgress((event) => {
        if (!event.taskId) return;
        const patch: Partial<VideoClip> = {
          progress: Math.max(0, Math.min(100, Math.round(event.progress)))
        };
        if (event.stage === "failed") {
          patch.status = "failed";
          patch.error = event.message || t("pages.videoToGif.errors.genericFailed");
        }
        updateClipProgress(event.taskId, patch);
      });

      const startedAt = performance.now();
      let success = 0;
      let failed = 0;
      for (const clip of pending) {
        const outcome = await processSingleClip(clip);
        success += outcome.success;
        failed += outcome.failed;
      }
      resultSummary.value = {
        total: pending.length,
        success,
        failed,
        elapsedMs: Math.round(performance.now() - startedAt)
      };
      notifyTaskBatchCompleted(
        "pages.videoToGif.title",
        resultSummary.value,
        formatElapsed(resultSummary.value.elapsedMs)
      );
    } finally {
      isProcessing.value = false;
    }
  }

  async function pickOutputDirectory(): Promise<void> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    outputDirectory.value = selected;
  }

  async function openOutputDirectory(): Promise<void> {
    const dir = effectiveOutputDirectory.value;
    if (!dir) {
      hintMessage.value = t("pages.videoToGif.errors.openDirectory");
      return;
    }
    try {
      await tauriClient.openDirectoryInFileManager({ directoryPath: dir });
      hintMessage.value = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message
        ? t("pages.videoToGif.errors.openDirectoryFailed", { message })
        : t("pages.videoToGif.errors.openDirectory");
    }
  }

  async function openClipOutputFolder(clipId: string): Promise<void> {
    const clip = clips.value.find((c) => c.id === clipId);
    if (!clip?.outputPath) {
      hintMessage.value = t("pages.videoToGif.errors.openDirectory");
      return;
    }
    const dir = parentDir(clip.outputPath);
    if (!dir) {
      hintMessage.value = t("pages.videoToGif.errors.openDirectory");
      return;
    }
    try {
      await tauriClient.openDirectoryInFileManager({ directoryPath: dir });
      hintMessage.value = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message
        ? t("pages.videoToGif.errors.openDirectoryFailed", { message })
        : t("pages.videoToGif.errors.openDirectory");
    }
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    isDropActive.value = false;
    const fileList = event.dataTransfer?.files;
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      const path = (file as File & { path?: string }).path;
      if (path) {
        acceptVideoPath(path);
        return;
      }
    }
    hintMessage.value = t("pages.videoToGif.hints.dragNoPath");
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
        const first = event.payload.paths.find((p) => p.trim().length > 0);
        if (first) acceptVideoPath(first);
      }
    });
  }

  function formatClipDuration(clip: VideoClip): string {
    const d = Math.max(0, clip.endSec - clip.startSec);
    return `${d.toFixed(1)} ${t("pages.videoToGif.preview.durationUnit")}`;
  }

  onMounted(async () => {
    outputDirectory.value = settingsStore.defaultOutputDirectory || "";
    await setupNativeDropListener();
  });

  onBeforeUnmount(() => {
    disposeDropListener?.();
    disposeDropListener = null;
    disposeGifProgressListener?.();
    disposeGifProgressListener = null;
  });

  return {
    currentVideoPath,
    currentVideoName,
    currentVideoUrl,
    videoDurationSec,
    videoNaturalWidth,
    videoNaturalHeight,
    isVideoLoading,
    hasVideo,
    selectionStartSec,
    selectionEndSec,
    selectionDurationSec,
    previewCurrentSec,
    isPlaying,
    isDropActive,
    hintMessage,
    clips,
    isProcessing,
    outputDirectory,
    resultSummary,
    canStart,
    sizePreset,
    customWidth,
    customHeight,
    keepAspect,
    targetWidth,
    targetHeight,
    fpsOptions,
    fpsValue,
    effectiveFps,
    qualityScore,
    qualityPreset,
    playbackSpeed,
    loopPlayback,
    reduceSize,
    settingsExpanded,
    estimateSize,
    estimateFrames,
    estimateDuration,
    estimateResolution,
    pickVideo,
    replaceVideo,
    clearVideo,
    setCurrentVideo,
    onVideoMetadataReady,
    updateSelectionStart,
    updateSelectionEnd,
    onPreviewTimeUpdate,
    addCurrentClip,
    removeClip,
    setFpsPreset,
    startConversion,
    pickOutputDirectory,
    effectiveOutputDirectory,
    canOpenOutputDirectory,
    openOutputDirectory,
    openClipOutputFolder,
    handleDrop,
    onDragOver,
    onDragLeave,
    formatClipDuration,
    formatTimeAxis,
    formatTimeCode,
    formatElapsed
  };
}
