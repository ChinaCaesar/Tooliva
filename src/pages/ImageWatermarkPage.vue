<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ROUTE_PATHS } from "@/config/constants";
import ToolPageTopBar from "@/components/common/ToolPageTopBar.vue";
import { useImageWatermarkActions } from "@/pages/image-watermark/composables/useImageWatermarkActions";

const router = useRouter();
const { t } = useI18n();
const {
  items,
  visibleItems,
  hiddenItemCount,
  isProcessing,
  isDropActive,
  hintMessage,
  outputDirectory,
  effectiveOutputDirectory,
  sourceDirectory,
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
  primaryPreviewItem,
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

/**
 * 返回首页，保持工具页统一入口行为。
 */
function backToHome(): void {
  router.push(ROUTE_PATHS.home);
}

/**
 * 打开设置页，复用全局设置入口。
 */
function goToSettings(): void {
  router.push(ROUTE_PATHS.settings);
}
</script>

<template>
  <div class="image-watermark-page">
    <ToolPageTopBar title-key="common.backToHome" variant="compact" @back-home="backToHome" @open-settings="goToSettings" />
    <main class="image-watermark-page__content">
      <section class="workspace-panel">
        <div class="workspace-head">
          <div>
            <h2>{{ t("pages.imageWatermark.title") }}</h2>
            <p class="panel-desc">{{ t("pages.imageWatermark.description") }}</p>
          </div>
        </div>

        <div class="editor-layout">
          <section class="preview-panel">
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
                <strong class="upload-zone__title">{{ t("pages.imageWatermark.upload.dropTitle") }}</strong>
                <p class="upload-zone__desc">{{ t("pages.imageWatermark.upload.dropDesc") }}</p>
                <button type="button" class="primary-btn preview-empty__button" @click="pickImages">
                  {{ t("pages.imageWatermark.source.pickImages") }}
                </button>
              </div>
            </div>
            <p v-if="hintMessage" class="hint">{{ hintMessage }}</p>
          </section>

          <section class="settings-panel">
            <div class="workspace-actions workspace-actions--panel">
              <button type="button" class="secondary-btn" @click="pickImages">{{ t("pages.imageWatermark.source.pickImages") }}</button>
              <button type="button" class="secondary-btn" @click="pickSourceDirectory">{{ t("pages.imageWatermark.source.pickDirectory") }}</button>
              <button type="button" class="secondary-btn" @click="pickOutputDirectory">{{ t("pages.imageWatermark.output.pickDirectory") }}</button>
              <button
                type="button"
                class="secondary-btn secondary-btn--subtle"
                :disabled="!effectiveOutputDirectory"
                @click="openEffectiveOutputDirectory"
              >
                {{ t("pages.imageWatermark.output.openDirectory") }}
              </button>
            </div>

            <div class="control-card">
              <div class="control-card__head">
                <div class="control-card__title">{{ t("pages.imageWatermark.output.title") }}</div>
                <p class="path-tip">{{ effectiveOutputDirectory || t("pages.imageWatermark.output.defaultDirectory") }}</p>
              </div>
            </div>

            <div class="watermark-settings">
              <div class="watermark-settings__head">
                <div class="watermark-settings__title">{{ t("pages.imageWatermark.settings.title") }}</div>
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
              </div>

              <div class="settings-grid">
                <div v-if="mode === 'text'" class="setting-group setting-group--wide">
                  <label class="setting-label" for="watermark-text">{{ t("pages.imageWatermark.settings.text") }}</label>
                  <input id="watermark-text" v-model="text" type="text" class="text-input" :placeholder="t('pages.imageWatermark.settings.textPlaceholder')" />
                </div>

                <div v-if="mode === 'text'" class="setting-group">
                  <label class="setting-label" for="watermark-font-size">{{ t("pages.imageWatermark.settings.fontSize") }}</label>
                  <input id="watermark-font-size" v-model.number="fontSize" type="number" min="12" max="96" class="text-input" />
                </div>

                <div v-if="mode === 'text'" class="setting-group">
                  <label class="setting-label" for="watermark-text-color">{{ t("pages.imageWatermark.settings.textColor") }}</label>
                  <input id="watermark-text-color" v-model="textColor" type="color" class="color-input" />
                </div>

                <div v-if="mode === 'image'" class="setting-group setting-group--wide">
                  <div class="setting-label">{{ t("pages.imageWatermark.settings.imageFile") }}</div>
                  <div class="file-picker-row">
                    <button type="button" class="secondary-btn" @click="pickWatermarkImage">
                      {{ t("pages.imageWatermark.settings.pickImageFile") }}
                    </button>
                    <span class="path-inline">{{ imagePath || t("pages.imageWatermark.settings.imageFileNotSelected") }}</span>
                  </div>
                </div>

                <div v-if="mode === 'image'" class="setting-group setting-group--wide-on-image">
                  <label class="setting-label" for="watermark-scale">{{ t("pages.imageWatermark.settings.imageScale") }}</label>
                  <input id="watermark-scale" v-model.number="imageScalePercent" type="number" min="5" max="60" class="text-input" />
                </div>

                <div class="setting-group" :class="{ 'setting-group--wide-on-image': mode === 'image' }">
                  <label class="setting-label" for="watermark-opacity">{{ t("pages.imageWatermark.settings.opacity") }}</label>
                  <div class="range-row">
                    <input id="watermark-opacity" v-model.number="opacity" type="range" min="5" max="100" class="range-input" />
                    <strong class="range-value">{{ opacity }}%</strong>
                  </div>
                </div>

                <div class="setting-group">
                  <label class="setting-label" for="watermark-margin">{{ t("pages.imageWatermark.settings.margin") }}</label>
                  <input id="watermark-margin" v-model.number="margin" type="number" min="0" max="200" class="text-input" />
                </div>

                <div class="setting-group">
                  <label class="setting-label" for="watermark-rotation">{{ t("pages.imageWatermark.settings.rotation") }}</label>
                  <input id="watermark-rotation" v-model.number="rotation" type="number" min="-180" max="180" class="text-input" />
                </div>

                <div class="setting-group setting-group--wide">
                  <span class="setting-label">{{ t("pages.imageWatermark.settings.position") }}</span>
                  <div class="position-options">
                    <label class="position-option" :class="{ 'position-option--active': position === 'topLeft' }">
                      <input v-model="position" type="radio" value="topLeft" />
                      <span>{{ t("pages.imageWatermark.positions.topLeft") }}</span>
                    </label>
                    <label class="position-option" :class="{ 'position-option--active': position === 'topRight' }">
                      <input v-model="position" type="radio" value="topRight" />
                      <span>{{ t("pages.imageWatermark.positions.topRight") }}</span>
                    </label>
                    <label class="position-option" :class="{ 'position-option--active': position === 'center' }">
                      <input v-model="position" type="radio" value="center" />
                      <span>{{ t("pages.imageWatermark.positions.center") }}</span>
                    </label>
                    <label class="position-option" :class="{ 'position-option--active': position === 'bottomLeft' }">
                      <input v-model="position" type="radio" value="bottomLeft" />
                      <span>{{ t("pages.imageWatermark.positions.bottomLeft") }}</span>
                    </label>
                    <label class="position-option" :class="{ 'position-option--active': position === 'bottomRight' }">
                      <input v-model="position" type="radio" value="bottomRight" />
                      <span>{{ t("pages.imageWatermark.positions.bottomRight") }}</span>
                    </label>
                    <label class="position-option" :class="{ 'position-option--active': position === 'custom' }">
                      <input v-model="position" type="radio" value="custom" />
                      <span>{{ t("pages.imageWatermark.positions.custom") }}</span>
                    </label>
                  </div>
                </div>
              </div>

              <p class="scale-tip">{{ t("pages.imageWatermark.settings.tip") }}</p>
            </div>
          </section>
        </div>
      </section>

      <section v-if="resultSummary" class="result-panel">
        <h3>{{ t("pages.imageWatermark.result.title") }}</h3>
        <div class="result-grid">
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageWatermark.result.total") }}</span>
            <strong>{{ resultSummary.total }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageWatermark.result.success") }}</span>
            <strong class="result-item__success">{{ resultSummary.success }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageWatermark.result.failed") }}</span>
            <strong class="result-item__failed">{{ resultSummary.failed }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageWatermark.result.elapsed") }}</span>
            <strong>{{ formatElapsed(resultSummary.elapsedMs) }}</strong>
          </div>
        </div>
      </section>

      <section class="task-list">
        <div class="task-list__head">
          <h3>{{ t("pages.imageWatermark.fileListTitle") }} ({{ items.length }})</h3>
          <button v-if="items.length > 0" type="button" class="secondary-btn" :disabled="isProcessing" @click="clearItems">
            {{ t("pages.imageWatermark.clearList") }}
          </button>
        </div>
        <p v-if="hiddenItemCount > 0" class="list-tip">
          {{ t("pages.imageWatermark.listOverflowTip", { count: hiddenItemCount }) }}
        </p>
        <div v-if="items.length === 0" class="task-empty">{{ t("common.noData") }}</div>
        <article v-for="item in visibleItems" :key="item.id" class="task-item">
          <div class="task-item__head">
            <div class="task-item__name">{{ item.fileName }}</div>
            <div
              class="task-item__status"
              :class="{
                'task-item__status--completed': item.status === 'completed',
                'task-item__status--failed': item.status === 'failed'
              }"
            >
              {{ t(`pages.imageWatermark.status.${item.status}`) }}
            </div>
          </div>
          <div class="task-item__path">{{ item.inputPath }}</div>
          <div class="progress-row">
            <div class="progress-bar">
              <span class="progress-bar__value" :style="{ width: `${item.progress}%` }"></span>
            </div>
            <span>{{ item.progress }}%</span>
          </div>
          <p v-if="item.originalSize || item.outputSize" class="task-item__size">
            {{ item.originalSize || "-" }} → {{ item.outputSize || "-" }}
          </p>
          <div v-if="item.outputPath" class="task-item__output">{{ item.outputPath }}</div>
          <div v-if="item.error" class="task-item__error">{{ item.error }}</div>
          <div class="task-item__actions">
            <button type="button" class="secondary-btn" :disabled="isProcessing" @click="removeItem(item.id)">
              {{ t("pages.imageWatermark.remove") }}
            </button>
          </div>
        </article>
      </section>
    </main>
    <div class="action-bar">
      <div class="action-bar__inner">
        <button type="button" class="primary-btn primary-btn--confirm" :disabled="!canStart" @click="startWatermark">
          {{ isProcessing ? t("pages.imageWatermark.processing") : t("pages.imageWatermark.start") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-watermark-page {
  --workspace-visible-height: calc(100dvh - 198px);
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  min-height: calc(100dvh - 48px);
  padding-top: 74px;
}
.image-watermark-page__content { padding: 16px 20px 104px; }
.workspace-panel {
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  padding: 18px 18px 16px;
  background: linear-gradient(180deg, #fff 0%, #fffaf5 100%);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
  min-height: var(--workspace-visible-height);
  display: flex;
  flex-direction: column;
}
.workspace-panel h2 { margin: 0; color: #111827; font-size: 22px; line-height: 30px; }
.panel-desc { margin: 4px 0 0; color: #64748b; font-size: 13px; line-height: 20px; }
.workspace-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.workspace-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.workspace-actions--panel { justify-content: flex-start; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.editor-layout {
  margin-top: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(276px, 324px);
  gap: 16px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}
.preview-panel,
.settings-panel { min-width: 0; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.preview-panel { min-height: 0; }
.control-card { border: 1px solid #fed7aa; border-radius: 12px; padding: 8px 10px; background: #fff7ed; }
.control-card__head { display: flex; flex-direction: column; gap: 2px; }
.control-card__title { color: #7c2d12; font-size: 14px; font-weight: 600; line-height: 22px; }
.preview-stage {
  border: 1px solid #fed7aa;
  border-radius: 24px;
  background: radial-gradient(circle at top, #fff7ed 0%, #fff 62%);
  min-height: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  position: relative;
  overflow: hidden;
  cursor: default;
  user-select: none;
}
.preview-stage--empty { background: linear-gradient(180deg, #fff7ed 0%, #fff 100%); }
.preview-canvas {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
  max-width: 100%;
  max-height: 100%;
  background:
    linear-gradient(45deg, #f8fafc 25%, transparent 25%) -12px 0/24px 24px,
    linear-gradient(-45deg, #f8fafc 25%, transparent 25%) -12px 0/24px 24px,
    linear-gradient(45deg, transparent 75%, #f8fafc 75%) -12px 0/24px 24px,
    linear-gradient(-45deg, transparent 75%, #f8fafc 75%) -12px 0/24px 24px,
    #e2e8f0;
}
.preview-image { width: 100%; height: 100%; object-fit: contain; display: block; background: transparent; }
.preview-overlay { position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0; cursor: grab; touch-action: none; }
.preview-overlay--text,
.preview-overlay--image { background: transparent; border: none; box-shadow: none; backdrop-filter: none; }
.preview-overlay__text-image { width: 100%; height: 100%; object-fit: contain; display: block; image-rendering: auto; filter: drop-shadow(0 2px 10px rgba(15, 23, 42, 0.55)); }
.preview-overlay__logo { width: 100%; height: auto; max-height: 100%; object-fit: contain; display: block; filter: drop-shadow(0 8px 20px rgba(15, 23, 42, 0.35)); }
.preview-overlay__placeholder { color: #fff; font-size: 14px; font-weight: 600; }
.upload-zone {
  width: min(520px, calc(100% - 24px));
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  background: #f9fafb;
  text-align: center;
  padding: 28px 20px;
  color: #64748b;
}
.upload-zone--active { border-color: #1d4ed8; background: #eff6ff; }
.upload-zone__title { display: block; margin: 0; font-size: 18px; font-weight: 600; line-height: 28px; color: #0f172a; }
.upload-zone__desc { margin: 8px 0 0; color: #64748b; line-height: 22px; }
.preview-empty__button { margin-top: 16px; }
.watermark-settings {
  border: 1px solid #fed7aa;
  border-radius: 12px;
  padding: 10px;
  background: #fff7ed;
  flex: 1;
}
.watermark-settings__head { display: flex; align-items: center; justify-content: space-between; gap: 8px 12px; flex-wrap: wrap; }
.watermark-settings__title { color: #7c2d12; font-size: 14px; font-weight: 600; line-height: 22px; }
.mode-options,
.position-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.mode-options { display: flex; gap: 8px; flex-wrap: wrap; }
.mode-option,
.position-option {
  border: 1px solid #fdba74;
  border-radius: 10px;
  padding: 5px 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 200ms ease;
  background: #fff;
  font-size: 12px;
  line-height: 18px;
}
.mode-option--active,
.position-option--active { border-color: #ea580c; background: #ffedd5; box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.12); }
.settings-grid { margin-top: 8px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 10px; }
.setting-group { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.setting-group--wide { grid-column: span 2; }
.setting-group--wide-on-image { grid-column: span 2; }
.setting-label { color: #7c2d12; font-size: 12px; font-weight: 600; line-height: 18px; }
.text-input,
.color-input { border: 1px solid #fdba74; background: #fff; border-radius: 10px; min-height: 34px; padding: 0 10px; color: #111827; }
.color-input { padding: 4px; width: 100%; }
.range-row { display: flex; align-items: center; gap: 8px; }
.range-input { flex: 1; min-width: 0; }
.range-value { flex: 0 0 44px; text-align: right; color: #7c2d12; font-size: 12px; line-height: 18px; }
.file-picker-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.path-inline { color: #475569; font-size: 12px; line-height: 18px; word-break: break-all; }
.scale-tip { margin: 6px 0 0; color: #9a3412; font-size: 12px; line-height: 16px; }
.primary-btn { margin-top: 12px; border: none; border-radius: 12px; padding: 10px 24px; color: #fff; font-weight: 700; line-height: 20px; background: linear-gradient(90deg, #c2410c 0%, #9a3412 100%); cursor: pointer; box-shadow: 0 10px 24px rgba(194, 65, 12, 0.26); }
.primary-btn--confirm { width: 100%; margin-top: 0; padding: 12px 0; font-size: 16px; font-weight: 700; line-height: 24px; }
.primary-btn--confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.secondary-btn { border: 1px solid #fdba74; background: #fff; border-radius: 8px; padding: 5px 10px; cursor: pointer; color: #7c2d12; min-width: 0; }
.secondary-btn--subtle { background: rgba(255, 255, 255, 0.72); }
.ghost-btn { border: none; background: transparent; color: #c2410c; font-weight: 600; cursor: pointer; padding: 0; }
.secondary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.hint { color: #b91c1c; margin: 8px 0 0; }
.path-tip { margin: 0; color: #7c2d12; font-size: 12px; line-height: 16px; word-break: break-all; }
.task-list { margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
.task-list__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.task-list__head h3 { margin: 0; color: #111827; font-size: 16px; line-height: 24px; }
.list-tip { margin: 8px 0 0; color: #ea580c; font-size: 12px; }
.task-empty { margin-top: 10px; color: #6b7280; }
.task-item { border: 1px solid #f1f5f9; border-radius: 12px; padding: 12px; margin-top: 12px; }
.task-item__head { display: flex; justify-content: space-between; gap: 12px; }
.task-item__name { color: #111827; font-weight: 600; min-width: 0; word-break: break-all; }
.task-item__status { color: #475569; font-size: 12px; white-space: nowrap; }
.task-item__status--completed { color: #16a34a; font-weight: 600; }
.task-item__status--failed { color: #b91c1c; font-weight: 600; }
.task-item__path { color: #6b7280; font-size: 12px; margin-top: 6px; word-break: break-all; }
.progress-row { margin-top: 8px; display: flex; gap: 8px; align-items: center; }
.progress-bar { flex: 1; height: 8px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
.progress-bar__value { display: block; height: 100%; background: #f97316; }
.task-item__size { margin-top: 6px; color: #475569; font-size: 12px; }
.task-item__error { margin-top: 8px; color: #b91c1c; font-size: 12px; }
.task-item__output { margin-top: 8px; color: #047857; font-size: 12px; word-break: break-all; }
.task-item__actions { margin-top: 8px; display: flex; gap: 8px; }
.result-panel { margin-top: 16px; border: 1px solid #fed7aa; border-radius: 16px; background: rgba(255, 237, 213, 0.92); padding: 16px; position: sticky; top: 86px; z-index: 20; backdrop-filter: blur(4px); box-shadow: 0 8px 20px rgba(194, 65, 12, 0.08); }
.result-panel h3 { margin: 0; color: #9a3412; font-size: 16px; line-height: 24px; }
.result-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.result-item { border: 1px solid #fdba74; background: #fff; border-radius: 10px; padding: 10px; min-width: 0; }
.result-item__label { color: #475569; font-size: 12px; display: block; margin-bottom: 4px; }
.result-item__success { color: #15803d; }
.result-item__failed { color: #b91c1c; }
.action-bar { position: fixed; left: 0; right: 0; bottom: 12px; z-index: 40; pointer-events: none; }
.action-bar__inner { max-width: calc(100% - 48px); margin: 0 auto; padding: 8px 10px; border-radius: 14px; background: rgba(255, 255, 255, 0.9); border: 1px solid #fed7aa; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12); backdrop-filter: blur(8px); pointer-events: auto; }
.image-watermark-page :deep(.tool-top-bar) { box-shadow: 0 8px 14px rgba(15, 23, 42, 0.06); }

@media (max-height: 900px) and (min-width: 1025px) {
  .image-watermark-page {
    --workspace-visible-height: calc(100dvh - 178px);
  }
  .workspace-panel {
    padding: 16px 16px 14px;
  }
  .panel-desc {
    line-height: 18px;
  }
  .editor-layout {
    grid-template-columns: minmax(0, 1.8fr) minmax(260px, 300px);
    gap: 14px;
  }
  .preview-stage {
    padding: 12px;
  }
  .watermark-settings,
  .control-card {
    padding: 8px 9px;
  }
  .settings-grid {
    gap: 6px 8px;
  }
  .mode-option,
  .position-option,
  .secondary-btn {
    font-size: 12px;
  }
}

@media (max-width: 1024px) {
  .image-watermark-page {
    --workspace-visible-height: auto;
  }
  .image-watermark-page__content {
    padding: 16px 16px 96px;
  }
  .workspace-panel {
    min-height: auto;
    padding: 16px;
  }
  .editor-layout { grid-template-columns: 1fr; }
  .workspace-actions--panel {
    display: flex;
  }
  .preview-stage { min-height: 500px; }
  .result-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 768px) {
  .workspace-head,
  .settings-grid { grid-template-columns: 1fr; }
  .workspace-head { flex-direction: column; }
  .setting-group--wide,
  .setting-group--wide-on-image { grid-column: span 1; }
  .task-list__head,
  .watermark-settings__head { flex-direction: column; align-items: flex-start; }
  .workspace-actions--panel,
  .position-options {
    grid-template-columns: 1fr;
  }
  .file-picker-row,
  .range-row {
    flex-direction: column;
    align-items: stretch;
  }
  .workspace-actions--panel .secondary-btn,
  .file-picker-row .secondary-btn {
    width: 100%;
  }
  .preview-stage { min-height: 420px; padding: 12px; }
  .result-grid { grid-template-columns: 1fr; }
  .action-bar { bottom: 8px; }
  .action-bar__inner { max-width: calc(100% - 24px); }
}
</style>
