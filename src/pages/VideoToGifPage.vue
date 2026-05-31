<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useVideoToGifActions } from "@/pages/video-to-gif/composables/useVideoToGifActions";

const { t } = useI18n();

const {
  currentVideoUrl,
  videoDurationSec,
  hasVideo,
  selectionStartSec,
  selectionEndSec,
  selectionDurationSec,
  previewCurrentSec,
  isDropActive,
  hintMessage,
  clips,
  isProcessing,
  canStart,
  sizePreset,
  customWidth,
  customHeight,
  keepAspect,
  fpsOptions,
  fpsValue,
  effectiveFps,
  qualityScore,
  playbackSpeed,
  loopPlayback,
  reduceSize,
  settingsExpanded,
  estimateSize,
  estimateFrames,
  estimateDuration,
  estimateResolution,
  pickVideo,
  clearVideo,
  onVideoMetadataReady,
  updateSelectionStart,
  updateSelectionEnd,
  onPreviewTimeUpdate,
  addCurrentClip,
  removeClip,
  setFpsPreset,
  startConversion,
  canOpenOutputDirectory,
  openOutputDirectory,
  openClipOutputFolder,
  handleDrop,
  onDragOver,
  onDragLeave,
  formatClipDuration,
  formatTimeAxis,
  formatTimeCode
} = useVideoToGifActions();

const videoRef = ref<HTMLVideoElement | null>(null);
const isPaused = ref(true);

function onLoadedMetadata(): void {
  const v = videoRef.value;
  if (!v) return;
  onVideoMetadataReady({
    durationSec: v.duration || 0,
    width: v.videoWidth,
    height: v.videoHeight
  });
}

function onTimeUpdate(): void {
  const v = videoRef.value;
  if (!v) return;
  onPreviewTimeUpdate(v.currentTime);
  if (v.currentTime >= selectionEndSec.value && !v.paused) {
    v.pause();
  }
}

function togglePlay(): void {
  const v = videoRef.value;
  if (!v) return;
  if (v.paused) {
    if (v.currentTime < selectionStartSec.value || v.currentTime >= selectionEndSec.value) {
      v.currentTime = selectionStartSec.value;
    }
    v.play().catch(() => {});
  } else {
    v.pause();
  }
}

function onPlay(): void {
  isPaused.value = false;
}

function onPause(): void {
  isPaused.value = true;
}

watch(currentVideoUrl, async () => {
  await nextTick();
  isPaused.value = true;
});

const rulerLabels = computed(() => {
  const total = videoDurationSec.value;
  if (total <= 0) return [] as Array<{ left: number; label: string }>;
  const segments = 4;
  return Array.from({ length: segments + 1 }, (_, i) => {
    const ratio = i / segments;
    return { left: ratio * 100, label: formatTimeAxis(total * ratio) };
  });
});

const RULER_TICK_COUNT = 41;
const rulerTicks = computed(() => {
  if (videoDurationSec.value <= 0) return [] as Array<{ left: number; major: boolean }>;
  const segments = RULER_TICK_COUNT - 1;
  return Array.from({ length: RULER_TICK_COUNT }, (_, i) => ({
    left: (i / segments) * 100,
    major: i % 10 === 0
  }));
});

function clampPreviewSec(sec: number): number {
  const max = Math.max(0, videoDurationSec.value);
  if (!Number.isFinite(sec)) return 0;
  return Math.min(max, Math.max(0, sec));
}

const selectionStartPct = computed(() => {
  const total = videoDurationSec.value;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (selectionStartSec.value / total) * 100));
});

const selectionEndPct = computed(() => {
  const total = videoDurationSec.value;
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, (selectionEndSec.value / total) * 100));
});

const playheadPct = computed(() => {
  const total = videoDurationSec.value;
  if (total <= 0) return 0;
  const sec = clampPreviewSec(previewCurrentSec.value);
  return Math.max(0, Math.min(100, (sec / total) * 100));
});

const selectionStyle = computed(() => {
  const a = selectionStartPct.value;
  const b = selectionEndPct.value;
  return { left: `${a}%`, width: `${Math.max(0, b - a)}%` };
});

const trackRef = ref<HTMLElement | null>(null);
type DragMode = "start" | "end" | "playhead";
const dragMode = ref<DragMode | null>(null);

function ratioFromClientX(clientX: number): number {
  const el = trackRef.value;
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  const x = clientX - rect.left;
  return Math.max(0, Math.min(1, x / rect.width));
}

function secondsFromClientX(clientX: number): number {
  return ratioFromClientX(clientX) * videoDurationSec.value;
}

let pointerMoveListener: ((ev: PointerEvent) => void) | null = null;
let pointerUpListener: ((ev: PointerEvent) => void) | null = null;

function detachPointerListeners(): void {
  if (pointerMoveListener) {
    globalThis.removeEventListener("pointermove", pointerMoveListener);
    pointerMoveListener = null;
  }
  if (pointerUpListener) {
    globalThis.removeEventListener("pointerup", pointerUpListener);
    globalThis.removeEventListener("pointercancel", pointerUpListener);
    pointerUpListener = null;
  }
}

function beginDrag(event: PointerEvent, mode: DragMode): void {
  if (isProcessing.value || videoDurationSec.value <= 0) return;
  event.preventDefault();
  event.stopPropagation();
  dragMode.value = mode;
  if (mode === "playhead" || mode === "start" || mode === "end") {
    videoRef.value?.pause();
  }
  applyDrag(event.clientX, mode);

  detachPointerListeners();
  pointerMoveListener = (ev) => {
    if (!dragMode.value) return;
    applyDrag(ev.clientX, dragMode.value);
  };
  pointerUpListener = () => {
    dragMode.value = null;
    detachPointerListeners();
  };
  globalThis.addEventListener("pointermove", pointerMoveListener);
  globalThis.addEventListener("pointerup", pointerUpListener);
  globalThis.addEventListener("pointercancel", pointerUpListener);
}

function applyDrag(clientX: number, mode: DragMode): void {
  const sec = secondsFromClientX(clientX);
  if (mode === "start") {
    updateSelectionStart(sec);
  } else if (mode === "end") {
    updateSelectionEnd(sec);
  } else {
    const clamped = clampPreviewSec(sec);
    const v = videoRef.value;
    if (v) v.currentTime = clamped;
    onPreviewTimeUpdate(clamped);
  }
}

function onStartHandlePointerDown(event: PointerEvent): void {
  beginDrag(event, "start");
}

function onEndHandlePointerDown(event: PointerEvent): void {
  beginDrag(event, "end");
}

function onPlayheadPointerDown(event: PointerEvent): void {
  beginDrag(event, "playhead");
}

function onTrackPointerDown(event: PointerEvent): void {
  if (isProcessing.value || videoDurationSec.value <= 0) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest(".vtg-track__handle") || target?.closest(".vtg-track__playhead")) {
    return;
  }
  beginDrag(event, "playhead");
}

onBeforeUnmount(() => {
  detachPointerListeners();
});

function parseTimeCode(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const colon = trimmed.match(/^(\d{1,2}):(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (colon) {
    const mm = Number.parseInt(colon[1], 10);
    const ss = Number.parseInt(colon[2], 10);
    const fracStr = (colon[3] || "0").padEnd(2, "0").slice(0, 2);
    const frac = Number.parseInt(fracStr, 10) / 100;
    return mm * 60 + ss + frac;
  }
  const num = Number.parseFloat(trimmed);
  return Number.isFinite(num) ? num : null;
}

function onStartTimeBlur(event: Event): void {
  const input = event.target as HTMLInputElement;
  const parsed = parseTimeCode(input.value);
  if (parsed !== null) updateSelectionStart(parsed);
  input.value = formatTimeCode(selectionStartSec.value);
}

function onEndTimeBlur(event: Event): void {
  const input = event.target as HTMLInputElement;
  const parsed = parseTimeCode(input.value);
  if (parsed !== null) updateSelectionEnd(parsed);
  input.value = formatTimeCode(selectionEndSec.value);
}

function stepStartTime(delta: number): void {
  if (isProcessing.value) return;
  updateSelectionStart(selectionStartSec.value + delta);
}

function stepEndTime(delta: number): void {
  if (isProcessing.value) return;
  updateSelectionEnd(selectionEndSec.value + delta);
}

const thumbnails = ref<string[]>([]);
const thumbnailSlotCount = ref(10);
const isThumbnailLoading = ref(false);
let thumbnailGenerationToken = 0;

function pickThumbnailCount(duration: number): number {
  if (duration <= 0) return 0;
  if (duration < 4) return 6;
  if (duration < 12) return 8;
  if (duration < 40) return 10;
  if (duration < 120) return 12;
  return 14;
}

async function generateThumbnails(url: string, duration: number, count: number): Promise<string[]> {
  if (!url || duration <= 0 || count <= 0) return [];
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error("video metadata load failed"));
      };
      const cleanup = (): void => {
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("error", onErr);
      };
      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("loadeddata", onReady);
      video.addEventListener("error", onErr);
    });

    const naturalW = video.videoWidth || 320;
    const naturalH = video.videoHeight || 180;
    const targetW = 160;
    const targetH = Math.max(40, Math.round((targetW * naturalH) / naturalW));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const safeDur = Math.max(0.05, Math.min(duration, video.duration || duration));
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      const target = ((i + 0.5) / count) * safeDur;
      await new Promise<void>((resolve) => {
        let settled = false;
        const onSeek = () => {
          if (settled) return;
          settled = true;
          video.removeEventListener("seeked", onSeek);
          resolve();
        };
        video.addEventListener("seeked", onSeek);
        try {
          video.currentTime = Math.min(safeDur, Math.max(0, target));
        } catch {
          onSeek();
        }
        setTimeout(onSeek, 2000);
      });
      ctx.drawImage(video, 0, 0, targetW, targetH);
      results.push(canvas.toDataURL("image/jpeg", 0.72));
    }
    return results;
  } finally {
    video.removeAttribute("src");
    try {
      video.load();
    } catch {
      /* ignore */
    }
  }
}

async function refreshThumbnails(): Promise<void> {
  const url = currentVideoUrl.value;
  const duration = videoDurationSec.value;
  const count = pickThumbnailCount(duration);
  thumbnailSlotCount.value = Math.max(1, count);
  if (!url || duration <= 0 || count <= 0) {
    thumbnails.value = [];
    return;
  }
  const token = ++thumbnailGenerationToken;
  isThumbnailLoading.value = true;
  try {
    const result = await generateThumbnails(url, duration, count);
    if (token === thumbnailGenerationToken) {
      thumbnails.value = result;
    }
  } catch {
    if (token === thumbnailGenerationToken) {
      thumbnails.value = [];
    }
  } finally {
    if (token === thumbnailGenerationToken) {
      isThumbnailLoading.value = false;
    }
  }
}

watch(
  [currentVideoUrl, videoDurationSec],
  () => {
    thumbnails.value = [];
    if (currentVideoUrl.value && videoDurationSec.value > 0) {
      void nextTick(refreshThumbnails);
    }
  },
  { flush: "post" }
);

const thumbnailSlots = computed(() => {
  const list = thumbnails.value;
  const target = thumbnailSlotCount.value;
  if (list.length >= target) return list.slice(0, target);
  const placeholders = new Array<string>(Math.max(0, target - list.length)).fill("");
  return [...list, ...placeholders];
});

function onCustomWidthInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  customWidth.value = raw === "" ? 2 : Math.max(2, Number.parseInt(raw, 10) || 2);
}

function onCustomHeightInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  customHeight.value = raw === "" ? 2 : Math.max(2, Number.parseInt(raw, 10) || 2);
}

function toggleSettingsExpanded(): void {
  settingsExpanded.value = !settingsExpanded.value;
}

const removeVideoModalOpen = ref(false);
const removeVideoModalPanelRef = ref<HTMLElement | null>(null);

watch(removeVideoModalOpen, (open) => {
  if (open) {
    void nextTick(() => removeVideoModalPanelRef.value?.focus());
  }
});

function openRemoveVideoModal(): void {
  if (isProcessing.value) return;
  removeVideoModalOpen.value = true;
}

function closeRemoveVideoModal(): void {
  removeVideoModalOpen.value = false;
}

function confirmRemoveVideo(): void {
  videoRef.value?.pause();
  clearVideo();
  removeVideoModalOpen.value = false;
}
</script>

<template>
  <div class="vtg-page">
    <div class="vtg-shell">
      <header class="vtg-head">
        <div class="vtg-head__brand">
          <div class="vtg-head__logo" aria-hidden="true">GIF</div>
          <div class="vtg-head__text">
            <h2 class="vtg-head__title">{{ t("pages.videoToGif.title") }}</h2>
            <p class="vtg-head__desc">{{ t("pages.videoToGif.description") }}</p>
          </div>
        </div>
      </header>

      <div class="vtg-body">
        <div class="vtg-main" :class="{ 'vtg-main--empty-state': !hasVideo }">
          <section
            v-if="!hasVideo"
            class="vtg-card vtg-upload"
            :class="{ 'vtg-upload--active': isDropActive }"
            @drop="handleDrop"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
          >
            <div class="vtg-upload__inner">
              <div class="vtg-upload__art" aria-hidden="true">
                <img src="/resources/toGif/Image-5_03.png" alt="" />
              </div>
              <p class="vtg-upload__title">{{ t("pages.videoToGif.upload.dropTitle") }}</p>
              <p class="vtg-upload__desc">{{ t("pages.videoToGif.upload.dropDesc") }}</p>
              <button type="button" class="vtg-btn vtg-btn--primary vtg-btn--large" @click="pickVideo">
                <svg viewBox="0 0 24 24" class="vtg-btn__icon" aria-hidden="true">
                  <path
                    d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2Z"
                    fill="currentColor"
                  />
                </svg>
                {{ t("pages.videoToGif.upload.pickVideoCta") }}
              </button>
              <p class="vtg-upload__hint">{{ t("pages.videoToGif.upload.maxFileNote") }}</p>
            </div>

            <div class="vtg-tip" role="note">
              <span class="vtg-tip__dot" aria-hidden="true">!</span>
              <div>
                <strong class="vtg-tip__title">{{ t("pages.videoToGif.upload.tipTitle") }}</strong>
                <p class="vtg-tip__body">{{ t("pages.videoToGif.upload.tipBody") }}</p>
              </div>
            </div>
          </section>

          <section v-else class="vtg-card vtg-player">
            <div class="vtg-player__viewport" :aria-label="t('pages.videoToGif.preview.viewportAria')">
              <div class="vtg-player__composition">
                <button
                  type="button"
                  class="vtg-player__remove"
                  :disabled="isProcessing"
                  :aria-label="t('pages.videoToGif.preview.deleteVideo')"
                  :title="t('pages.videoToGif.preview.deleteVideo')"
                  @click="openRemoveVideoModal"
                >
                  <svg viewBox="0 0 24 24" class="vtg-player__remove-icon" aria-hidden="true">
                    <path
                      d="M9 3h6l1 2h5v2H3V5h5l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM5 9h14l-1 12H6L5 9Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <div class="vtg-player__stage">
                  <video
                    ref="videoRef"
                    class="vtg-player__video"
                    :src="currentVideoUrl"
                    preload="metadata"
                    playsinline
                    @loadedmetadata="onLoadedMetadata"
                    @timeupdate="onTimeUpdate"
                    @play="onPlay"
                    @pause="onPause"
                  />
                  <button
                    type="button"
                    class="vtg-player__play"
                    :aria-label="t('pages.videoToGif.preview.playAria')"
                    @click="togglePlay"
                  >
                    <img
                      class="vtg-player__play-img"
                      src="/resources/toGif/video_play.png"
                      alt=""
                      width="56"
                      height="56"
                      :class="{ 'vtg-player__play-img--hidden': !isPaused }"
                    />
                    <img
                      class="vtg-player__play-img"
                      src="/resources/toGif/video_pause.png"
                      alt=""
                      width="56"
                      height="56"
                      :class="{ 'vtg-player__play-img--hidden': isPaused }"
                    />
                  </button>
                </div>
              </div>
            </div>

            <div class="vtg-timeline">
              <div class="vtg-ruler" aria-hidden="true">
                <div class="vtg-ruler__labels">
                  <span
                    v-for="(label, idx) in rulerLabels"
                    :key="`label-${idx}`"
                    class="vtg-ruler__label"
                    :class="{
                      'vtg-ruler__label--first': idx === 0,
                      'vtg-ruler__label--last': idx === rulerLabels.length - 1
                    }"
                    :style="{ left: label.left + '%' }"
                  >{{ label.label }}</span>
                </div>
                <div class="vtg-ruler__ticks">
                  <span
                    v-for="(tick, idx) in rulerTicks"
                    :key="`tick-${idx}`"
                    class="vtg-ruler__tick"
                    :class="{ 'vtg-ruler__tick--major': tick.major }"
                    :style="{ left: tick.left + '%' }"
                  />
                </div>
              </div>

              <div
                class="vtg-track"
                :class="{ 'vtg-track--dragging': dragMode !== null, 'vtg-track--disabled': isProcessing }"
                :aria-label="t('pages.videoToGif.preview.rangeAria')"
              >
                <div
                  ref="trackRef"
                  class="vtg-track__inner"
                  @pointerdown="onTrackPointerDown"
                >
                  <div class="vtg-track__thumbs">
                    <div
                      v-for="(thumb, idx) in thumbnailSlots"
                      :key="idx"
                      class="vtg-track__thumb"
                      :class="{ 'vtg-track__thumb--empty': !thumb }"
                    >
                      <img v-if="thumb" :src="thumb" alt="" draggable="false" />
                    </div>
                  </div>

                  <div
                    class="vtg-track__mask vtg-track__mask--left"
                    :style="{ width: selectionStartPct + '%' }"
                    aria-hidden="true"
                  />
                  <div
                    class="vtg-track__mask vtg-track__mask--right"
                    :style="{ left: selectionEndPct + '%' }"
                    aria-hidden="true"
                  />

                  <div class="vtg-track__selection" :style="selectionStyle" aria-hidden="true">
                    <button
                      type="button"
                      class="vtg-track__handle vtg-track__handle--start"
                      :disabled="isProcessing"
                      :aria-label="t('pages.videoToGif.preview.startLabel')"
                      @pointerdown="onStartHandlePointerDown"
                    >
                      <span class="vtg-track__handle-grip">
                        <span class="vtg-track__handle-bar" />
                        <span class="vtg-track__handle-bar" />
                      </span>
                    </button>
                    <button
                      type="button"
                      class="vtg-track__handle vtg-track__handle--end"
                      :disabled="isProcessing"
                      :aria-label="t('pages.videoToGif.preview.endLabel')"
                      @pointerdown="onEndHandlePointerDown"
                    >
                      <span class="vtg-track__handle-grip">
                        <span class="vtg-track__handle-bar" />
                        <span class="vtg-track__handle-bar" />
                      </span>
                    </button>
                  </div>

                  <div
                    class="vtg-track__playhead"
                    :style="{ left: playheadPct + '%' }"
                    :aria-label="t('pages.videoToGif.preview.playheadAria')"
                    :title="t('pages.videoToGif.preview.playheadAria')"
                    @pointerdown="onPlayheadPointerDown"
                  >
                    <span class="vtg-track__playhead-pin" aria-hidden="true" />
                    <span class="vtg-track__playhead-line" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div class="vtg-preview-toolbar">
                <div class="vtg-time-row">
                  <div class="vtg-time-cell">
                    <span class="vtg-time-cell__label">{{ t("pages.videoToGif.preview.startLabel") }}</span>
                    <div class="vtg-time-cell__field">
                      <input
                        type="text"
                        class="vtg-time-cell__input"
                        :value="formatTimeCode(selectionStartSec)"
                        :disabled="isProcessing"
                        inputmode="decimal"
                        @blur="onStartTimeBlur"
                        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
                      />
                      <span class="vtg-time-cell__spin">
                        <button
                          type="button"
                          class="vtg-time-cell__spin-btn"
                          tabindex="-1"
                          :disabled="isProcessing"
                          aria-label="+"
                          @click="stepStartTime(0.1)"
                        >
                          <svg viewBox="0 0 10 6" aria-hidden="true"><path d="M5 0 0 6h10L5 0Z" fill="currentColor" /></svg>
                        </button>
                        <button
                          type="button"
                          class="vtg-time-cell__spin-btn"
                          tabindex="-1"
                          :disabled="isProcessing"
                          aria-label="-"
                          @click="stepStartTime(-0.1)"
                        >
                          <svg viewBox="0 0 10 6" aria-hidden="true"><path d="M0 0h10L5 6 0 0Z" fill="currentColor" /></svg>
                        </button>
                      </span>
                    </div>
                  </div>

                  <span class="vtg-time-row__arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 12">
                      <path d="M2 6h18m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>

                  <div class="vtg-time-cell">
                    <span class="vtg-time-cell__label">{{ t("pages.videoToGif.preview.endLabel") }}</span>
                    <div class="vtg-time-cell__field">
                      <input
                        type="text"
                        class="vtg-time-cell__input"
                        :value="formatTimeCode(selectionEndSec)"
                        :disabled="isProcessing"
                        inputmode="decimal"
                        @blur="onEndTimeBlur"
                        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
                      />
                      <span class="vtg-time-cell__spin">
                        <button
                          type="button"
                          class="vtg-time-cell__spin-btn"
                          tabindex="-1"
                          :disabled="isProcessing"
                          aria-label="+"
                          @click="stepEndTime(0.1)"
                        >
                          <svg viewBox="0 0 10 6" aria-hidden="true"><path d="M5 0 0 6h10L5 0Z" fill="currentColor" /></svg>
                        </button>
                        <button
                          type="button"
                          class="vtg-time-cell__spin-btn"
                          tabindex="-1"
                          :disabled="isProcessing"
                          aria-label="-"
                          @click="stepEndTime(-0.1)"
                        >
                          <svg viewBox="0 0 10 6" aria-hidden="true"><path d="M0 0h10L5 6 0 0Z" fill="currentColor" /></svg>
                        </button>
                      </span>
                    </div>
                  </div>

                  <div class="vtg-time-stat">
                    <span class="vtg-time-stat__label">{{ t("pages.videoToGif.preview.durationLabel") }}</span>
                    <strong class="vtg-time-stat__value vtg-time-stat__value--primary">
                      {{ selectionDurationSec.toFixed(1) }} {{ t("pages.videoToGif.preview.durationUnit") }}
                    </strong>
                  </div>

                  <div class="vtg-time-stat">
                    <span class="vtg-time-stat__label">{{ t("pages.videoToGif.preview.currentLabel") }}</span>
                    <strong class="vtg-time-stat__value">{{ formatTimeCode(previewCurrentSec) }}</strong>
                  </div>
                </div>

                <div class="vtg-preview-toolbar__cta">
                  <button
                    type="button"
                    class="vtg-btn vtg-btn--primary vtg-btn--cta"
                    :disabled="isProcessing"
                    @click="addCurrentClip"
                  >
                    <svg viewBox="0 0 24 24" class="vtg-btn__icon" aria-hidden="true">
                      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
                    </svg>
                    {{ t("pages.videoToGif.clips.addCurrent") }}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section v-if="hasVideo" class="vtg-card vtg-clips">
            <div class="vtg-clips__head">
              <div class="vtg-clips__title-wrap">
                <h3 class="vtg-clips__title">{{ t("pages.videoToGif.clips.title") }}</h3>
                <span class="vtg-clips__count">{{ t("pages.videoToGif.clips.countTpl", { count: clips.length }) }}</span>
              </div>
            </div>

            <div v-if="clips.length === 0" class="vtg-panel-empty vtg-panel-empty--tight" aria-live="polite">
              <div class="vtg-panel-empty__icon" aria-hidden="true">
                <svg viewBox="0 0 80 64" class="vtg-panel-empty__svg">
                  <rect x="10" y="16" width="34" height="26" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
                  <rect x="32" y="24" width="34" height="26" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
                  <circle cx="56" cy="20" r="10" fill="#e2e8f0" />
                  <path d="M56 16v8M52 20h8" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </div>
              <p class="vtg-panel-empty__title">{{ t("pages.videoToGif.clips.emptyStateTitle") }}</p>
              <p class="vtg-panel-empty__desc">{{ t("pages.videoToGif.clips.emptyStateDesc") }}</p>
            </div>

            <ul v-else class="vtg-clip-list">
              <li class="vtg-clip-row vtg-clip-row--header" aria-hidden="true">
                <span class="vtg-clip-row__drag vtg-clip-row__drag--header" />
                <span class="vtg-clip-row__head-cell">{{ t("pages.videoToGif.clips.colClip") }}</span>
                <span class="vtg-clip-row__head-cell">{{ t("pages.videoToGif.clips.startCol") }}</span>
                <span class="vtg-clip-row__head-cell">{{ t("pages.videoToGif.clips.endCol") }}</span>
                <span class="vtg-clip-row__head-cell">{{ t("pages.videoToGif.clips.durationCol") }}</span>
                <span class="vtg-clip-row__head-cell">{{ t("pages.videoToGif.clips.colSize") }}</span>
                <span class="vtg-clip-row__head-cell">{{ t("pages.videoToGif.clips.colFps") }}</span>
                <span class="vtg-clip-row__head-cell">{{ t("pages.videoToGif.clips.colStatusActions") }}</span>
              </li>
              <li v-for="(clip, idx) in clips" :key="clip.id" class="vtg-clip-row">
                <div class="vtg-clip-row__drag" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M9 7h2v2H9V7Zm4 0h2v2h-2V7ZM9 11h2v2H9v-2Zm4 0h2v2h-2v-2ZM9 15h2v2H9v-2Zm4 0h2v2h-2v-2Z" fill="currentColor" /></svg>
                </div>
                <span class="vtg-clip-row__chip">
                  {{ t("pages.videoToGif.clips.chipPrefix") }} {{ (idx + 1).toString().padStart(2, '0') }}
                </span>
                <div class="vtg-clip-row__time">
                  <strong>{{ formatTimeCode(clip.startSec) }}</strong>
                </div>
                <div class="vtg-clip-row__time">
                  <strong>{{ formatTimeCode(clip.endSec) }}</strong>
                </div>
                <div class="vtg-clip-row__time">
                  <strong>{{ formatClipDuration(clip) }}</strong>
                </div>
                <span class="vtg-clip-row__badge">
                  {{ t("pages.videoToGif.clips.sizeUnit", { w: clip.width, h: clip.height }) }}
                </span>
                <span class="vtg-clip-row__badge vtg-clip-row__badge--fps">
                  {{ t("pages.videoToGif.clips.fpsUnit", { fps: clip.fps }) }}
                </span>
                <div class="vtg-clip-row__tail">
                  <span
                    v-if="clip.status === 'completed'"
                    class="vtg-clip-row__status vtg-clip-row__status--ok"
                    :title="clip.outputPath"
                  >
                    {{ t("pages.videoToGif.status.completed") }}
                  </span>
                  <span
                    v-else-if="clip.status === 'failed'"
                    class="vtg-clip-row__status vtg-clip-row__status--bad"
                    :title="clip.error"
                  >
                    {{ t("pages.videoToGif.status.failed") }}
                  </span>
                  <div class="vtg-clip-row__actions">
                    <button
                      type="button"
                      class="vtg-icon-btn vtg-icon-btn--danger"
                      :aria-label="t('pages.videoToGif.clips.deleteAria')"
                      :title="t('pages.videoToGif.clips.deleteAria')"
                      :disabled="isProcessing"
                      @click="removeClip(clip.id)"
                    >
                      <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Zm9-3v1h4v2H5V5h4V4h6Z" fill="currentColor" /></svg>
                    </button>
                    <button
                      v-if="clip.status === 'completed' && clip.outputPath"
                      type="button"
                      class="vtg-icon-btn"
                      :aria-label="t('pages.videoToGif.clips.openFolderAria')"
                      :title="t('pages.videoToGif.clips.openFolderTip')"
                      :disabled="isProcessing"
                      @click="openClipOutputFolder(clip.id)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" class="vtg-clip-row__folder-icon">
                        <path
                          d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div v-if="clip.status === 'running'" class="vtg-clip-row__progress" :style="{ width: clip.progress + '%' }" />
              </li>
            </ul>

          </section>

          <section v-else class="vtg-card" aria-live="polite">
            <div class="vtg-panel-empty vtg-panel-empty--tight">
              <div class="vtg-panel-empty__icon" aria-hidden="true">
                <svg viewBox="0 0 80 64" class="vtg-panel-empty__svg">
                  <rect x="10" y="16" width="34" height="26" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
                  <rect x="32" y="24" width="34" height="26" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
                  <circle cx="56" cy="20" r="10" fill="#e2e8f0" />
                  <path d="M56 16v8M52 20h8" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </div>
              <p class="vtg-panel-empty__title">{{ t("pages.videoToGif.emptyVideo.title") }}</p>
              <p class="vtg-panel-empty__desc">{{ t("pages.videoToGif.emptyVideo.desc") }}</p>
            </div>
          </section>

          <output v-if="hintMessage" class="vtg-hint">{{ hintMessage }}</output>
        </div>

        <aside class="vtg-rail" :aria-label="t('pages.videoToGif.settings.title')">
          <div class="vtg-card vtg-settings">
            <div class="vtg-settings__head">
              <h3 class="vtg-settings__title">{{ t("pages.videoToGif.settings.title") }}</h3>
              <button
                v-if="hasVideo"
                type="button"
                class="vtg-icon-btn vtg-icon-btn--ghost"
                :aria-label="t('pages.videoToGif.settings.collapseAria')"
                @click="toggleSettingsExpanded"
              >
                <svg viewBox="0 0 24 24" :class="{ 'vtg-chevron--open': settingsExpanded }">
                  <path d="M7 10l5 5 5-5z" fill="currentColor" />
                </svg>
              </button>
            </div>

            <div v-show="settingsExpanded" class="vtg-settings__body">
              <div class="vtg-field">
                <span class="vtg-field__label">{{ t("pages.videoToGif.settings.size") }}</span>
                <div class="vtg-chips vtg-chips--compact">
                  <button
                    type="button"
                    class="vtg-chip"
                    :class="{ 'vtg-chip--active': sizePreset === 'original' }"
                    :disabled="isProcessing"
                    @click="sizePreset = 'original'"
                  >{{ t("pages.videoToGif.settings.sizeOriginal") }}</button>
                  <button
                    type="button"
                    class="vtg-chip"
                    :class="{ 'vtg-chip--active': sizePreset === 'p720' }"
                    :disabled="isProcessing"
                    @click="sizePreset = 'p720'"
                  >720p</button>
                  <button
                    type="button"
                    class="vtg-chip"
                    :class="{ 'vtg-chip--active': sizePreset === 'p480' }"
                    :disabled="isProcessing"
                    @click="sizePreset = 'p480'"
                  >480p</button>
                  <button
                    type="button"
                    class="vtg-chip"
                    :class="{ 'vtg-chip--active': sizePreset === 'custom' }"
                    :disabled="isProcessing"
                    @click="sizePreset = 'custom'"
                  >{{ t("pages.videoToGif.settings.sizeCustom") }}</button>
                </div>
              </div>

              <div class="vtg-custom-dims">
                <span class="vtg-custom-dims__lbl">{{ t("pages.videoToGif.settings.width") }}</span>
                <input
                  type="number"
                  class="vtg-input vtg-input--num"
                  min="2"
                  :value="customWidth"
                  :disabled="isProcessing"
                  :aria-label="t('pages.videoToGif.settings.width')"
                  @input="onCustomWidthInput"
                />
                <button
                  type="button"
                  class="vtg-aspect"
                  :class="{ 'vtg-aspect--locked': keepAspect }"
                  :aria-label="t('pages.videoToGif.settings.aspectLockAria')"
                  :aria-pressed="keepAspect"
                  @click="keepAspect = !keepAspect"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V6Z" fill="currentColor" />
                  </svg>
                </button>
                <span class="vtg-custom-dims__lbl">{{ t("pages.videoToGif.settings.height") }}</span>
                <input
                  type="number"
                  class="vtg-input vtg-input--num"
                  min="2"
                  :value="customHeight"
                  :disabled="isProcessing"
                  :aria-label="t('pages.videoToGif.settings.height')"
                  @input="onCustomHeightInput"
                />
              </div>

              <div class="vtg-field">
                <span class="vtg-field__label">{{ t("pages.videoToGif.settings.fps") }}</span>
                <div class="vtg-chips vtg-chips--compact">
                  <button
                    v-for="opt in fpsOptions"
                    :key="opt"
                    type="button"
                    class="vtg-chip"
                    :class="{ 'vtg-chip--active': fpsValue === opt }"
                    :disabled="isProcessing"
                    @click="setFpsPreset(opt)"
                  >{{ opt }}</button>
                  <span class="vtg-field__suffix">{{ t("pages.videoToGif.settings.fpsUnit", { fps: effectiveFps }) }}</span>
                </div>
              </div>

              <div class="vtg-field vtg-field--quality">
                <span class="vtg-field__label">{{ t("pages.videoToGif.settings.quality") }}</span>
                <div class="vtg-quality vtg-quality--stacked">
                  <input
                    type="range"
                    class="vtg-quality__range"
                    min="0"
                    max="100"
                    step="1"
                    v-model.number="qualityScore"
                    :disabled="isProcessing"
                    :aria-label="t('pages.videoToGif.settings.quality')"
                  />
                  <div class="vtg-quality__labels">
                    <span>{{ t("pages.videoToGif.settings.qualityLow") }}</span>
                    <span>{{ t("pages.videoToGif.settings.qualityMid") }}</span>
                    <span>{{ t("pages.videoToGif.settings.qualityHigh") }}</span>
                  </div>
                </div>
              </div>

              <div class="vtg-field">
                <span class="vtg-field__label">{{ t("pages.videoToGif.settings.speed") }}</span>
                <select
                  v-model.number="playbackSpeed"
                  class="vtg-select"
                  :disabled="isProcessing"
                  :aria-label="t('pages.videoToGif.settings.speed')"
                >
                  <option :value="0.5">{{ t("pages.videoToGif.settings.speed05") }}</option>
                  <option :value="1">{{ t("pages.videoToGif.settings.speed10") }}</option>
                  <option :value="2">{{ t("pages.videoToGif.settings.speed20") }}</option>
                </select>
              </div>

              <div class="vtg-field">
                <span class="vtg-field__label">{{ t("pages.videoToGif.settings.loopMode") }}</span>
                <select
                  v-model="loopPlayback"
                  class="vtg-select"
                  :disabled="isProcessing"
                  :aria-label="t('pages.videoToGif.settings.loopMode')"
                >
                  <option :value="true">{{ t("pages.videoToGif.settings.loopInfinite") }}</option>
                  <option :value="false">{{ t("pages.videoToGif.settings.loopOnce") }}</option>
                </select>
              </div>

              <div class="vtg-row vtg-row--toggle">
                <span class="vtg-row__icon" aria-hidden="true">
                  <img
                    src="/resources/toGif/ratio.png"
                    alt=""
                    width="200"
                    height="200"
                    decoding="async"
                  />
                </span>
                <div class="vtg-row__toggle-body">
                  <div>
                    <span class="vtg-row__label">{{ t("pages.videoToGif.settings.keepAspect") }}</span>
                    <span class="vtg-row__hint">{{ t("pages.videoToGif.settings.keepAspectHint") }}</span>
                  </div>
                  <label class="vtg-switch">
                    <input
                      type="checkbox"
                      v-model="keepAspect"
                      :disabled="isProcessing"
                      :aria-label="t('pages.videoToGif.settings.keepAspect')"
                    />
                    <span class="vtg-switch__slider" />
                  </label>
                </div>
              </div>

              <div class="vtg-row vtg-row--toggle">
                <span class="vtg-row__icon" aria-hidden="true">
                  <img
                    src="/resources/toGif/optimize.png"
                    alt=""
                    width="200"
                    height="200"
                    decoding="async"
                  />
                </span>
                <div class="vtg-row__toggle-body">
                  <div>
                    <span class="vtg-row__label">{{ t("pages.videoToGif.settings.reduceSize") }}</span>
                    <span class="vtg-row__hint" v-if="hasVideo">{{ t("pages.videoToGif.settings.smartCompressLabel") }}</span>
                    <span class="vtg-row__hint" v-else>{{ t("pages.videoToGif.settings.reduceSizeHint") }}</span>
                  </div>
                  <label class="vtg-switch">
                    <input
                      type="checkbox"
                      v-model="reduceSize"
                      :disabled="isProcessing"
                      :aria-label="t('pages.videoToGif.settings.reduceSize')"
                    />
                    <span class="vtg-switch__slider" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="vtg-card vtg-estimate">
            <h3 class="vtg-estimate__title">{{ t("pages.videoToGif.estimate.title") }}</h3>
            <div class="vtg-estimate__grid">
              <div class="vtg-stat">
                <img class="vtg-stat__icon" src="/resources/toGif/Image-5_31.png" alt="" aria-hidden="true" />
                <span class="vtg-stat__label">{{ t("pages.videoToGif.estimate.size") }}</span>
                <strong class="vtg-stat__value">{{ estimateSize }}</strong>
                <span class="vtg-stat__sub" v-if="clips.length">{{ t("pages.videoToGif.estimate.sizeSubtitle", { count: clips.length }) }}</span>
              </div>
              <div class="vtg-stat">
                <img class="vtg-stat__icon" src="/resources/toGif/Image-5_33.png" alt="" aria-hidden="true" />
                <span class="vtg-stat__label">{{ t("pages.videoToGif.estimate.frames") }}</span>
                <strong class="vtg-stat__value">{{ estimateFrames }}</strong>
                <span class="vtg-stat__sub" v-if="clips.length">{{ t("pages.videoToGif.estimate.framesSubtitle") }}</span>
              </div>
              <div class="vtg-stat">
                <img class="vtg-stat__icon" src="/resources/toGif/Image-5_35.png" alt="" aria-hidden="true" />
                <span class="vtg-stat__label">{{ t("pages.videoToGif.estimate.duration") }}</span>
                <strong class="vtg-stat__value">{{ estimateDuration }}</strong>
                <span class="vtg-stat__sub" v-if="clips.length">{{ t("pages.videoToGif.estimate.durationSubtitle") }}</span>
              </div>
              <div class="vtg-stat">
                <img class="vtg-stat__icon" src="/resources/toGif/Image-5_37.png" alt="" aria-hidden="true" />
                <span class="vtg-stat__label">{{ t("pages.videoToGif.estimate.resolution") }}</span>
                <strong class="vtg-stat__value">{{ estimateResolution }}</strong>
              </div>
            </div>
          </div>

          <div class="vtg-actions">
            <button
              type="button"
              class="vtg-btn vtg-btn--primary vtg-btn--block"
              :disabled="!canStart"
              :aria-busy="isProcessing"
              @click="startConversion"
            >
              <img
                class="vtg-btn__icon vtg-btn__icon--to-gif"
                src="/resources/toGif/toGif.png"
                alt=""
                width="144"
                height="153"
                decoding="async"
                aria-hidden="true"
              />
              {{ isProcessing ? t("pages.videoToGif.footer.processing") : t("pages.videoToGif.footer.start") }}
            </button>
            <button
              type="button"
              class="vtg-btn vtg-btn--ghost vtg-btn--block"
              :disabled="!canOpenOutputDirectory || isProcessing"
              :aria-label="t('pages.videoToGif.footer.openDirectory')"
              @click="openOutputDirectory"
            >
              <svg viewBox="0 0 24 24" class="vtg-btn__icon" aria-hidden="true">
                <path
                  d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"
                  fill="currentColor"
                />
              </svg>
              {{ t("pages.videoToGif.footer.openDirectory") }}
            </button>
          </div>
        </aside>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="removeVideoModalOpen"
        class="vtg-remove-modal-backdrop"
        aria-hidden="false"
        @click.self="closeRemoveVideoModal"
      >
        <div
          ref="removeVideoModalPanelRef"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="vtg-remove-modal-title"
          tabindex="-1"
          class="vtg-remove-modal-panel"
          @keydown.escape.prevent="closeRemoveVideoModal"
        >
          <h2 id="vtg-remove-modal-title" class="vtg-remove-modal-title">
            {{ t("pages.videoToGif.preview.deleteVideoModalTitle") }}
          </h2>
          <p class="vtg-remove-modal-body">{{ t("pages.videoToGif.preview.deleteVideoModalBody") }}</p>
          <div class="vtg-remove-modal-actions">
            <button type="button" class="vtg-btn vtg-btn--ghost" @click="closeRemoveVideoModal">
              {{ t("pages.videoToGif.preview.deleteVideoModalCancel") }}
            </button>
            <button type="button" class="vtg-btn vtg-btn--danger" @click="confirmRemoveVideo">
              {{ t("pages.videoToGif.preview.deleteVideoModalConfirm") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.vtg-page {
  /* Aligned with ImageWatermarkPage / desktop-app-ui tokens */
  --surface: #ffffff;
  --surface-muted: #f5f6fa;
  --border: #eef0f4;
  --border-weak: #e7e9ee;
  --text: #1f2937;
  --text-secondary: #4b5563;
  --text-muted: #6b7280;
  --text-hint: #9ca3af;
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --vtg-shell-pad-x: 18px;
  --vtg-bg: var(--surface-muted);
  --vtg-surface: var(--surface);
  --vtg-surface-soft: #fafbfd;
  --vtg-border: var(--border);
  --vtg-border-strong: #e0e3ea;
  --vtg-text: var(--text);
  --vtg-text-secondary: var(--text-secondary);
  --vtg-text-muted: var(--text-muted);
  --vtg-text-hint: var(--text-hint);
  --vtg-primary: var(--primary);
  --vtg-primary-strong: var(--primary-dark);
  --vtg-primary-soft: #c7d2fe;
  --vtg-primary-tint: #eef2ff;
  --vtg-danger: #ef4444;
  --vtg-success: #22c55e;
  --vtg-success-soft: #dcfce7;
  --vtg-purple-from: #8b5cf6;
  --vtg-purple-to: #6366f1;
  --vtg-shadow-card: 0 1px 2px rgba(15, 23, 42, 0.02);
  flex: 1;
  min-height: 0;
  height: 100%;
  background: var(--vtg-bg);
  overflow: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.vtg-shell {
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 14px var(--vtg-shell-pad-x) 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

.vtg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.vtg-head__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.vtg-head__logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--vtg-purple-from) 0%, var(--vtg-purple-to) 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px rgba(99, 102, 241, 0.32);
  flex-shrink: 0;
}

.vtg-head__title {
  margin: 0;
  font-size: clamp(20px, 1.8vw, 24px);
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--vtg-text);
}

.vtg-head__desc {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vtg-text-secondary);
}



.vtg-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vtg-success);
  background: var(--vtg-success-soft);
}

.vtg-badge__icon {
  width: 14px;
  height: 14px;
}


.vtg-body {
  display: grid;
  /* 左侧视频区随剩余宽度伸缩（预览保持 16:9）；右侧属性列在宽屏下可占到更大比例，上限用 vw + px 双约束 */
  grid-template-columns: minmax(0, 1fr) minmax(300px, min(480px, 42vw));
  gap: clamp(12px, 1.8vw, 20px);
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.vtg-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  min-height: 0;
}

.vtg-main--empty-state {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.vtg-field {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.vtg-field__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vtg-text-secondary);
}

.vtg-field__suffix {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--vtg-text-muted);
  align-self: center;
}

.vtg-field .vtg-chips {
  align-items: center;
}

.vtg-custom-dims {
  display: grid;
  grid-template-columns: auto 0.5fr auto auto 1fr;
  align-items: center;
  gap: 8px 10px;
}

.vtg-custom-dims__lbl {
  font-size: 12px;
  color: var(--vtg-text-muted);
  white-space: nowrap;
}

.vtg-quality--stacked {
  gap: 10px;
}

.vtg-quality--stacked .vtg-quality__labels {
  margin-top: 2px;
}

.vtg-rail {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  max-width: 100%;
}

.vtg-card {
  background: var(--vtg-surface);
  border: 1px solid var(--vtg-border);
  border-radius: 16px;
  box-shadow: var(--vtg-shadow-card);
}

.vtg-upload {
  padding: 24px 26px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: relative;
  flex-shrink: 0;
}

.vtg-upload--active {
  border-color: var(--vtg-primary-soft);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.vtg-upload__inner {
  border: 1px dashed #e0e3ea;
  border-radius: 14px;
  padding: 28px 20px 24px;
  text-align: center;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.vtg-upload__art {
  width: 88px;
  height: auto;
  min-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.vtg-upload__art img {
  width: 100%;
  max-width: 88px;
  height: auto;
}

.vtg-upload__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.vtg-upload__desc {
  margin: 0;
  max-width: 420px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.vtg-upload__hint {
  margin: 8px 0 0;
  max-width: 420px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-secondary);
}

.vtg-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fafbfd;
  border: 1px solid var(--vtg-border);
  color: var(--vtg-text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.vtg-tip__dot {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--vtg-primary);
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.vtg-tip__title {
  display: block;
  color: var(--vtg-primary);
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 2px;
}

.vtg-tip__body {
  margin: 0;
  line-height: 1.55;
}

.vtg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    box-shadow 0.15s,
    border-color 0.15s,
    filter 0.15s;
  line-height: 1.2;
}

.vtg-btn:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

.vtg-btn__icon {
  width: 16px;
  height: 16px;
}

/* Raster GIF branding: preserve intrinsic ratio, slightly larger than default 16px SVG */
.vtg-btn__icon--to-gif {
  width: 24px;
  height: auto;
  aspect-ratio: 144 / 153;
  object-fit: contain;
  flex-shrink: 0;
}

.vtg-btn--primary {
  background: var(--vtg-primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.22);
}

.vtg-btn--primary:hover:not(:disabled) {
  background: var(--vtg-primary-strong);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.28);
}

.vtg-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.vtg-btn--ghost {
  background: #fff;
  color: var(--vtg-text-secondary);
  border: 1px solid var(--border-weak);
}

.vtg-btn--ghost:hover:not(:disabled) {
  border-color: #dbeafe;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.06);
  color: var(--vtg-primary);
}

.vtg-btn--ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vtg-btn--danger {
  background: var(--vtg-danger);
  color: #fff;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.28);
}

.vtg-btn--danger:hover:not(:disabled) {
  filter: brightness(0.95);
}

.vtg-btn--danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.vtg-remove-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
}

.vtg-remove-modal-panel {
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
  padding: 22px 22px 18px;
  outline: none;
}

.vtg-remove-modal-title {
  margin: 0 0 12px;
  font-size: 18px;
  line-height: 26px;
  font-weight: 700;
  color: var(--text);
}

.vtg-remove-modal-body {
  margin: 0 0 20px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.vtg-remove-modal-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.vtg-btn--large {
  padding: 11px 22px;
  font-size: 14px;
  border-radius: 10px;
}

.vtg-btn--small {
  padding: 6px 12px;
  font-size: 12px;
}

.vtg-btn--block {
  width: 100%;
  padding: 12px 18px;
  font-size: 14px;
}

.vtg-player {
  --vtg-preview-max-h: min(54vh, 520px);
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* AE 风格：外层面板 + 内层合成安全区，避免画面与页面背景贴在一起 */
.vtg-player__viewport {
  padding: 10px;
  border-radius: 10px;
  background: linear-gradient(175deg, #3e3e42 0%, #2d2d30 55%, #252526 100%);
  border: 1px solid #1e1e1e;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 4px 14px rgba(0, 0, 0, 0.12);
}

.vtg-player__composition {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  min-height: 168px;
  max-height: calc(var(--vtg-preview-max-h) + 24px);
  border-radius: 6px;
  background-color: #141414;
  background-image:
    linear-gradient(45deg, #1c1c1c 25%, transparent 25%),
    linear-gradient(-45deg, #1c1c1c 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #1c1c1c 75%),
    linear-gradient(-45deg, transparent 75%, #1c1c1c 75%);
  background-size: 12px 12px;
  background-position:
    0 0,
    0 6px,
    6px -6px,
    -6px 0;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.06),
    inset 0 12px 24px rgba(0, 0, 0, 0.45);
}

.vtg-player__remove {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  background: rgba(10, 10, 10, 0.55);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  opacity: 0.45;
  transition:
    opacity 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.15s ease;
}

.vtg-player__composition:has(.vtg-player__stage:hover) .vtg-player__remove:not(:disabled),
.vtg-player__remove:hover:not(:disabled),
.vtg-player__remove:focus-visible {
  opacity: 1;
}

.vtg-player__remove:hover:not(:disabled) {
  background: rgba(185, 28, 28, 0.88);
  border-color: rgba(254, 202, 202, 0.45);
  color: #fff;
}

.vtg-player__remove:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.vtg-player__remove:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.vtg-player__remove-icon {
  width: 20px;
  height: 20px;
}

.vtg-player__stage {
  position: relative;
  width: min(100%, calc(var(--vtg-preview-max-h) * 16 / 9));
  max-width: 100%;
  max-height: var(--vtg-preview-max-h);
  aspect-ratio: 16 / 9;
  border-radius: 4px;
  overflow: hidden;
  background: #0a0a0a;
  box-shadow:
    0 0 0 1px #0d0d0d,
    0 0 0 2px #4a4a4a,
    0 6px 20px rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.vtg-player__video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: #000;
}

.vtg-player__play {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.vtg-player__stage:hover .vtg-player__play,
.vtg-player__play:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

.vtg-player__play:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

.vtg-player__play-img {
  position: absolute;
  width: 56px;
  height: 56px;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55));
}

.vtg-player__play-img--hidden {
  opacity: 0;
  visibility: hidden;
}

.vtg-timeline {
  --vtg-track-height: 76px;
  --vtg-handle-width: 18px;
  --vtg-selection-border: #6366f1;
  --vtg-selection-border-soft: #c7d2fe;
  --vtg-track-bg: #ffffff;
  --vtg-track-border: #eef0f4;
  --vtg-mask-overlay: rgba(245, 246, 250, 0.88);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 6px 2px 4px;
}

.vtg-ruler {
  position: relative;
  height: 36px;
  padding: 0 var(--vtg-handle-width);
}

.vtg-ruler__labels {
  position: relative;
  height: 16px;
}

.vtg-ruler__label {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 12px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  white-space: nowrap;
}

.vtg-ruler__label--first {
  transform: translateX(0);
}

.vtg-ruler__label--last {
  transform: translateX(-100%);
}

.vtg-ruler__ticks {
  position: relative;
  height: 14px;
  margin-top: 4px;
}

.vtg-ruler__tick {
  position: absolute;
  top: 0;
  width: 1px;
  height: 5px;
  background: #cbd5e1;
  transform: translateX(-50%);
  border-radius: 0.5px;
}

.vtg-ruler__tick--major {
  height: 9px;
  background: #94a3b8;
  width: 1.5px;
}

.vtg-track {
  position: relative;
  height: var(--vtg-track-height);
  border-radius: 10px;
  background: var(--vtg-track-bg);
  border: 1px solid var(--vtg-track-border);
  padding: 0 var(--vtg-handle-width);
  box-sizing: border-box;
  user-select: none;
  overflow: visible;
}

.vtg-track__inner {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  touch-action: none;
}

.vtg-track--disabled .vtg-track__inner {
  cursor: not-allowed;
}

.vtg-track--dragging .vtg-track__inner {
  cursor: grabbing;
}

.vtg-track__thumbs {
  position: absolute;
  inset: 0;
  display: flex;
  overflow: hidden;
  border-radius: 4px;
  background: #f5f6fa;
}

.vtg-track__thumb {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  background: #eef0f4;
  overflow: hidden;
  position: relative;
}

.vtg-track__thumb + .vtg-track__thumb {
  margin-left: 1px;
}

.vtg-track__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  -webkit-user-drag: none;
  user-select: none;
  pointer-events: none;
}

.vtg-track__thumb--empty {
  background: linear-gradient(
    135deg,
    #f5f6fa 0%,
    #eef0f4 50%,
    #f5f6fa 100%
  );
  background-size: 200% 100%;
  animation: vtg-thumb-shimmer 1.6s linear infinite;
}

@keyframes vtg-thumb-shimmer {
  0% {
    background-position: 0% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.vtg-track__mask {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--vtg-mask-overlay);
  pointer-events: none;
  z-index: 2;
}

.vtg-track__mask--left {
  left: 0;
}

.vtg-track__mask--right {
  right: 0;
}

.vtg-track__selection {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  pointer-events: none;
  border-top: 2px solid var(--vtg-selection-border);
  border-bottom: 2px solid var(--vtg-selection-border);
  box-sizing: border-box;
}

.vtg-track__handle {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: var(--vtg-handle-width);
  background: var(--vtg-selection-border);
  border: none;
  padding: 0;
  cursor: ew-resize;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.22);
  transition: background 0.15s ease, box-shadow 0.15s ease;
  z-index: 5;
}

.vtg-track__handle:hover:not(:disabled),
.vtg-track__handle:focus-visible {
  background: var(--vtg-primary-strong);
}

.vtg-track__handle:focus-visible {
  outline: 2px solid #fbbf24;
  outline-offset: -3px;
}

.vtg-track__handle:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.vtg-track__handle--start {
  left: calc(-1 * var(--vtg-handle-width));
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}

.vtg-track__handle--end {
  right: calc(-1 * var(--vtg-handle-width));
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
}

.vtg-track__handle-grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  pointer-events: none;
}

.vtg-track__handle-bar {
  display: block;
  width: 2px;
  height: 14px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.95);
}

.vtg-track__playhead {
  position: absolute;
  top: -8px;
  bottom: -2px;
  width: 14px;
  margin-left: -7px;
  z-index: 6;
  cursor: grab;
  pointer-events: auto;
}

.vtg-track__playhead:active {
  cursor: grabbing;
}

.vtg-track__playhead-pin {
  position: absolute;
  top: 0;
  left: 50%;
  width: 10px;
  height: 8px;
  transform: translateX(-50%);
  background: var(--vtg-selection-border);
  clip-path: polygon(50% 100%, 0 0, 100% 0);
}

.vtg-track__playhead-line {
  position: absolute;
  top: 8px;
  bottom: 0;
  left: 50%;
  width: 0;
  border-left: 1.5px dashed var(--vtg-selection-border);
  transform: translateX(-50%);
  pointer-events: none;
}

.vtg-preview-toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 18px;
  padding-top: 4px;
}

.vtg-time-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-around;
  gap: 16px 24px;
  width: 80%;
  margin: 0 auto;
}

.vtg-time-row__arrow {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  width: 28px;
  height: 36px;
  color: var(--text-hint);
  padding-bottom: 8px;
}

.vtg-time-row__arrow svg {
  width: 22px;
  height: 11px;
}

.vtg-time-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.vtg-time-cell__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0;
}

.vtg-time-cell__field {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.vtg-time-cell__field:focus-within {
  border-color: var(--vtg-primary-soft);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.vtg-time-cell__input {
  width: 92px;
  padding: 7px 10px;
  border: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  text-align: center;
  outline: none;
}

.vtg-time-cell__input:disabled {
  color: var(--text-hint);
  cursor: not-allowed;
}

.vtg-time-cell__spin {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
}

.vtg-time-cell__spin-btn {
  flex: 1 1 0;
  width: 22px;
  min-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  transition: background 0.12s ease, color 0.12s ease;
}

.vtg-time-cell__spin-btn + .vtg-time-cell__spin-btn {
  border-top: 1px solid var(--border);
}

.vtg-time-cell__spin-btn:hover:not(:disabled) {
  background: var(--vtg-primary-tint);
  color: var(--vtg-primary);
}

.vtg-time-cell__spin-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vtg-time-cell__spin-btn svg {
  width: 8px;
  height: 5px;
  display: block;
}

.vtg-time-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding-bottom: 2px;
}

.vtg-time-stat__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0;
}

.vtg-time-stat__value {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  padding-top: 7px;
}

.vtg-time-stat__value--primary {
  color: var(--vtg-primary);
}

.vtg-preview-toolbar__cta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
}

.vtg-preview-toolbar__cta .vtg-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: min(100%, 460px);
  justify-content: center;
}

.vtg-btn--cta {
  padding: 13px 24px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.28);
}

.vtg-btn--cta .vtg-btn__icon {
  width: 18px;
  height: 18px;
}

.vtg-clips {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vtg-clips__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.vtg-clips__title-wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.vtg-clips__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
  color: var(--vtg-text);
}

.vtg-clips__count {
  font-size: 12px;
  color: var(--vtg-text-muted);
}

.vtg-clip-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.vtg-clip-row {
  position: relative;
  display: grid;
  /* 压缩时间/尺寸列，为帧率、状态操作保留最小可读宽度；避免 overflow 裁切右侧列 */
  grid-template-columns:
    18px
    minmax(64px, 0.72fr)
    minmax(72px, 1fr)
    minmax(72px, 1fr)
    minmax(56px, 0.85fr)
    minmax(90px, 0.88fr)
    minmax(64px, 0.72fr)
    minmax(124px, 1.12fr);
  align-items: center;
  justify-items: stretch;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--vtg-surface-soft);
  border: 1px solid var(--vtg-border);
  font-size: 13px;
  color: var(--vtg-text-secondary);
  overflow: visible;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.vtg-clip-row--header {
  padding: 8px 10px 10px;
  background: transparent;
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--vtg-border);
  gap: 8px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  justify-items: stretch;
}

.vtg-clip-row__head-cell {
  justify-self: stretch;
  width: 100%;
  min-width: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--vtg-text-muted);
  white-space: nowrap;
  text-align: center;
}

.vtg-clip-row--header .vtg-clip-row__head-cell:nth-child(2) {
  text-align: start;
}

.vtg-clip-row--header .vtg-clip-row__head-cell:last-child {
  text-align: end;
}

.vtg-clip-row__drag--header {
  pointer-events: none;
  justify-self: center;
}

.vtg-clip-row__drag {
  color: var(--vtg-text-hint);
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  cursor: grab;
}

.vtg-clip-row__drag svg {
  width: 18px;
  height: 18px;
}

.vtg-clip-row__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  max-width: 100%;
  padding: 4px 8px;
  font-weight: 700;
  background: var(--vtg-primary);
  color: #fff;
  border-radius: 8px;
  font-size: 11px;
  letter-spacing: 0.3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vtg-clip-row__label {
  display: inline-block;
  margin-right: 6px;
  color: var(--vtg-text-muted);
}

.vtg-clip-row__time {
  justify-self: stretch;
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.vtg-clip-row__time strong {
  color: var(--vtg-text);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.vtg-clip-row__badge {
  justify-self: center;
  max-width: 100%;
  padding: 4px 8px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid var(--vtg-border);
  font-size: 11px;
  color: var(--vtg-text-secondary);
  white-space: nowrap;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vtg-clip-row__badge--fps {
  color: var(--vtg-primary);
  border-color: var(--vtg-primary-soft);
  background: var(--vtg-primary-tint);
}

.vtg-clip-row__tail {
  justify-self: stretch;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
  width: 100%;
}

.vtg-clip-row__actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.vtg-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--vtg-text-muted);
  cursor: pointer;
}

.vtg-icon-btn:hover:not(:disabled) {
  background: var(--vtg-primary-tint);
  color: var(--vtg-primary);
}

.vtg-icon-btn--danger:hover:not(:disabled) {
  background: #fee2e2;
  color: var(--vtg-danger);
}

.vtg-icon-btn--ghost {
  color: var(--vtg-text-muted);
}

.vtg-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vtg-icon-btn svg {
  width: 16px;
  height: 16px;
}

.vtg-clip-row__folder-icon {
  display: block;
}

.vtg-clip-row__progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  background: var(--vtg-primary);
  transition: width 0.2s ease;
}

.vtg-clip-row__status {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vtg-clip-row__status--ok {
  background: var(--vtg-success-soft);
  color: var(--vtg-success);
}

.vtg-clip-row__status--bad {
  background: #fee2e2;
  color: var(--vtg-danger);
}

.vtg-panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px;
  padding: 28px 20px;
  text-align: center;
  border: 1px dashed #e0e3ea;
  border-radius: 14px;
  background: #f5f6fa;
  box-sizing: border-box;
}

.vtg-panel-empty--tight {
  margin: 12px 12px 16px;
  padding: 22px 16px 20px;
}

.vtg-card > .vtg-panel-empty {
  margin: 12px;
}

.vtg-panel-empty__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.vtg-panel-empty__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
  max-width: 320px;
}

.vtg-panel-empty__icon {
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
}

.vtg-panel-empty__svg {
  width: 72px;
  height: auto;
  opacity: 0.85;
}

.vtg-hint {
  margin: 4px 0 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #c2410c;
  font-size: 13px;
}

.vtg-settings {
  padding: 14px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vtg-settings__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.vtg-settings__title {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--vtg-text);
}

.vtg-chevron--open {
  transform: rotate(180deg);
}

.vtg-settings__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vtg-row {
  display: grid;
  grid-template-columns: 22px 70px 1fr;
  align-items: center;
  gap: 10px;
}

.vtg-row--inline {
  grid-template-columns: 22px auto 1fr auto auto 1fr;
}

.vtg-row--toggle {
  grid-template-columns: 22px 1fr;
}

.vtg-row__icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--vtg-text-muted);
}

.vtg-row__icon svg {
  width: 18px;
  height: 18px;
}

.vtg-row__icon img {
  width: 18px;
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}

.vtg-row__icon--ghost {
  visibility: hidden;
}

.vtg-row__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vtg-text-secondary);
  letter-spacing: 0;
}

.vtg-row__sublabel {
  font-size: 12px;
  color: var(--vtg-text-muted);
  white-space: nowrap;
}

.vtg-row__suffix {
  font-size: 11.5px;
  color: var(--vtg-text-muted);
}

.vtg-row__hint {
  display: block;
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--vtg-text-muted);
  font-weight: 400;
}

.vtg-row__toggle-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.vtg-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.vtg-chip {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--vtg-border);
  background: #ffffff;
  color: var(--vtg-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  min-width: 48px;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.vtg-chip:hover:not(:disabled) {
  border-color: var(--vtg-primary-soft);
  color: var(--vtg-primary);
}

.vtg-chip--active,
.vtg-chip--active:hover {
  background: #fff;
  color: var(--vtg-primary);
  border-color: var(--vtg-primary);
  box-shadow: 0 0 0 2px var(--vtg-primary-soft) inset;
  font-weight: 700;
}

.vtg-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vtg-input {
  border: 1px solid var(--vtg-border);
  border-radius: 8px;
  padding: 0 10px;
  font-size: 14px;
  background: #fff;
  color: var(--vtg-text);
  min-height: 36px;
  box-sizing: border-box;
}

.vtg-input:focus-visible {
  outline: 2px solid var(--vtg-primary);
  outline-offset: 1px;
  border-color: var(--vtg-primary-soft);
}

.vtg-input--num {
  width: 92px;
  text-align: left;
}

.vtg-input--inline-fps {
  width: 64px;
}

.vtg-select {
  border: 1px solid var(--vtg-border);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 14px;
  background: #fff;
  color: var(--vtg-text);
  min-height: 36px;
  width: 100%;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--vtg-text-muted) 50%),
    linear-gradient(135deg, var(--vtg-text-muted) 50%, transparent 50%);
  background-position:
    calc(100% - 14px) 50%,
    calc(100% - 9px) 50%;
  background-size: 5px 5px;
  background-repeat: no-repeat;
  padding-right: 28px;
}

.vtg-select:focus-visible {
  outline: 2px solid var(--vtg-primary);
  outline-offset: 1px;
  border-color: var(--vtg-primary-soft);
}

.vtg-aspect {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--vtg-border);
  background: #ffffff;
  color: var(--vtg-text-muted);
  cursor: pointer;
}

.vtg-aspect--locked {
  color: var(--vtg-primary);
  background: var(--vtg-primary-tint);
  border-color: var(--vtg-primary-soft);
}

.vtg-aspect svg {
  width: 14px;
  height: 14px;
}

.vtg-quality {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vtg-quality__range {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--vtg-primary-soft), var(--vtg-primary));
  outline: none;
}

.vtg-quality__range::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid var(--vtg-primary);
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(99, 102, 241, 0.35);
}

.vtg-quality__range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid var(--vtg-primary);
  cursor: pointer;
}

.vtg-quality__labels {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: var(--vtg-text-muted);
}

.vtg-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.vtg-switch input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.vtg-switch__slider {
  position: absolute;
  inset: 0;
  background: #e2e8f0;
  border-radius: 999px;
  transition: background 0.2s ease;
}

.vtg-switch__slider::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
  transition: transform 0.2s ease;
}

.vtg-switch input:checked + .vtg-switch__slider {
  background: var(--vtg-primary);
}

.vtg-switch input:checked + .vtg-switch__slider::after {
  transform: translateX(18px);
}

.vtg-switch input:disabled + .vtg-switch__slider {
  opacity: 0.5;
}

.vtg-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.vtg-checkbox input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.vtg-checkbox__mark {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--vtg-border-strong);
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.vtg-checkbox__mark::after {
  content: "";
  width: 10px;
  height: 6px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg) translate(1px, -1px);
  opacity: 0;
}

.vtg-checkbox input:checked + .vtg-checkbox__mark {
  background: var(--vtg-primary);
  border-color: var(--vtg-primary);
}

.vtg-checkbox input:checked + .vtg-checkbox__mark::after {
  opacity: 1;
}

.vtg-estimate {
  padding: 14px 16px;
}

.vtg-estimate__title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--vtg-text);
}

.vtg-estimate__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.vtg-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 8px;
  border: 1px solid var(--vtg-border);
  border-radius: 10px;
  background: var(--vtg-surface-soft);
  min-width: 0;
}

.vtg-stat__icon {
  width: 20px;
  height: 20px;
}

.vtg-stat__label {
  font-size: 11.5px;
  color: var(--vtg-text-muted);
}

.vtg-stat__value {
  font-size: 14px;
  color: var(--vtg-text);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.vtg-stat__sub {
  font-size: 10.5px;
  color: var(--vtg-text-hint);
}

.vtg-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 1200px) {
  .vtg-body {
    grid-template-columns: minmax(0, 1fr) minmax(280px, min(420px, 46vw));
  }
  .vtg-estimate__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .vtg-body {
    grid-template-columns: minmax(0, 1fr) minmax(280px, min(380px, 50vw));
  }
}

@media (max-height: 760px) {
  .vtg-player {
    --vtg-preview-max-h: min(44vh, 420px);
  }
}

@media (max-width: 960px) {
  .vtg-body {
    grid-template-columns: 1fr;
  }
  .vtg-rail {
    order: 2;
  }
  .vtg-main {
    order: 1;
  }
  .vtg-clip-row,
  .vtg-clip-row--header {
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vtg-switch__slider,
  .vtg-switch__slider::after,
  .vtg-chip,
  .vtg-btn,
  .vtg-icon-btn {
    transition-duration: 0.01ms !important;
  }
}
</style>
