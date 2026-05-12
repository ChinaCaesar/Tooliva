<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { ROUTE_PATHS } from "@/config/constants";
import type { WatermarkPosition } from "@/bridge/tauriClient";
import { useSettingsStore } from "@/stores/settings.store";
import {
  useImageWatermarkActions,
  type WatermarkItem
} from "@/pages/image-watermark/composables/useImageWatermarkActions";

const router = useRouter();
const { t } = useI18n();
const { outputFileNamingRule } = storeToRefs(useSettingsStore());

/** 九宫格预设方位（不含自定义拖拽），顺序：上排 → 中排 → 下排 */
const POSITION_PRESETS: readonly { value: Exclude<WatermarkPosition, "custom">; key: string }[] = [
  { value: "topLeft", key: "topLeft" },
  { value: "topCenter", key: "topCenter" },
  { value: "topRight", key: "topRight" },
  { value: "middleLeft", key: "middleLeft" },
  { value: "center", key: "center" },
  { value: "middleRight", key: "middleRight" },
  { value: "bottomLeft", key: "bottomLeft" },
  { value: "bottomCenter", key: "bottomCenter" },
  { value: "bottomRight", key: "bottomRight" }
];

const {
  items,
  visibleItems,
  hiddenItemCount,
  isProcessing,
  isDropActive,
  hintMessage,
  effectiveOutputDirectory,
  mode,
  text,
  fontSize,
  textColor,
  imagePath,
  watermarkImageUrl,
  textWatermarkPreviewUrl,
  imageScalePercent,
  opacity,
  margin,
  rotation,
  position,
  resultSummary,
  canStart,
  formatElapsed,
  previewImageUrl,
  previewRect,
  previewStyle,
  setPreviewCanvasRef,
  pickImages,
  pickSourceDirectory,
  pickOutputDirectory,
  openEffectiveOutputDirectory,
  pickWatermarkImage,
  handlePreviewImageLoad,
  handlePreviewImageError,
  handleWatermarkImageError,
  handlePreviewStagePointerDown,
  handleOverlayPointerDown,
  handlePreviewPointerUp,
  startWatermark,
  clearItems,
  removeItem,
  handleDrop,
  onDragOver,
  onDragLeave
} = useImageWatermarkActions();

const watermarkTypeLabel = computed(() =>
  mode.value === "text" ? t("pages.imageWatermark.settings.textMode") : t("pages.imageWatermark.settings.imageMode")
);

const outputNamingLabel = computed(() =>
  outputFileNamingRule.value === "timestamp"
    ? t("pages.settings.dashboard.namingTimestamp")
    : t("pages.settings.dashboard.namingOriginal")
);

function formatDimensionCell(item: WatermarkItem): string {
  if (!item.originalSize) return "—";
  const parts = item.originalSize.split(/\s*→\s*/);
  return parts[0]?.trim() || item.originalSize;
}

function itemPreviewSrc(path: string): string {
  if (!path || !isTauri()) return "";
  try {
    return convertFileSrc(path);
  } catch {
    return "";
  }
}

function goOutputNamingSettings(): void {
  router.push(ROUTE_PATHS.settings).catch(() => {
    /* 重复导航 */
  });
}
</script>

<template>
  <div class="image-watermark-page">
    <div class="page-shell">
      <main class="page-main" role="main">
        <div class="workspace-grid">
          <div class="main-column">
            <header class="workspace-head">
              <div class="workspace-head__text">
                <p class="workspace-head__desc">{{ t("pages.imageWatermark.description") }}</p>
              </div>
              
            </header>

            <div class="main-column__body">
              <div class="preview-shell">
                <div
                  class="preview-stage"
                  :class="{ 'preview-stage--empty': !previewImageUrl }"
                  @pointerdown="handlePreviewStagePointerDown"
                  @pointerup="handlePreviewPointerUp"
                  @pointercancel="handlePreviewPointerUp"
                  @drop="handleDrop"
                  @dragover="onDragOver"
                  @dragleave="onDragLeave"
                >
                  <div
                    v-if="previewImageUrl"
                    :ref="setPreviewCanvasRef"
                    class="preview-canvas"
                    :style="{ width: `${previewRect.width}px`, height: `${previewRect.height}px` }"
                  >
                    <img
                      :src="previewImageUrl"
                      alt=""
                      class="preview-image"
                      @load="handlePreviewImageLoad"
                      @error="handlePreviewImageError"
                    />
                    <div
                      class="preview-overlay"
                      :class="`preview-overlay--${mode}`"
                      :style="previewStyle"
                      @pointerdown.stop="handleOverlayPointerDown"
                    >
                      <template v-if="mode === 'text'">
                        <img :src="textWatermarkPreviewUrl" alt="" class="preview-overlay__text-image" />
                      </template>
                      <template v-else>
                        <img
                          v-if="watermarkImageUrl"
                          :src="watermarkImageUrl"
                          alt=""
                          class="preview-overlay__logo"
                          @error="handleWatermarkImageError"
                        />
                        <span v-else class="preview-overlay__placeholder">{{ t("pages.imageWatermark.preview.imagePlaceholder") }}</span>
                      </template>
                    </div>
                  </div>
                  <div v-else class="upload-zone" :class="{ 'upload-zone--active': isDropActive }">
                    <div class="upload-zone__icon" aria-hidden="true">
                      <svg viewBox="0 0 80 64" class="upload-zone__svg">
                        <rect x="6" y="14" width="36" height="28" rx="4" fill="#e0e7ff" stroke="#6366f1" stroke-width="1.5" />
                        <rect x="30" y="22" width="36" height="28" rx="4" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5" />
                        <circle cx="58" cy="18" r="12" fill="#2563eb" />
                        <path d="M58 13v10M53 18h10" stroke="#fff" stroke-width="2" stroke-linecap="round" />
                      </svg>
                    </div>
                    <strong class="upload-zone__title">{{ t("pages.imageWatermark.upload.dropTitle") }}</strong>
                    <p class="upload-zone__desc">{{ t("pages.imageWatermark.upload.dropDesc") }}</p>
                    <div class="upload-zone__actions">
                      <button type="button" class="btn btn--primary" @click="pickImages">
                        {{ t("pages.imageWatermark.source.pickImages") }}
                      </button>
                      <button type="button" class="btn btn--secondary" @click="pickSourceDirectory">
                        {{ t("pages.imageWatermark.source.pickDirectory") }}
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="hintMessage" class="preview-hint" role="status">{{ hintMessage }}</p>
              </div>

              <div v-if="previewImageUrl" class="upload-strip">
                <button type="button" class="btn btn--primary btn--sm" @click="pickImages">
                  {{ t("pages.imageWatermark.source.pickImages") }}
                </button>
                <button type="button" class="btn btn--secondary btn--sm" @click="pickSourceDirectory">
                  {{ t("pages.imageWatermark.source.pickDirectory") }}
                </button>
              </div>

              <section class="list-card" aria-labelledby="watermark-list-heading">
                <div class="list-card__head">
                  <h3 id="watermark-list-heading" class="list-card__title">
                    {{ t("pages.imageWatermark.list.title") }} ({{ items.length }})
                  </h3>
                  <div v-if="items.length > 0" class="list-card__actions">
                    <button type="button" class="btn btn--secondary btn--sm" :disabled="isProcessing" @click="clearItems">
                      {{ t("pages.imageWatermark.clearList") }}
                    </button>
                    <button
                      type="button"
                      class="btn btn--danger btn--sm"
                      disabled
                      :title="t('pages.imageWatermark.list.deleteSelectedHint')"
                      :aria-label="t('pages.imageWatermark.list.deleteSelectedHint')"
                    >
                      {{ t("pages.imageWatermark.list.deleteSelected") }}
                    </button>
                  </div>
                </div>

                <p v-if="hiddenItemCount > 0" class="list-card__tip" role="status">
                  {{ t("pages.imageWatermark.listOverflowTip", { count: hiddenItemCount }) }}
                </p>

                <div v-if="resultSummary" class="result-inline">
                  <h4 class="result-inline__title">{{ t("pages.imageWatermark.result.title") }}</h4>
                  <div class="result-inline__grid">
                    <div class="result-inline__cell">
                      <span class="result-inline__label">{{ t("pages.imageWatermark.result.total") }}</span>
                      <strong>{{ resultSummary.total }}</strong>
                    </div>
                    <div class="result-inline__cell">
                      <span class="result-inline__label">{{ t("pages.imageWatermark.result.success") }}</span>
                      <strong class="result-inline__ok">{{ resultSummary.success }}</strong>
                    </div>
                    <div class="result-inline__cell">
                      <span class="result-inline__label">{{ t("pages.imageWatermark.result.failed") }}</span>
                      <strong class="result-inline__bad">{{ resultSummary.failed }}</strong>
                    </div>
                    <div class="result-inline__cell">
                      <span class="result-inline__label">{{ t("pages.imageWatermark.result.elapsed") }}</span>
                      <strong>{{ formatElapsed(resultSummary.elapsedMs) }}</strong>
                    </div>
                  </div>
                </div>

                <div class="list-card__body">
                  <div v-if="items.length === 0" class="list-empty">
                    <div class="list-empty__icon" aria-hidden="true">
                      <svg viewBox="0 0 80 64" class="list-empty__svg">
                        <rect x="10" y="16" width="34" height="26" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
                        <rect x="32" y="24" width="34" height="26" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
                        <circle cx="56" cy="20" r="10" fill="#e2e8f0" />
                        <path d="M56 16v8M52 20h8" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" />
                      </svg>
                    </div>
                    <p class="list-empty__title">{{ t("pages.imageWatermark.list.emptyTitle") }}</p>
                    <p class="list-empty__desc">{{ t("pages.imageWatermark.list.emptyDesc") }}</p>
                  </div>

                  <div v-else class="table-wrap">
                    <table class="task-table">
                      <thead>
                        <tr>
                          <th scope="col">{{ t("pages.imageWatermark.list.table.fileName") }}</th>
                          <th scope="col">{{ t("pages.imageWatermark.list.table.dimensions") }}</th>
                          <th scope="col">{{ t("pages.imageWatermark.list.table.fileSize") }}</th>
                          <th scope="col">{{ t("pages.imageWatermark.list.table.watermarkType") }}</th>
                          <th scope="col">{{ t("pages.imageWatermark.list.table.preview") }}</th>
                          <th scope="col">{{ t("pages.imageWatermark.list.table.status") }}</th>
                          <th scope="col" class="task-table__col-action">{{ t("pages.imageWatermark.list.table.action") }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in visibleItems" :key="item.id">
                          <td class="task-table__cell-name" :title="item.inputPath">
                            <span class="task-table__name">{{ item.fileName }}</span>
                            <p v-if="item.error" class="task-table__err">{{ item.error }}</p>
                            <p v-if="item.outputPath" class="task-table__out">{{ item.outputPath }}</p>
                          </td>
                          <td class="task-table__cell-muted">{{ formatDimensionCell(item) }}</td>
                          <td class="task-table__cell-muted" :title="t('pages.imageWatermark.list.table.fileSizeHint')">—</td>
                          <td>{{ watermarkTypeLabel }}</td>
                          <td>
                            <div class="task-table__thumb">
                              <img
                                v-if="itemPreviewSrc(item.inputPath)"
                                :src="itemPreviewSrc(item.inputPath)"
                                alt=""
                                class="task-table__thumb-img"
                              />
                              <span v-else class="task-table__thumb-ph" aria-hidden="true" />
                            </div>
                          </td>
                          <td>
                            <div class="task-table__status-cell">
                              <span
                                class="task-table__status"
                                :class="{
                                  'task-table__status--ok': item.status === 'completed',
                                  'task-table__status--bad': item.status === 'failed'
                                }"
                              >
                                {{ t(`pages.imageWatermark.status.${item.status}`) }}
                              </span>
                              <div class="task-table__progress task-table__progress--inline">
                                <div
                                  class="task-table__progress-bar"
                                  role="progressbar"
                                  :aria-valuenow="item.progress"
                                  aria-valuemin="0"
                                  aria-valuemax="100"
                                >
                                  <span class="task-table__progress-fill" :style="{ width: `${item.progress}%` }" />
                                </div>
                                <span class="task-table__progress-text">{{ item.progress }}%</span>
                              </div>
                            </div>
                          </td>
                          <td class="task-table__col-action">
                            <button type="button" class="btn btn--link" :disabled="isProcessing" @click="removeItem(item.id)">
                              {{ t("pages.imageWatermark.remove") }}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div
                      v-for="item in visibleItems"
                      :key="`m-${item.id}`"
                      class="task-table-mobile"
                    >
                      <div class="task-table-mobile__row">
                        <div class="task-table-mobile__thumb-wrap">
                          <img
                            v-if="itemPreviewSrc(item.inputPath)"
                            :src="itemPreviewSrc(item.inputPath)"
                            alt=""
                            class="task-table-mobile__thumb"
                          />
                          <span v-else class="task-table-mobile__thumb-ph" aria-hidden="true" />
                        </div>
                        <div class="task-table-mobile__main">
                          <strong class="task-table-mobile__name">{{ item.fileName }}</strong>
                          <div class="task-table-mobile__meta">
                            {{ formatDimensionCell(item) }} · {{ watermarkTypeLabel }}
                          </div>
                        </div>
                        <span
                          class="task-table__status"
                          :class="{
                            'task-table__status--ok': item.status === 'completed',
                            'task-table__status--bad': item.status === 'failed'
                          }"
                        >
                          {{ t(`pages.imageWatermark.status.${item.status}`) }}
                        </span>
                      </div>
                      <div class="task-table__progress task-table__progress--inline">
                        <div class="task-table__progress-bar" role="progressbar" :aria-valuenow="item.progress" aria-valuemin="0" aria-valuemax="100">
                          <span class="task-table__progress-fill" :style="{ width: `${item.progress}%` }" />
                        </div>
                        <span class="task-table__progress-text">{{ item.progress }}%</span>
                      </div>
                      <p v-if="item.outputPath" class="task-table-mobile__path">{{ item.outputPath }}</p>
                      <p v-if="item.error" class="task-table-mobile__err">{{ item.error }}</p>
                      <div class="task-table-mobile__actions">
                        <button type="button" class="btn btn--link" :disabled="isProcessing" @click="removeItem(item.id)">
                          {{ t("pages.imageWatermark.remove") }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <aside class="settings-aside" aria-labelledby="watermark-settings-heading">
            <div class="watermark-settings">
              <h2 id="watermark-settings-heading" class="watermark-settings__title">{{ t("pages.imageWatermark.settings.sidebarTitle") }}</h2>

              <p class="settings-section-label">{{ t("pages.imageWatermark.settings.sectionWatermarkType") }}</p>
              <div class="mode-options" role="radiogroup" :aria-label="t('pages.imageWatermark.settings.mode')">
                <label class="mode-option" :class="{ 'mode-option--active': mode === 'text' }">
                  <input v-model="mode" type="radio" value="text" />
                  <span>{{ t("pages.imageWatermark.settings.textMode") }}</span>
                </label>
                <label class="mode-option" :class="{ 'mode-option--active': mode === 'image' }">
                  <input v-model="mode" type="radio" value="image" />
                  <span>{{ t("pages.imageWatermark.settings.imageMode") }}</span>
                </label>
              </div>

              <template v-if="mode === 'text'">
                <div class="setting-group setting-group--wide">
                  <label class="setting-label" for="watermark-text">{{ t("pages.imageWatermark.settings.text") }}</label>
                  <input id="watermark-text" v-model="text" type="text" class="text-input" :placeholder="t('pages.imageWatermark.settings.textPlaceholder')" />
                </div>

                <p class="settings-section-label">{{ t("pages.imageWatermark.settings.sectionTypography") }}</p>
                <div class="settings-typography-row">
                  <div class="setting-group">
                    <label class="setting-label" for="watermark-font-family">{{ t("pages.imageWatermark.settings.fontFamilyLabel") }}</label>
                    <select id="watermark-font-family" class="text-input text-input--select" disabled :title="t('pages.imageWatermark.settings.fontFamilyHint')">
                      <option value="default">{{ t("pages.imageWatermark.settings.fontFamilyValue") }}</option>
                    </select>
                  </div>
                  <div class="setting-group">
                    <label class="setting-label" for="watermark-font-size">{{ t("pages.imageWatermark.settings.fontSize") }}</label>
                    <input id="watermark-font-size" v-model.number="fontSize" type="number" min="12" max="96" class="text-input" />
                  </div>
                  <div class="setting-group setting-group--color">
                    <label class="setting-label" for="watermark-text-color">{{ t("pages.imageWatermark.settings.textColor") }}</label>
                    <input id="watermark-text-color" v-model="textColor" type="color" class="color-input color-input--compact" />
                  </div>
                </div>
              </template>

              <template v-if="mode === 'image'">
                <div class="setting-group setting-group--wide">
                  <div class="setting-label">{{ t("pages.imageWatermark.settings.imageFile") }}</div>
                  <div class="file-picker-row">
                    <button type="button" class="btn btn--secondary btn--sm" @click="pickWatermarkImage">
                      {{ t("pages.imageWatermark.settings.pickImageFile") }}
                    </button>
                    <span class="path-inline">{{ imagePath || t("pages.imageWatermark.settings.imageFileNotSelected") }}</span>
                  </div>
                </div>
                <div class="setting-group setting-group--wide">
                  <label class="setting-label" for="watermark-scale">{{ t("pages.imageWatermark.settings.imageScale") }}</label>
                  <input id="watermark-scale" v-model.number="imageScalePercent" type="number" min="5" max="60" class="text-input" />
                </div>
              </template>

              <p class="settings-section-label">{{ t("pages.imageWatermark.settings.sectionAppearance") }}</p>
              <div class="setting-group setting-group--wide">
                <label class="seting-label" for="watermark-opacity">{{ t("pages.imageWatermark.settings.opacity") }}</label>
                <div class="range-row">
                  <input id="watermark-opacity" v-model.number="opacity" type="range" min="5" max="100" class="range-input" />
                  <strong class="range-value">{{ opacity }}%</strong>
                </div>
              </div>

              <p class="settings-section-label">{{ t("pages.imageWatermark.settings.sectionLayout") }}</p>
              <div class="position-margin-row">
                <div class="position-margin-row__grid-block">
                  <span id="position-label" class="position-margin-row__subheading">{{ t("pages.imageWatermark.settings.position") }}</span>
                  <div class="position-grid-9" role="radiogroup" aria-labelledby="position-label">
                    <label
                      v-for="preset in POSITION_PRESETS"
                      :key="preset.value"
                      class="position-cell-9"
                      :class="{ 'position-cell-9--active': position === preset.value }"
                    >
                      <input v-model="position" type="radio" :value="preset.value" :aria-label="t(`pages.imageWatermark.positions.${preset.key}`)" />
                      <span class="position-cell-9__dot" aria-hidden="true" />
                    </label>
                  </div>
                </div>
                <div class="position-margin-row__side">
                  <div class="setting-group">
                    <label class="setting-label" for="watermark-margin">{{ t("pages.imageWatermark.settings.margin") }}</label>
                    <div class="input-affix">
                      <input
                        id="watermark-margin"
                        v-model.number="margin"
                        type="number"
                        min="0"
                        max="200"
                        class="input-affix__field"
                      />
                      <span class="input-affix__suffix">px</span>
                    </div>
                  </div>
                  <div class="setting-group">
                    <label class="setting-label" for="watermark-rotation">{{ t("pages.imageWatermark.settings.rotation") }}</label>
                    <div class="input-affix">
                      <input
                        id="watermark-rotation"
                        v-model.number="rotation"
                        type="number"
                        min="-180"
                        max="180"
                        class="input-affix__field"
                      />
                      <span class="input-affix__suffix">°</span>
                    </div>
                  </div>
                </div>
              </div>

              <p class="scale-tip">{{ t("pages.imageWatermark.settings.tip") }}</p>
            </div>
          </aside>
        </div>
      </main>

      <footer class="bottom-bar">
        <div class="bottom-bar__left">
          <div class="bottom-bar__row">
            <span class="bottom-bar__label">{{ t("pages.imageWatermark.bottom.outputLabel") }}</span>
            <span class="bottom-bar__path" :title="effectiveOutputDirectory || ''">{{
              effectiveOutputDirectory || t("pages.imageWatermark.output.defaultDirectory")
            }}</span>
            <button type="button" class="btn btn--link" @click="pickOutputDirectory">{{ t("pages.imageWatermark.bottom.changeOutput") }}</button>
            <button type="button" class="btn btn--link" :disabled="!effectiveOutputDirectory" @click="openEffectiveOutputDirectory">
              {{ t("pages.imageWatermark.output.openDirectory") }}
            </button>
          </div>
          <div class="bottom-bar__row bottom-bar__row--naming">
            <span class="bottom-bar__label">{{ t("pages.imageWatermark.bottom.namingLabel") }}</span>
            <span class="bottom-bar__naming">{{ outputNamingLabel }}</span>
            <button type="button" class="btn btn--link btn--link-muted" @click="goOutputNamingSettings">
              {{ t("pages.imageWatermark.bottom.namingGoSettings") }}
            </button>
          </div>
        </div>
        <button type="button" class="btn btn--primary btn--start" :disabled="!canStart" @click="startWatermark">
          {{ isProcessing ? t("pages.imageWatermark.processing") : t("pages.imageWatermark.start") }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.image-watermark-page {
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --surface: #ffffff;
  --surface-muted: #f5f7fa;
  --border: #e5e7eb;
  --text: #0f172a;
  --text-muted: #64748b;
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface-muted);
  box-sizing: border-box;
}

.page-shell {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 12px 20px 14px;
  box-sizing: border-box;
}

.page-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-grid {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 310px);
  gap: 16px;
  align-items: stretch;
  overflow: hidden;
}

.main-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

.workspace-head__title {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
  font-weight: 700;
  color: var(--text);
}

.workspace-head__desc {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--text-muted);
}

.workspace-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
  flex-shrink: 0;
}

.workspace-head__text {
  min-width: 0;
  flex: 1 1 220px;
}

.workspace-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  flex: 1 1 280px;
}

.main-column__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.preview-shell {
  flex-shrink: 0;
  max-height: clamp(200px, 36vh, 400px);
  min-height: 160px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-stage {
  flex: 1;
  min-height: 120px;
  max-height: 100%;
  border: 1px dashed #93c5fd;
  border-radius: 12px;
  background: linear-gradient(180deg, #f0f9ff 0%, #fafbfc 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  position: relative;
  overflow: hidden;
  cursor: default;
  user-select: none;
}

.preview-stage--empty {
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
}

.preview-canvas {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  max-width: 100%;
  max-height: 100%;
  background:
    linear-gradient(45deg, #f1f5f9 25%, transparent 25%) -10px 0/20px 20px,
    linear-gradient(-45deg, #f1f5f9 25%, transparent 25%) -10px 0/20px 20px,
    linear-gradient(45deg, transparent 75%, #f1f5f9 75%) -10px 0/20px 20px,
    linear-gradient(-45deg, transparent 75%, #f1f5f9 75%) -10px 0/20px 20px,
    #e2e8f0;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.preview-overlay {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: grab;
  touch-action: none;
}

.preview-overlay--text,
.preview-overlay--image {
  background: transparent;
  border: none;
}

.preview-overlay__text-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 2px 8px rgba(15, 23, 42, 0.45));
}

.preview-overlay__logo {
  width: 100%;
  height: auto;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 16px rgba(15, 23, 42, 0.3));
}

.preview-overlay__placeholder {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.upload-zone {
  width: min(520px, 100%);
  text-align: center;
  padding: 16px 16px 20px;
  color: var(--text-muted);
}

.upload-zone__icon {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.upload-zone__svg {
  width: 88px;
  height: auto;
}

.upload-zone__title {
  display: block;
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
}

.upload-zone__desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 20px;
}

.upload-zone__actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.upload-zone--active {
  border-color: var(--accent);
  background: #eff6ff;
}

.preview-hint {
  margin: 0;
  font-size: 12px;
  color: #b91c1c;
}

.upload-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-muted);
  overflow: hidden;
}

.list-card__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.list-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.list-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.list-card__tip {
  flex-shrink: 0;
  margin: 0;
  padding: 8px 12px 0;
  font-size: 12px;
  color: #c2410c;
  background: var(--surface);
}

.result-inline {
  flex-shrink: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: #eff6ff;
}

.result-inline__title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
}

.result-inline__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.result-inline__cell {
  background: #fff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 8px;
  min-width: 0;
}

.result-inline__label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.result-inline__ok {
  color: #15803d;
}

.result-inline__bad {
  color: #b91c1c;
}

.list-card__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  padding: 0;
  background: var(--surface);
}

/* 滑动条美化 */
.list-card__body::-webkit-scrollbar {
  width: 6px;
}
.list-card__body::-webkit-scrollbar-track {
  background: transparent;
}
.list-card__body::-webkit-scrollbar-thumb {
  background: var(--border);
}
.list-card__body::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}
.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 66px 20px;
  text-align: center;
}

.list-empty__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.list-empty__desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  max-width: 320px;
}

.list-empty__icon {
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
}

.list-empty__svg {
  width: 72px;
  height: auto;
  opacity: 0.85;
}

.table-wrap {
  min-width: 880px;
}

.task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.task-table thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
}

.task-table th {
  text-align: left;
  padding: 10px 12px;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.task-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  color: var(--text);
}

.task-table__col-action {
  width: 88px;
  text-align: right;
}

.task-table__cell-name {
  max-width: 200px;
}

.task-table__name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.task-table__err {
  margin: 4px 0 0;
  font-size: 11px;
  color: #b91c1c;
  white-space: normal;
}

.task-table__out {
  margin: 4px 0 0;
  font-size: 11px;
  color: #047857;
  word-break: break-all;
}

.task-table__cell-muted {
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.task-table__status {
  font-size: 12px;
  color: var(--text-muted);
}

.task-table__status--ok {
  color: #15803d;
  font-weight: 600;
}

.task-table__status--bad {
  color: #b91c1c;
  font-weight: 600;
}

.task-table__status-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 120px;
}

.task-table__thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
  background: var(--surface-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-table__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.task-table__thumb-ph {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
}

.task-table__progress--inline {
  min-width: 0;
}

.task-table__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.task-table__progress-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.task-table__progress-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
}

.task-table__progress-text {
  flex: 0 0 36px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: right;
}

.task-table-mobile {
  display: none;
}

.settings-aside {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.watermark-settings {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 14px 16px;
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* 滑动条美化 */
.watermark-settings::-webkit-scrollbar {
  width: 6px;
}
.watermark-settings::-webkit-scrollbar-track {
  background: transparent;
}
.watermark-settings::-webkit-scrollbar-thumb {
  background: var(--border);
}
.watermark-settings::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}

.watermark-settings__title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.settings-section-label {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #94a3b8;
}

.settings-typography-row {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(72px, 0.75fr) auto;
  gap: 10px;
  align-items: end;
}

.setting-group--color {
  justify-self: end;
}

.text-input--select {
  cursor: not-allowed;
  opacity: 0.92;
  color: var(--text-muted);
}

.color-input--compact {
  width: 44px;
  min-height: 40px;
  padding: 2px;
  border-radius: 8px;
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
  padding: 8px 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  background: var(--surface-muted);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  transition: border-color 0.15s, background 0.15s;
}

.mode-option--active {
  border-color: var(--accent);
  background: #eff6ff;
  color: var(--accent);
}

.mode-option input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.setting-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.text-input,
.color-input {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  min-height: 36px;
  padding: 0 10px;
  color: var(--text);
  font-size: 14px;
}

.color-input {
  padding: 4px;
  width: 100%;
}

.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-input {
  flex: 1;
  min-width: 0;
  accent-color: var(--accent);
}

.range-value {
  flex: 0 0 44px;
  text-align: right;
  font-size: 12px;
  color: var(--text-muted);
}

.file-picker-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.path-inline {
  font-size: 12px;
  color: var(--text-muted);
  word-break: break-all;
}

.position-margin-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px 30px;
  min-width: 0;
}

.position-margin-row__grid-block {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.position-margin-row__subheading {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.position-grid-9 {
  display: grid;
  grid-template-columns: repeat(3, 26px);
  grid-template-rows: repeat(3, 26px);
  gap: 8px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
}

.position-cell-9 {
  width: 26px;
  height: 26px;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #fafafa;
  position: relative;
  transition:
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
}

.position-cell-9 input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.position-cell-9__dot {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: #e2e8f0;
  transition: background 0.15s;
}

.position-cell-9--active {
  border-color: var(--accent);
  background: #eff6ff;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.2);
}

.position-cell-9--active .position-cell-9__dot {
  background: var(--accent);
}

.position-margin-row__side {
  flex: 1 1 108px;
  align-self: flex-start;
  min-width: 0;
  width: 118px;
  max-width: 132px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.position-margin-row__side > .setting-group {
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  gap: 10px;
}

.position-margin-row__side > .setting-group .setting-label {
  font-size: 11px;
  line-height: 1.2;
}

.position-margin-row__side .input-affix {
  border-radius: 6px;
}

.position-margin-row__side .input-affix__field {
  min-height: 30px;
  padding: 0 6px;
  font-size: 12px;
}

.position-margin-row__side .input-affix__suffix {
  padding: 0 8px;
  font-size: 11px;
}

.input-affix {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.input-affix__field {
  flex: 1;
  min-width: 0;
  border: none;
  padding: 0 10px;
  min-height: 38px;
  font-size: 14px;
  color: var(--text);
  background: transparent;
}

.input-affix__field:focus {
  outline: none;
}

.input-affix:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
}

.input-affix__suffix {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: #f3f4f6;
  border-left: 1px solid var(--border);
}

.scale-tip {
  margin: 12px 0 0;
  font-size: 11px;
  line-height: 16px;
  color: var(--text-muted);
}

.bottom-bar {
  flex-shrink: 0;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 -2px 12px rgba(15, 23, 42, 0.04);
}

.bottom-bar__left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.bottom-bar__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-width: 0;
}

.bottom-bar__row--naming {
  border-top: 1px dashed var(--border);
  margin-top: 2px;
  padding-top: 8px;
}

.bottom-bar__naming {
  font-size: 12px;
  color: var(--text);
  font-weight: 500;
}

.bottom-bar__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}

.bottom-bar__path {
  font-size: 12px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
  max-width: min(520px, 45vw);
}

.btn {
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.btn--primary {
  background: var(--accent);
  color: #fff;
  padding: 10px 18px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

.btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn--primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--secondary {
  background: #fff;
  color: var(--text);
  padding: 8px 14px;
  border: 1px solid var(--border);
}

.btn--secondary:hover:not(:disabled) {
  background: #f8fafc;
}

.btn--secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--ghost {
  background: transparent;
  color: var(--accent);
  padding: 8px 10px;
  border: 1px solid transparent;
}

.btn--ghost:hover:not(:disabled) {
  background: #eff6ff;
}

.btn--ghost:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn--sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn--link {
  background: none;
  border: none;
  color: var(--accent);
  padding: 4px 0;
  font-size: 13px;
  font-weight: 600;
}

.btn--link:hover:not(:disabled) {
  text-decoration: underline;
}

.btn--link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--start {
  padding: 12px 28px;
  font-size: 15px;
  flex-shrink: 0;
}

.btn--danger {
  background: #fff;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.btn--danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--link-muted {
  color: var(--text-muted);
  font-weight: 500;
  font-size: 12px;
}

.btn--link-muted:hover {
  color: var(--accent);
}

@media (max-width: 1024px) {
  .page-shell {
    padding: 10px 14px 12px;
  }

  .workspace-grid {
    gap: 12px;
  }

  .watermark-settings {
    max-height: min(50vh, 520px);
  }

  .main-column__body {
    min-height: 0;
  }

  .preview-shell {
    max-height: min(34vh, 320px);
  }
}

@media (max-width: 768px) {
  .page-shell {
    padding: 0 12px 12px;
  }

  .bottom-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .bottom-bar__path {
    max-width: 100%;
    white-space: normal;
  }

  .btn--start {
    width: 100%;
  }

  .settings-typography-row {
    grid-template-columns: 1fr;
    justify-items: stretch;
  }

  .setting-group--color {
    justify-self: stretch;
  }

  .position-margin-row {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 8px 10px;
  }

  .position-margin-row__side {
    flex: 1 1 100px;
    width: 112px;
    max-width: 124px;
  }

  .position-grid-9 {
    align-self: flex-start;
  }

  .table-wrap {
    min-width: 0;
  }

  .task-table {
    display: none;
  }

  .task-table-mobile {
    display: block;
    padding: 12px;
    border-bottom: 1px solid #f1f5f9;
  }

  .task-table-mobile__row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
  }

  .task-table-mobile__thumb-wrap {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    border: 1px solid var(--border);
    overflow: hidden;
    background: var(--surface-muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .task-table-mobile__thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .task-table-mobile__thumb-ph {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  }

  .task-table-mobile__main {
    flex: 1;
    min-width: 0;
  }

  .task-table-mobile__name {
    font-size: 14px;
    word-break: break-all;
  }

  .task-table-mobile__meta {
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .task-table-mobile__path {
    margin: 6px 0 0;
    font-size: 11px;
    color: #047857;
    word-break: break-all;
  }

  .task-table-mobile__err {
    margin: 8px 0 0;
    font-size: 12px;
    color: #b91c1c;
  }

  .task-table-mobile__actions {
    margin-top: 8px;
  }

  .result-inline__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
