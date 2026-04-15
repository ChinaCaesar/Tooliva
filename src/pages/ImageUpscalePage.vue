<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ROUTE_PATHS } from "@/config/constants";
import ToolPageTopBar from "@/components/common/ToolPageTopBar.vue";
import { useImageUpscaleActions } from "@/pages/image-upscale/composables/useImageUpscaleActions";

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
  sourceDirectory,
  scaleFactor,
  resultSummary,
  canStart,
  formatElapsed,
  pickImages,
  pickSourceDirectory,
  pickOutputDirectory,
  startUpscale,
  clearItems,
  removeItem,
  handleDrop,
  onDragOver,
  onDragLeave
} = useImageUpscaleActions();

/**
 * 返回首页，保证工具页回退链路一致。
 */
function backToHome(): void {
  router.push(ROUTE_PATHS.home);
}

/**
 * 跳转设置页，保留统一设置入口。
 */
function goToSettings(): void {
  router.push(ROUTE_PATHS.settings);
}
</script>

<template>
  <div class="image-upscale-page">
    <ToolPageTopBar title-key="common.backToHome" variant="compact" @back-home="backToHome" @open-settings="goToSettings" />
    <main class="image-upscale-page__content">
      <section class="upload-panel">
        <h2>{{ t("pages.imageUpscale.title") }}</h2>
        <p class="panel-desc">{{ t("pages.imageUpscale.description") }}</p>

        <div class="control-grid">
          <div class="control-card">
            <div class="control-card__title">{{ t("pages.imageUpscale.source.title") }}</div>
            <div class="control-card__actions">
              <button type="button" class="secondary-btn" @click="pickImages">{{ t("pages.imageUpscale.source.pickImages") }}</button>
              <button type="button" class="secondary-btn" @click="pickSourceDirectory">{{ t("pages.imageUpscale.source.pickDirectory") }}</button>
            </div>
            <p class="path-tip">{{ sourceDirectory || t("pages.imageUpscale.source.directoryNotSelected") }}</p>
          </div>

          <div class="control-card">
            <div class="control-card__title">{{ t("pages.imageUpscale.output.title") }}</div>
            <div class="control-card__actions">
              <button type="button" class="secondary-btn" @click="pickOutputDirectory">{{ t("pages.imageUpscale.output.pickDirectory") }}</button>
            </div>
            <p class="path-tip">{{ outputDirectory || t("pages.imageUpscale.output.defaultDirectory") }}</p>
          </div>
        </div>

        <div class="scale-settings">
          <div class="scale-settings__title">{{ t("pages.imageUpscale.scale.title") }}</div>
          <div class="scale-options" role="radiogroup" :aria-label="t('pages.imageUpscale.scale.title')">
            <label class="scale-option" :class="{ 'scale-option--active': scaleFactor === 2 }">
              <input v-model="scaleFactor" type="radio" :value="2" />
              <span>2x</span>
            </label>
            <label class="scale-option" :class="{ 'scale-option--active': scaleFactor === 4 }">
              <input v-model="scaleFactor" type="radio" :value="4" />
              <span>4x</span>
            </label>
            <label class="scale-option" :class="{ 'scale-option--active': scaleFactor === 8 }">
              <input v-model="scaleFactor" type="radio" :value="8" />
              <span>8x</span>
            </label>
          </div>
          <p class="scale-tip">{{ t("pages.imageUpscale.scale.tip") }}</p>
        </div>

        <div class="upload-zone" :class="{ 'upload-zone--active': isDropActive }" @drop="handleDrop" @dragover="onDragOver" @dragleave="onDragLeave">
          <p class="upload-zone__title">{{ t("pages.imageUpscale.upload.dropTitle") }}</p>
          <p class="upload-zone__desc">{{ t("pages.imageUpscale.upload.dropDesc") }}</p>
          <button type="button" class="primary-btn" @click="pickImages">{{ t("pages.imageUpscale.upload.button") }}</button>
          <p v-if="hintMessage" class="hint">{{ hintMessage }}</p>
        </div>
      </section>

      <section class="task-list">
        <div class="task-list__head">
          <h3>{{ t("pages.imageUpscale.fileListTitle") }} ({{ items.length }})</h3>
          <button type="button" class="secondary-btn" :disabled="isProcessing" @click="clearItems">
            {{ t("pages.imageUpscale.clearList") }}
          </button>
        </div>
        <p v-if="hiddenItemCount > 0" class="list-tip">
          {{ t("pages.imageUpscale.listOverflowTip", { count: hiddenItemCount }) }}
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
              {{ t(`pages.imageUpscale.status.${item.status}`) }}
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
              {{ t("pages.imageUpscale.remove") }}
            </button>
          </div>
        </article>
      </section>

      <section v-if="resultSummary" class="result-panel">
        <h3>{{ t("pages.imageUpscale.result.title") }}</h3>
        <div class="result-grid">
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageUpscale.result.total") }}</span>
            <strong>{{ resultSummary.total }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageUpscale.result.success") }}</span>
            <strong class="result-item__success">{{ resultSummary.success }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageUpscale.result.failed") }}</span>
            <strong class="result-item__failed">{{ resultSummary.failed }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageUpscale.result.elapsed") }}</span>
            <strong>{{ formatElapsed(resultSummary.elapsedMs) }}</strong>
          </div>
        </div>
      </section>

    </main>
    <div class="action-bar">
      <div class="action-bar__inner">
        <button type="button" class="primary-btn primary-btn--confirm" :disabled="!canStart" @click="startUpscale">
          {{ isProcessing ? t("pages.imageUpscale.processing") : t("pages.imageUpscale.start") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-upscale-page { background: #fff; border-radius: 16px; overflow: hidden; min-height: calc(100vh - 48px); padding-top: 74px; }
.image-upscale-page__content { padding: 24px 24px 104px; }
.upload-panel { border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; background: #fff; }
.upload-panel h2 { margin: 0; color: #111827; font-size: 20px; line-height: 28px; }
.panel-desc { margin: 8px 0 0; color: #64748b; font-size: 14px; line-height: 22px; }
.control-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.control-card { border: 1px solid #dbeafe; border-radius: 12px; padding: 12px; background: #f8fafc; min-width: 0; }
.control-card__title { color: #0f172a; font-size: 14px; font-weight: 600; line-height: 22px; }
.control-card__actions { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
.scale-settings { margin-top: 12px; border: 1px solid #dbeafe; border-radius: 12px; padding: 12px; background: #f8fafc; }
.scale-settings__title { color: #0f172a; font-size: 14px; font-weight: 600; line-height: 22px; }
.scale-options { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
.scale-option { border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: all 200ms ease; }
.scale-option--active { border-color: #0284c7; background: #ecfeff; box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.14); }
.scale-tip { margin: 8px 0 0; color: #475569; font-size: 12px; line-height: 18px; }
.upload-zone { margin-top: 12px; border: 2px dashed #d1d5db; border-radius: 16px; background: #f9fafb; text-align: center; padding: 20px; }
.upload-zone--active { border-color: #1d4ed8; background: #eff6ff; }
.upload-zone__title { margin: 0; font-size: 16px; font-weight: 500; line-height: 24px; color: #0f172a; }
.upload-zone__desc { margin: 4px 0 0; color: #64748b; line-height: 20px; }
.primary-btn { margin-top: 12px; border: none; border-radius: 8px; padding: 10px 24px; color: #fff; font-weight: 500; line-height: 20px; background: linear-gradient(90deg, #1d4ed8 0%, #1e3a8a 100%); cursor: pointer; }
.primary-btn--confirm { width: 100%; margin-top: 0; padding: 12px 0; font-size: 16px; font-weight: 700; line-height: 24px; }
.primary-btn--confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.secondary-btn { border: 1px solid #d1d5db; background: #fff; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
.secondary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.hint { color: #b91c1c; margin: 8px 0 0; }
.path-tip { margin: 8px 0 0; color: #475569; font-size: 12px; line-height: 18px; word-break: break-all; }

.task-list { margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
.task-list__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.task-list__head h3 { margin: 0; color: #111827; font-size: 16px; line-height: 24px; }
.list-tip { margin: 8px 0 0; color: #1d4ed8; font-size: 12px; }
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
.progress-bar__value { display: block; height: 100%; background: #2563eb; }
.task-item__size { margin-top: 6px; color: #475569; font-size: 12px; }
.task-item__error { margin-top: 8px; color: #b91c1c; font-size: 12px; }
.task-item__output { margin-top: 8px; color: #047857; font-size: 12px; word-break: break-all; }
.task-item__actions { margin-top: 8px; display: flex; gap: 8px; }

.result-panel { margin-top: 16px; border: 1px solid #dcfce7; border-radius: 16px; background: #f0fdf4; padding: 16px; }
.result-panel h3 { margin: 0; color: #166534; font-size: 16px; line-height: 24px; }
.result-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.result-item { border: 1px solid #bbf7d0; background: #fff; border-radius: 10px; padding: 10px; min-width: 0; }
.result-item__label { color: #475569; font-size: 12px; display: block; margin-bottom: 4px; }
.result-item__success { color: #15803d; }
.result-item__failed { color: #b91c1c; }
.action-bar { position: fixed; left: 0; right: 0; bottom: 12px; z-index: 40; pointer-events: none; }
.action-bar__inner {
  max-width: calc(100% - 48px);
  margin: 0 auto;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dbeafe;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.image-upscale-page :deep(.tool-top-bar) {
  box-shadow: 0 8px 14px rgba(15, 23, 42, 0.06);
}

@media (max-width: 1024px) {
  .result-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 768px) {
  .image-upscale-page__content { padding: 16px 16px 96px; }
  .upload-panel { padding: 16px; }
  .control-grid { grid-template-columns: 1fr; }
  .task-list__head { flex-direction: column; align-items: flex-start; }
  .result-grid { grid-template-columns: 1fr; }
  .action-bar { bottom: 8px; }
  .action-bar__inner { max-width: calc(100% - 24px); }
}
</style>
