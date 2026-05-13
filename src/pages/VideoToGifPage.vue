<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
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
  resultSummary,
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
  replaceVideo,
  onVideoMetadataReady,
  updateSelectionStart,
  updateSelectionEnd,
  onPreviewTimeUpdate,
  addCurrentClip,
  removeClip,
  editClip,
  setFpsPreset,
  startConversion,
  openOutputFolder,
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

const tickMarks = computed(() => {
  const total = videoDurationSec.value;
  if (total <= 0) return [] as Array<{ left: number; label: string }>;
  const segments = 4;
  return Array.from({ length: segments + 1 }, (_, i) => {
    const ratio = i / segments;
    return { left: ratio * 100, label: formatTimeAxis(total * ratio) };
  });
});

function onRangeStartInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).valueAsNumber;
  updateSelectionStart(raw / 1000);
}

function onRangeEndInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).valueAsNumber;
  updateSelectionEnd(raw / 1000);
}

function onStartTimeInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).valueAsNumber;
  if (!Number.isFinite(raw)) return;
  updateSelectionStart(raw);
}

function onEndTimeInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).valueAsNumber;
  if (!Number.isFinite(raw)) return;
  updateSelectionEnd(raw);
}

const rangeMaxMs = computed(() => Math.max(1000, Math.round(videoDurationSec.value * 1000)));
const rangeStartMs = computed(() => Math.round(selectionStartSec.value * 1000));
const rangeEndMs = computed(() => Math.round(selectionEndSec.value * 1000));
const rangeFillStyle = computed(() => {
  const total = rangeMaxMs.value || 1;
  const a = (rangeStartMs.value / total) * 100;
  const b = (rangeEndMs.value / total) * 100;
  return { left: `${a}%`, width: `${Math.max(0, b - a)}%` };
});

const playheadStyle = computed(() => {
  if (videoDurationSec.value <= 0) return { left: "0%" };
  const ratio = (previewCurrentSec.value / videoDurationSec.value) * 100;
  return { left: `${Math.min(100, Math.max(0, ratio))}%` };
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
        <div class="vtg-head__meta">
          <span class="vtg-badge">
            <svg viewBox="0 0 24 24" class="vtg-badge__icon" aria-hidden="true">
              <path
                d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3Zm-1.2 14.4-3.4-3.4 1.4-1.4 2 2 4.6-4.6 1.4 1.4-6 6Z"
                fill="currentColor"
              />
            </svg>
            {{ t("pages.videoToGif.safetyBadge") }}
          </span>
          <button
            type="button"
            class="vtg-theme-toggle"
            :aria-label="t('pages.videoToGif.themeToggleAria')"
            title="Theme"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M21 12.8A9 9 0 0 1 11.2 3a7 7 0 1 0 9.8 9.8Z"
                fill="currentColor"
              />
            </svg>
          </button>
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
                :class="{ 'vtg-player__play--hidden': !isPaused }"
                :aria-label="t('pages.videoToGif.preview.playAria')"
                @click="togglePlay"
              >
                <svg viewBox="0 0 64 64" aria-hidden="true">
                  <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.65)" stroke-width="2" />
                  <path d="M26 20 L46 32 L26 44 Z" fill="#ffffff" />
                </svg>
              </button>
            </div>

            <div class="vtg-timeline">
              <div class="vtg-timeline__ticks" aria-hidden="true">
                <div
                  v-for="(tick, idx) in tickMarks"
                  :key="idx"
                  class="vtg-timeline__tick"
                  :style="{ left: tick.left + '%' }"
                >
                  <span>{{ tick.label }}</span>
                </div>
              </div>
              <div
                class="vtg-timeline__track"
                :aria-label="t('pages.videoToGif.preview.rangeAria')"
              >
                <div class="vtg-timeline__strip" aria-hidden="true" />
                <div class="vtg-timeline__fill" :style="rangeFillStyle" />
                <div class="vtg-timeline__playhead" :style="playheadStyle" aria-hidden="true" />
                <input
                  type="range"
                  class="vtg-timeline__handle vtg-timeline__handle--start"
                  min="0"
                  :max="rangeMaxMs"
                  step="100"
                  :value="rangeStartMs"
                  :disabled="isProcessing"
                  :aria-label="t('pages.videoToGif.preview.startLabel')"
                  @input="onRangeStartInput"
                />
                <input
                  type="range"
                  class="vtg-timeline__handle vtg-timeline__handle--end"
                  min="0"
                  :max="rangeMaxMs"
                  step="100"
                  :value="rangeEndMs"
                  :disabled="isProcessing"
                  :aria-label="t('pages.videoToGif.preview.endLabel')"
                  @input="onRangeEndInput"
                />
              </div>
              <div class="vtg-timeline__meta">
                <div class="vtg-meta-cell">
                  <svg class="vtg-meta-cell__icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Zm1-13h-2v6l5 3 1-1.7-4-2.3Z" fill="currentColor" />
                  </svg>
                  <label class="vtg-meta-cell__label" for="vtg-start">
                    {{ t("pages.videoToGif.preview.startLabel") }}
                  </label>
                  <input
                    id="vtg-start"
                    type="number"
                    step="0.1"
                    min="0"
                    :max="videoDurationSec"
                    class="vtg-meta-cell__input"
                    :value="selectionStartSec.toFixed(1)"
                    :disabled="isProcessing"
                    @change="onStartTimeInput"
                  />
                  <span class="vtg-meta-cell__time">{{ formatTimeCode(selectionStartSec) }}</span>
                </div>
                <div class="vtg-meta-cell">
                  <label class="vtg-meta-cell__label" for="vtg-end">{{ t("pages.videoToGif.preview.endLabel") }}</label>
                  <input
                    id="vtg-end"
                    type="number"
                    step="0.1"
                    min="0"
                    :max="videoDurationSec"
                    class="vtg-meta-cell__input"
                    :value="selectionEndSec.toFixed(1)"
                    :disabled="isProcessing"
                    @change="onEndTimeInput"
                  />
                  <span class="vtg-meta-cell__time">{{ formatTimeCode(selectionEndSec) }}</span>
                </div>
                <div class="vtg-meta-cell">
                  <svg class="vtg-meta-cell__icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Zm1-13h-2v6l5 3 1-1.7-4-2.3Z" fill="currentColor" />
                  </svg>
                  <span class="vtg-meta-cell__label">{{ t("pages.videoToGif.preview.durationLabel") }}</span>
                  <strong class="vtg-meta-cell__duration">{{ selectionDurationSec.toFixed(1) }} {{ t("pages.videoToGif.preview.durationUnit") }}</strong>
                </div>
                <button type="button" class="vtg-btn vtg-btn--ghost vtg-btn--small" :disabled="isProcessing" @click="replaceVideo">
                  {{ t("pages.videoToGif.preview.replaceVideo") }}
                </button>
              </div>
            </div>
          </section>

          <section v-if="hasVideo" class="vtg-card vtg-clips">
            <div class="vtg-clips__head">
              <div class="vtg-clips__title-wrap">
                <h3 class="vtg-clips__title">{{ t("pages.videoToGif.clips.title") }}</h3>
                <span class="vtg-clips__count">{{ t("pages.videoToGif.clips.countTpl", { count: clips.length }) }}</span>
              </div>
              <button type="button" class="vtg-btn vtg-btn--primary vtg-btn--small" :disabled="isProcessing" @click="addCurrentClip">
                <svg viewBox="0 0 24 24" class="vtg-btn__icon" aria-hidden="true">
                  <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
                </svg>
                {{ t("pages.videoToGif.clips.addCurrent") }}
              </button>
            </div>

            <ul v-if="clips.length > 0" class="vtg-clip-list">
              <li v-for="(clip, idx) in clips" :key="clip.id" class="vtg-clip-row">
                <div class="vtg-clip-row__drag" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M9 7h2v2H9V7Zm4 0h2v2h-2V7ZM9 11h2v2H9v-2Zm4 0h2v2h-2v-2ZM9 15h2v2H9v-2Zm4 0h2v2h-2v-2Z" fill="currentColor" /></svg>
                </div>
                <span class="vtg-clip-row__chip">
                  {{ t("pages.videoToGif.clips.chipPrefix") }} {{ (idx + 1).toString().padStart(2, '0') }}
                </span>
                <div class="vtg-clip-row__time">
                  <span class="vtg-clip-row__label">{{ t("pages.videoToGif.clips.startCol") }}</span>
                  <strong>{{ formatTimeCode(clip.startSec) }}</strong>
                </div>
                <div class="vtg-clip-row__time">
                  <span class="vtg-clip-row__label">{{ t("pages.videoToGif.clips.endCol") }}</span>
                  <strong>{{ formatTimeCode(clip.endSec) }}</strong>
                </div>
                <div class="vtg-clip-row__time">
                  <span class="vtg-clip-row__label">{{ t("pages.videoToGif.clips.durationCol") }}</span>
                  <strong>{{ formatClipDuration(clip) }}</strong>
                </div>
                <span class="vtg-clip-row__badge">
                  {{ t("pages.videoToGif.clips.sizeUnit", { w: clip.width, h: clip.height }) }}
                </span>
                <span class="vtg-clip-row__badge vtg-clip-row__badge--fps">
                  {{ t("pages.videoToGif.clips.fpsUnit", { fps: clip.fps }) }}
                </span>
                <div class="vtg-clip-row__actions">
                  <button
                    type="button"
                    class="vtg-icon-btn"
                    :aria-label="t('pages.videoToGif.clips.editAria')"
                    :disabled="isProcessing"
                    @click="editClip(clip.id)"
                  >
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.99-1.66Z" fill="currentColor" /></svg>
                  </button>
                  <button
                    type="button"
                    class="vtg-icon-btn vtg-icon-btn--danger"
                    :aria-label="t('pages.videoToGif.clips.deleteAria')"
                    :disabled="isProcessing"
                    @click="removeClip(clip.id)"
                  >
                    <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Zm9-3v1h4v2H5V5h4V4h6Z" fill="currentColor" /></svg>
                  </button>
                </div>
                <div v-if="clip.status === 'running'" class="vtg-clip-row__progress" :style="{ width: clip.progress + '%' }" />
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
              </li>
            </ul>

            <p class="vtg-clips__tip">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 5a1.5 1.5 0 1 1-1.5 1.5A1.5 1.5 0 0 1 12 7Zm2 11h-4v-1h1v-5h-1v-1h3v6h1Z" fill="currentColor" />
              </svg>
              {{ t("pages.videoToGif.clips.emptyTip") }}
            </p>
          </section>

          <section v-else class="vtg-card vtg-empty">
            <div class="vtg-empty__art" aria-hidden="true">
              <img src="/resources/toGif/Image-5_50.png" alt="" />
            </div>
            <div class="vtg-empty__text">
              <strong>{{ t("pages.videoToGif.emptyVideo.title") }}</strong>
              <p>{{ t("pages.videoToGif.emptyVideo.desc") }}</p>
            </div>
          </section>

          <section v-if="resultSummary" class="vtg-card vtg-result">
            <h4>{{ t("pages.videoToGif.result.title") }}</h4>
            <div class="vtg-result__grid">
              <div><span>{{ t("pages.videoToGif.result.total") }}</span><strong>{{ resultSummary.total }}</strong></div>
              <div><span>{{ t("pages.videoToGif.result.success") }}</span><strong class="ok">{{ resultSummary.success }}</strong></div>
              <div><span>{{ t("pages.videoToGif.result.failed") }}</span><strong class="bad">{{ resultSummary.failed }}</strong></div>
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
                  <svg viewBox="0 0 24 24"><path d="M9 21H7v-7H4l8-8 8 8h-3v7h-2v-7H9v7Z" fill="currentColor" /></svg>
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
                  <svg viewBox="0 0 24 24"><path d="M5 4h14v3l-5 5 5 5v3H5v-3l5-5-5-5V4Z" fill="currentColor" /></svg>
                </span>
                <div class="vtg-row__toggle-body">
                  <div>
                    <span class="vtg-row__label">{{ t("pages.videoToGif.settings.reduceSize") }}</span>
                    <span class="vtg-row__hint" v-if="hasVideo">{{ t("pages.videoToGif.settings.smartCompressLabel") }}</span>
                    <span class="vtg-row__hint" v-else>{{ t("pages.videoToGif.settings.reduceSizeHint") }}</span>
                  </div>
                  <label v-if="hasVideo" class="vtg-checkbox">
                    <input
                      type="checkbox"
                      v-model="reduceSize"
                      :disabled="isProcessing"
                      :aria-label="t('pages.videoToGif.settings.reduceSize')"
                    />
                    <span class="vtg-checkbox__mark" />
                  </label>
                  <label v-else class="vtg-switch">
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
              <svg viewBox="0 0 24 24" class="vtg-btn__icon" aria-hidden="true">
                <path d="M9 4v3l8-3-8-3v3H4v18h2V4h3Zm10 4-4 4 4 4v-3h-6v-2h6V8Z" fill="currentColor" />
              </svg>
              {{ isProcessing ? t("pages.videoToGif.footer.processing") : t("pages.videoToGif.footer.start") }}
            </button>
            <button
              type="button"
              class="vtg-btn vtg-btn--ghost vtg-btn--block"
              :disabled="isProcessing"
              @click="openOutputFolder"
            >
              <svg viewBox="0 0 24 24" class="vtg-btn__icon" aria-hidden="true">
                <path d="M5 20h14v-2H5v2Zm7-18-5 5h3v6h4v-6h3l-5-5Z" fill="currentColor" />
              </svg>
              {{ t("pages.videoToGif.footer.exportGif") }}
            </button>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vtg-page {
  --vtg-shell-pad-x: clamp(12px, 2.8vw, 28px);
  --vtg-bg: #f5f7fb;
  --vtg-surface: #ffffff;
  --vtg-surface-soft: #f7f9ff;
  --vtg-border: #e4e8f1;
  --vtg-border-strong: #d6dce8;
  --vtg-text: #1f2740;
  --vtg-text-secondary: #4a5475;
  --vtg-text-muted: #7a849c;
  --vtg-text-hint: #9aa3bb;
  --vtg-primary: #2563eb;
  --vtg-primary-strong: #1d4ed8;
  --vtg-primary-soft: #e0ecff;
  --vtg-primary-tint: #eef4ff;
  --vtg-danger: #ef4444;
  --vtg-success: #16a34a;
  --vtg-success-soft: #dcfce7;
  --vtg-purple-from: #8b5cf6;
  --vtg-purple-to: #6366f1;
  --vtg-shadow-card: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04);
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
  max-width: 100%;
  margin: 0 auto;
  padding: 18px var(--vtg-shell-pad-x) 24px;
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
  font-size: 20px;
  line-height: 1.25;
  font-weight: 700;
  color: var(--vtg-text);
}

.vtg-head__desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vtg-text-secondary);
}

.vtg-head__meta {
  display: flex;
  align-items: center;
  gap: 10px;
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

.vtg-theme-toggle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--vtg-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.vtg-theme-toggle:hover {
  background: var(--vtg-primary-tint);
  color: var(--vtg-primary);
}

.vtg-theme-toggle svg {
  width: 18px;
  height: 18px;
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
  font-size: 13px;
  font-weight: 600;
  color: var(--vtg-text);
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
  grid-template-columns: auto 1fr auto auto 1fr;
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
  border-radius: 14px;
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
  border-color: var(--vtg-primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.vtg-upload__inner {
  border: 2px dashed var(--vtg-border-strong);
  border-radius: 12px;
  padding: 36px 22px 28px;
  text-align: center;
  background: var(--vtg-primary-tint);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.vtg-upload__art {
  width: 150px;
  height: 96px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.vtg-upload__art img {
  width: 100%;
  height: auto;
}

.vtg-upload__title {
  margin: 6px 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: var(--vtg-text);
}

.vtg-upload__desc {
  margin: 0;
  font-size: 13px;
  color: var(--vtg-text-muted);
}

.vtg-upload__hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--vtg-text-hint);
}

.vtg-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--vtg-primary-tint);
  border: 1px solid var(--vtg-primary-soft);
  color: var(--vtg-text-secondary);
  font-size: 13px;
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

.vtg-btn__icon {
  width: 16px;
  height: 16px;
}

.vtg-btn--primary {
  background: var(--vtg-primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28);
}

.vtg-btn--primary:hover:not(:disabled) {
  background: var(--vtg-primary-strong);
}

.vtg-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.vtg-btn--ghost {
  background: #fff;
  color: var(--vtg-text-secondary);
  border: 1px solid var(--vtg-border-strong);
}

.vtg-btn--ghost:hover:not(:disabled) {
  border-color: var(--vtg-primary-soft);
  color: var(--vtg-primary);
}

.vtg-btn--ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vtg-btn--large {
  padding: 11px 22px;
  font-size: 14px;
  border-radius: 10px;
}

.vtg-btn--small {
  padding: 7px 14px;
  font-size: 12.5px;
}

.vtg-btn--block {
  width: 100%;
  padding: 12px 18px;
  font-size: 14px;
}

.vtg-player {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vtg-player__stage {
  position: relative;
  width: 100%;
  max-width: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: #1f2740;
  aspect-ratio: 16 / 9;
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
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.vtg-player__play svg {
  width: 64px;
  height: 64px;
}

.vtg-player__play--hidden {
  opacity: 0;
  pointer-events: none;
}

.vtg-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vtg-timeline__ticks {
  position: relative;
  height: 18px;
}

.vtg-timeline__tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 11px;
  color: var(--vtg-text-muted);
  font-variant-numeric: tabular-nums;
}

.vtg-timeline__tick:first-child {
  transform: translateX(0);
}

.vtg-timeline__tick:last-child {
  transform: translateX(-100%);
}

.vtg-timeline__track {
  position: relative;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  background: #0f1a36;
}

.vtg-timeline__strip {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0 1px, transparent 1px 100%) 0 0/calc(100% / 12) 100%,
    linear-gradient(120deg, #1d2b5b 0%, #2a3a78 35%, #6c44d6 70%, #3a3a86 100%);
  opacity: 0.95;
}

.vtg-timeline__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(37, 99, 235, 0.22);
  border-left: 2px solid var(--vtg-primary);
  border-right: 2px solid var(--vtg-primary);
}

.vtg-timeline__playhead {
  position: absolute;
  top: -6px;
  bottom: -6px;
  width: 2px;
  background: rgba(255, 255, 255, 0.85);
  pointer-events: none;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.25);
}

.vtg-timeline__handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  appearance: none;
  background: transparent;
  pointer-events: none;
}

.vtg-timeline__handle::-webkit-slider-runnable-track {
  background: transparent;
  height: 100%;
}

.vtg-timeline__handle::-moz-range-track {
  background: transparent;
  height: 100%;
}

.vtg-timeline__handle::-webkit-slider-thumb {
  appearance: none;
  pointer-events: auto;
  width: 16px;
  height: 56px;
  border-radius: 6px;
  background: var(--vtg-primary);
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.5);
  cursor: ew-resize;
}

.vtg-timeline__handle::-moz-range-thumb {
  pointer-events: auto;
  width: 16px;
  height: 56px;
  border-radius: 6px;
  background: var(--vtg-primary);
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.5);
  cursor: ew-resize;
}

.vtg-timeline__meta {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.vtg-meta-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--vtg-text-secondary);
}

.vtg-meta-cell__icon {
  width: 14px;
  height: 14px;
  color: var(--vtg-text-muted);
}

.vtg-meta-cell__label {
  color: var(--vtg-text-muted);
}

.vtg-meta-cell__input {
  width: 78px;
  padding: 6px 8px;
  border: 1px solid var(--vtg-border);
  border-radius: 8px;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: var(--vtg-text);
  background: #fff;
}

.vtg-meta-cell__input:focus-visible {
  outline: 2px solid var(--vtg-primary);
  outline-offset: 1px;
  border-color: var(--vtg-primary-soft);
}

.vtg-meta-cell__time {
  display: none;
}

.vtg-meta-cell__duration {
  color: var(--vtg-primary);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
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
  font-weight: 700;
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
}

.vtg-clip-row {
  position: relative;
  display: grid;
  grid-template-columns: 18px 64px 1fr 1fr 1fr auto auto auto;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--vtg-surface-soft);
  border: 1px solid var(--vtg-border);
  font-size: 12.5px;
  color: var(--vtg-text-secondary);
  overflow: hidden;
}

.vtg-clip-row__drag {
  color: var(--vtg-text-hint);
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  padding: 4px 10px;
  font-weight: 700;
  background: var(--vtg-primary);
  color: #fff;
  border-radius: 8px;
  font-size: 12px;
  letter-spacing: 0.3px;
}

.vtg-clip-row__label {
  display: inline-block;
  margin-right: 6px;
  color: var(--vtg-text-muted);
}

.vtg-clip-row__time strong {
  color: var(--vtg-text);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.vtg-clip-row__badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid var(--vtg-border);
  font-size: 11.5px;
  color: var(--vtg-text-secondary);
  white-space: nowrap;
}

.vtg-clip-row__badge--fps {
  color: var(--vtg-primary);
  border-color: var(--vtg-primary-soft);
  background: var(--vtg-primary-tint);
}

.vtg-clip-row__actions {
  display: inline-flex;
  gap: 4px;
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
}

.vtg-clip-row__status--ok {
  background: var(--vtg-success-soft);
  color: var(--vtg-success);
}

.vtg-clip-row__status--bad {
  background: #fee2e2;
  color: var(--vtg-danger);
}

.vtg-clips__tip {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--vtg-surface-soft);
  border: 1px dashed var(--vtg-border);
  color: var(--vtg-text-muted);
  font-size: 12.5px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.vtg-clips__tip svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--vtg-primary);
}

.vtg-empty {
  padding: 24px 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  flex: 1;
  min-height: 160px;
}

.vtg-empty__art {
  width: 88px;
  height: 88px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.vtg-empty__art img {
  width: 100%;
  height: auto;
  opacity: 0.7;
}

.vtg-empty__text strong {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--vtg-text);
}

.vtg-empty__text p {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--vtg-text-muted);
}

.vtg-result {
  padding: 12px 14px;
  border-color: #bbf7d0;
  background: rgba(240, 253, 244, 0.7);
}

.vtg-result h4 {
  margin: 0 0 8px;
  color: var(--vtg-success);
  font-size: 13px;
}

.vtg-result__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.vtg-result__grid > div {
  padding: 8px 10px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
}

.vtg-result__grid span {
  font-size: 11.5px;
  color: var(--vtg-text-muted);
  display: block;
}

.vtg-result__grid strong {
  font-size: 16px;
  color: var(--vtg-text);
}

.vtg-result__grid strong.ok {
  color: var(--vtg-success);
}

.vtg-result__grid strong.bad {
  color: var(--vtg-danger);
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
  font-size: 15px;
  font-weight: 700;
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

.vtg-row__icon--ghost {
  visibility: hidden;
}

.vtg-row__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vtg-text);
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
  font-size: 12.5px;
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
  padding: 7px 10px;
  font-size: 13px;
  background: #fff;
  color: var(--vtg-text);
  min-height: 32px;
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
  font-size: 13px;
  background: #fff;
  color: var(--vtg-text);
  min-height: 32px;
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
  background: linear-gradient(90deg, #93c5fd, var(--vtg-primary));
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
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.5);
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
  background: #d6dce8;
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
  font-size: 14px;
  font-weight: 700;
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 1200px) {
  .vtg-body {
    grid-template-columns: minmax(0, 1fr) minmax(280px, min(520px, 46vw));
  }
  .vtg-estimate__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .vtg-body {
    grid-template-columns: minmax(0, 1fr) minmax(280px, min(480px, 50vw));
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
  .vtg-clip-row {
    grid-template-columns: 18px 64px 1fr 1fr;
    grid-auto-flow: row;
    row-gap: 6px;
  }
  .vtg-clip-row__badge {
    justify-self: start;
  }
  .vtg-clip-row__actions {
    justify-self: end;
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
