<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { ROUTE_PATHS } from "@/config/constants";
import { useInterruptOnRouteLeave } from "@/composables/useInterruptOnRouteLeave";
import type { WatermarkPosition } from "@/bridge/tauriClient";
import { useSettingsStore } from "@/stores/settings.store";
import { useImageWatermarkActions } from "@/pages/image-watermark/composables/useImageWatermarkActions";

const router = useRouter();
const { t, locale } = useI18n();
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
  outputMode,
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
  canStart,
  previewImageUrl,
  previewRect,
  previewStyle,
  setPreviewCanvasRef,
  setPreviewStageRef,
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
  interruptProcessing,
  clearItems,
  removeItem,
  handleDrop,
  onDragOver,
  onDragLeave
} = useImageWatermarkActions();

useInterruptOnRouteLeave({
  when: () => isProcessing.value,
  message: () =>
    locale.value.startsWith("zh")
      ? "当前页面任务正在进行，切换页面会中断任务。确定切换吗？"
      : "A task is still running on this page. Switching pages will interrupt it. Continue?",
  interrupt: () => interruptProcessing()
});

const watermarkTypeLabel = computed(() =>
  mode.value === "text" ? t("pages.imageWatermark.settings.textMode") : t("pages.imageWatermark.settings.imageMode")
);
const outputModeOptions = ["source", "custom", "overwrite"] as const;

const outputFooterLabel = computed(() =>
  outputMode.value === "overwrite"
    ? t("common.outputModes.overwrite")
    : effectiveOutputDirectory.value || t("pages.imageWatermark.output.defaultDirectory")
);

const outputNamingLabel = computed(() =>
  outputFileNamingRule.value === "timestamp"
    ? t("pages.settings.dashboard.namingTimestamp")
    : t("pages.settings.dashboard.namingOriginal")
);

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
                <h2 class="workspace-head__title">{{ t("pages.imageWatermark.title") }}</h2>
                <p class="workspace-head__desc">{{ t("pages.imageWatermark.description") }}</p>
              </div>
            </header>

            <div class="main-column__body">
              <div class="preview-shell">
                <div
                  :ref="setPreviewStageRef"
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
                    <table class="task-table task-table--centered">
                      <thead>
                        <tr>
                          <th scope="col" class="task-table__th-name">{{ t("pages.imageWatermark.list.table.fileName") }}</th>
                          <th scope="col">{{ t("pages.imageWatermark.list.table.watermarkType") }}</th>
                          <th scope="col">{{ t("pages.imageWatermark.list.table.preview") }}</th>
                          <th scope="col">{{ t("pages.imageWatermark.list.table.status") }}</th>
                          <th scope="col">{{ t("pages.imageWatermark.list.table.progress") }}</th>
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
                            <span
                              class="task-table__status"
                              :class="{
                                'task-table__status--ok': item.status === 'completed',
                                'task-table__status--bad': item.status === 'failed'
                              }"
                            >
                              {{ t(`pages.imageWatermark.status.${item.status}`) }}
                            </span>
                          </td>
                          <td class="task-table__cell-muted">
                            <span class="task-table__progress-pct">{{ item.progress }}%</span>
                          </td>
                          <td class="task-table__col-action">
                            <button
                              type="button"
                              class="task-table__icon-btn task-table__icon-btn--danger"
                              :disabled="isProcessing"
                              :aria-label="t('pages.imageWatermark.removeAria')"
                              @click="removeItem(item.id)"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M3 6h18" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
                              </svg>
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
                            {{ watermarkTypeLabel }}
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
                      <p class="task-table-mobile__pct">{{ item.progress }}%</p>
                      <p v-if="item.outputPath" class="task-table-mobile__path">{{ item.outputPath }}</p>
                      <p v-if="item.error" class="task-table-mobile__err">{{ item.error }}</p>
                      <div class="task-table-mobile__actions">
                        <button
                          type="button"
                          class="task-table__icon-btn task-table__icon-btn--danger"
                          :disabled="isProcessing"
                          :aria-label="t('pages.imageWatermark.removeAria')"
                          @click="removeItem(item.id)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
                          </svg>
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

              <p class="settings-section-label">{{ t("common.outputMode") }}</p>
              <div class="mode-options" role="radiogroup" :aria-label="t('common.outputMode')">
                <label
                  v-for="option in outputModeOptions"
                  :key="option"
                  class="mode-option"
                  :class="{ 'mode-option--active': outputMode === option }"
                >
                  <input v-model="outputMode" type="radio" :value="option" :disabled="isProcessing" />
                  <span>{{ t(`common.outputModes.${option}`) }}</span>
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
                <label class="setting-label" for="watermark-opacity">{{ t("pages.imageWatermark.settings.opacity") }}</label>
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
            <span class="bottom-bar__path" :title="outputFooterLabel">{{ outputFooterLabel }}</span>
            <button v-if="outputMode !== 'overwrite'" type="button" class="btn btn--link" @click="pickOutputDirectory">{{ t("pages.imageWatermark.bottom.changeOutput") }}</button>
            <button v-if="outputMode !== 'overwrite'" type="button" class="btn btn--link" :disabled="!effectiveOutputDirectory" @click="openEffectiveOutputDirectory">
              {{ t("pages.imageWatermark.output.openDirectory") }}
            </button>
          </div>
          <div v-if="outputMode !== 'overwrite'" class="bottom-bar__row bottom-bar__row--naming">
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
  --accent-link: #f97316;
  --accent-link-hover: #ea580c;
  --cta-shadow: 0 4px 12px rgba(243, 132, 30, 0.25);
  flex: 1;
  min-height: 0;
  min-width: 0;
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
  padding: 14px 18px 10px;
  box-sizing: border-box;
}

.page-main {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-grid {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 14px;
  align-items: stretch;
  overflow: hidden;
}

.main-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

.workspace-head__title {
  margin: 0;
  font-size: clamp(20px, 1.8vw, 24px);
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--text);
}

.workspace-head__desc {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
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
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}

.main-column__body::-webkit-scrollbar {
  width: 6px;
}
.main-column__body::-webkit-scrollbar-thumb {
  background: #d6d9e0;
  border-radius: 3px;
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
  border: 1px dashed #d6d9e0;
  border-radius: 14px;
  background: #fafbfd;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  position: relative;
  overflow: hidden;
  cursor: default;
  user-select: none;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.preview-stage--empty {
  background: #fafbfd;
}

.preview-stage:hover {
  border-color: #c7d2fe;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
}

.preview-canvas {
  position: relative;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
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
  color: var(--text-hint);
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
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.upload-zone__desc {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.upload-zone__actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.upload-zone--active {
  border-color: #c7d2fe;
  background: #f5f6fa;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.preview-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #ef4444;
}

.upload-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.list-card {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fafbfd;
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
  line-height: 1.5;
  color: var(--primary);
  background: #ffffff;
}

.list-card__body {
  overflow-x: hidden;
  padding: 0;
  background: #ffffff;
}

.list-card__body::-webkit-scrollbar {
  height: 6px;
}
.list-card__body::-webkit-scrollbar-thumb {
  background: #d6d9e0;
  border-radius: 3px;
}
.list-empty {
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
}

.list-empty__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.list-empty__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
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
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}

.task-table--centered th,
.task-table--centered td {
  text-align: center;
}

.task-table--centered .task-table__th-name,
.task-table--centered .task-table__cell-name {
  text-align: start;
}

.task-table thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #ffffff;
}

.task-table th {
  text-align: center;
  padding: 10px 12px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0;
  border-bottom: 1px solid var(--border-weak);
  white-space: nowrap;
}

.task-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e7e9ee;
  vertical-align: middle;
  color: var(--text-secondary);
}

.task-table__col-action {
  width: 56px;
  text-align: center;
}

.task-table__cell-name {
  max-width: min(26vw, 180px);
  min-width: 0;
  width: 22%;
}

.task-table__name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
  max-width: 100%;
  margin: 0;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text);
  white-space: normal;
}

.task-table__err {
  margin: 4px 0 0;
  font-size: 11px;
  color: #dc2626;
  white-space: normal;
}

.task-table__out {
  margin: 4px 0 0;
  font-size: 11px;
  color: #16a34a;
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
  color: #22c55e;
  font-weight: 600;
}

.task-table__status--bad {
  color: #dc2626;
  font-weight: 600;
}

.task-table__thumb {
  width: 48px;
  height: 48px;
  margin: 0 auto;
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

.task-table__progress-pct {
  font-size: 12px;
  color: var(--text-muted);
}

.task-table__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--border-weak);
  border-radius: 10px;
  background: #fff;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.task-table__icon-btn:hover:not(:disabled) {
  border-color: #fecaca;
  background: #fef2f2;
  color: #dc2626;
}

.task-table__icon-btn:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

.task-table__icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.task-table__icon-btn--danger {
  color: #b91c1c;
}

.task-table-mobile {
  display: none;
}

.settings-aside {
  align-self: stretch;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.watermark-settings {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px 18px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}
.watermark-settings::-webkit-scrollbar {
  width: 6px;
}
.watermark-settings::-webkit-scrollbar-thumb {
  background: #d6d9e0;
  border-radius: 3px;
}

.watermark-settings__title {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--text);
}

.settings-section-label {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--text-hint);
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
  border-color: #c7d2fe;
  background: #fafbfd;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.08);
  color: var(--primary);
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
  color: var(--text-secondary);
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
  accent-color: var(--primary);
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
  color: var(--text-secondary);
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
  border: 1px solid var(--border-weak);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #fafbfd;
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
  background: #e7e9ee;
  transition: background 0.15s;
}

.position-cell-9--active {
  border-color: #c7d2fe;
  background: #fafbfd;
  box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.2);
}

.position-cell-9--active .position-cell-9__dot {
  background: var(--primary);
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
  border-color: #c7d2fe;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.input-affix__suffix {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-hint);
  background: #f5f6fa;
  border-left: 1px solid var(--border);
}

.scale-tip {
  margin: 12px 0 0;
  font-size: 11px;
  line-height: 16px;
  color: var(--text-hint);
}

.bottom-bar {
  flex-shrink: 0;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
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
  color: var(--text-hint);
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
  transition:
    background 0.15s,
    color 0.15s,
    box-shadow 0.15s,
    filter 0.15s,
    border-color 0.15s;
}

.btn:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

.btn--primary {
  background: var(--primary);
  color: #ffffff;
  padding: 10px 18px;
  font-weight: 600;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.22);
}

.btn--primary:hover:not(:disabled) {
  background: var(--primary-dark);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.28);
}

.btn--primary.btn--start {
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
  font-weight: 700;
  box-shadow: var(--cta-shadow);
}

.btn--primary.btn--start:hover:not(:disabled) {
  filter: brightness(1.03);
  box-shadow: 0 6px 16px rgba(243, 132, 30, 0.32);
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
}

.btn--primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--secondary {
  background: #fff;
  color: var(--text-secondary);
  padding: 8px 14px;
  border: 1px solid var(--border-weak);
  border-radius: 999px;
  font-weight: 500;
}

.btn--secondary:hover:not(:disabled) {
  border-color: #dbeafe;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.06);
}

.btn--secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--ghost {
  background: transparent;
  color: var(--primary);
  padding: 8px 10px;
  border: 1px solid transparent;
}

.btn--ghost:hover:not(:disabled) {
  background: #eef2ff;
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
  color: var(--accent-link);
  padding: 4px 0;
  font-size: 13px;
  font-weight: 600;
}

.btn--link:hover:not(:disabled) {
  color: var(--accent-link-hover);
  text-decoration: underline;
}

.btn--link:focus-visible {
  outline: 2px solid var(--accent-link);
  outline-offset: 2px;
  border-radius: 4px;
}

.btn--link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--start {
  padding: 12px 28px;
  font-size: 15px;
  flex-shrink: 0;
  border-radius: 999px;
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
  color: var(--text-hint);
  font-weight: 500;
  font-size: 12px;
}

.btn--link-muted:hover:not(:disabled) {
  color: var(--accent-link);
}

@media (max-width: 1024px) {
  .page-shell {
    padding: 10px 14px 12px;
  }

  .workspace-grid {
    gap: 12px;
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
    border-bottom: 1px solid #e7e9ee;
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
    word-break: break-word;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    line-height: 1.35;
  }

  .task-table-mobile__meta {
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .task-table-mobile__pct {
    margin: 8px 0 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-align: center;
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
    display: flex;
    justify-content: center;
  }
}
</style>
