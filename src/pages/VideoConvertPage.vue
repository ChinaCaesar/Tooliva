<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ROUTE_PATHS } from "@/config/constants";
import ToolPageTopBar from "@/components/common/ToolPageTopBar.vue";
import { useVideoConvertPageData } from "@/pages/video-convert/composables/useVideoConvertPageData";
import { useVideoConvertActions } from "@/pages/video-convert/composables/useVideoConvertActions";

const { t } = useI18n();
const router = useRouter();
const { pageConfig, assets } = useVideoConvertPageData();
const {
  items,
  hintMessage,
  isConverting,
  isDropActive,
  outputFormat,
  outputMode,
  globalOutputDirectory,
  resultSummary,
  canStart,
  formatElapsed,
  pickFiles,
  pickGlobalOutputDirectory,
  pickSaveAsPath,
  handleDrop,
  onDragOver,
  onDragLeave,
  startConvert,
  retryItem,
  cancelItem,
  removeItem
} = useVideoConvertActions();

/**
 * 返回首页入口。
 */
function backToHome(): void {
  router.push(ROUTE_PATHS.home);
}

/**
 * 打开设置页面。
 */
function goToSettings(): void {
  router.push(ROUTE_PATHS.settings);
}
</script>

<template>
  <div class="video-convert-page">
    <ToolPageTopBar title-key="common.backToHome" variant="compact" @back-home="backToHome" @open-settings="goToSettings" />

    <main class="content">
      <section class="upload-panel">
        <h2>{{ t(pageConfig.uploadSection.titleKey) }}</h2>
        <div class="format-settings" role="radiogroup" :aria-label="t('pages.videoConvert.outputFormat.groupLabel')">
          <label class="format-option" :class="{ 'format-option--active': outputFormat === 'mp4' }">
            <input v-model="outputFormat" type="radio" value="mp4" class="format-option__radio" />
            <div class="format-option__content">
              <div class="format-option__title">MP4</div>
              <p class="format-option__desc">{{ t("pages.videoConvert.outputFormat.mp4") }}</p>
            </div>
          </label>
          <label class="format-option" :class="{ 'format-option--active': outputFormat === 'movAlpha' }">
            <input v-model="outputFormat" type="radio" value="movAlpha" class="format-option__radio" />
            <div class="format-option__content">
              <div class="format-option__title">MOV</div>
              <p class="format-option__desc">{{ t("pages.videoConvert.outputFormat.movAlpha") }}</p>
            </div>
          </label>
        </div>
        <div class="output-settings" role="radiogroup" :aria-label="t('pages.videoConvert.outputMode.groupLabel')">
          <label class="output-option" :class="{ 'output-option--active': outputMode === 'sameAsInput' }">
            <input v-model="outputMode" type="radio" value="sameAsInput" class="output-option__radio" />
            <div class="output-option__content">
              <div class="output-option__title">{{ t("pages.videoConvert.outputMode.sameAsInput") }}</div>
              <p class="output-option__desc">{{ t("pages.videoConvert.outputMode.sameAsInputDesc") }}</p>
            </div>
          </label>
          <label class="output-option" :class="{ 'output-option--active': outputMode === 'globalDirectory' }">
            <input v-model="outputMode" type="radio" value="globalDirectory" class="output-option__radio" />
            <div class="output-option__content">
              <div class="output-option__title">{{ t("pages.videoConvert.outputMode.globalDirectory") }}</div>
              <p class="output-option__desc">{{ t("pages.videoConvert.outputMode.globalDirectoryDesc") }}</p>
            </div>
          </label>
          <div class="output-directory-panel" :class="{ 'output-directory-panel--inactive': outputMode !== 'globalDirectory' }">
            <button type="button" class="secondary-btn output-directory-panel__btn" @click="pickGlobalOutputDirectory">
              {{ t("pages.videoConvert.outputMode.chooseDirectory") }}
            </button>
            <p class="path-tip">
              {{ globalOutputDirectory || t("pages.videoConvert.outputMode.notSelected") }}
            </p>
          </div>
        </div>
        <div class="upload-zone" :class="{ 'upload-zone--active': isDropActive }" @drop="handleDrop" @dragover="onDragOver" @dragleave="onDragLeave">
          <img :src="assets.upload" alt="" class="upload-zone__icon" />
          <p class="upload-zone__title">{{ t(pageConfig.uploadSection.dropTitleKey) }}</p>
          <p class="upload-zone__desc">{{ t(pageConfig.uploadSection.dropDescKey) }}</p>
          <button type="button" class="primary-btn" @click="pickFiles">{{ t(pageConfig.uploadSection.buttonKey) }}</button>
          <p v-if="hintMessage" class="hint">{{ hintMessage }}</p>
        </div>
      </section>

      <section v-if="resultSummary" class="result-panel">
        <h3>{{ t("pages.videoConvert.result.title") }}</h3>
        <div class="result-grid">
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.videoConvert.result.total") }}</span>
            <strong>{{ resultSummary.total }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.videoConvert.result.success") }}</span>
            <strong class="result-item__success">{{ resultSummary.success }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.videoConvert.result.failed") }}</span>
            <strong class="result-item__failed">{{ resultSummary.failed }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.videoConvert.result.elapsed") }}</span>
            <strong>{{ formatElapsed(resultSummary.elapsedMs) }}</strong>
          </div>
        </div>
      </section>

      <section class="task-list">
        <h3>{{ t("pages.videoConvert.fileListTitle") }} ({{ items.length }})</h3>
        <div v-if="items.length === 0" class="task-empty">{{ t("common.noData") }}</div>
        <article v-for="item in items" :key="item.id" class="task-item">
          <div class="task-item__head">
            <div class="task-item__name">{{ item.fileName }}</div>
            <div class="task-item__status" :class="{ 'task-item__status--completed': item.status === 'completed' }">
              {{ t(`pages.videoConvert.status.${item.status}`) }}
            </div>
          </div>
          <div class="task-item__path">{{ item.inputPath }}</div>
          <div class="progress-row">
            <div class="progress-bar">
              <span class="progress-bar__value" :style="{ width: `${item.progress}%` }"></span>
            </div>
            <span>{{ item.progress }}%</span>
          </div>
          <div v-if="item.error" class="task-item__error">{{ item.error }}</div>
          <div v-if="item.outputPath" class="task-item__output">{{ item.outputPath }}</div>
          <div class="task-item__actions">
            <button
              v-if="item.status === 'failed' || item.status === 'cancelled'"
              type="button"
              class="secondary-btn secondary-btn--retry"
              @click="retryItem(item.id)"
            >
              {{ t("pages.videoConvert.retry") }}
            </button>
            <button v-if="item.status === 'completed'" type="button" class="secondary-btn" @click="pickSaveAsPath(item.id)">
              {{ t("pages.videoConvert.saveAs") }}
            </button>
            <button v-if="item.status === 'running'" type="button" class="secondary-btn" @click="cancelItem(item.id)">
              {{ t("pages.videoConvert.cancel") }}
            </button>
            <button v-else type="button" class="secondary-btn" @click="removeItem(item.id)">
              {{ t("pages.videoConvert.remove") }}
            </button>
          </div>
        </article>
      </section>

    </main>
    <div class="action-bar">
      <div class="action-bar__inner">
        <button type="button" class="primary-btn primary-btn--confirm" :disabled="!canStart" @click="startConvert">
          {{ isConverting ? t("pages.videoConvert.converting") : t("pages.videoConvert.startConvert") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-convert-page { background: #fff; border-radius: 16px; overflow: hidden; min-height: calc(100vh - 48px); padding-top: 74px; }
.content { padding: 24px 24px 104px; }
.upload-panel { border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; background: #fff; }
.upload-panel h2 { margin: 0; color: #111827; font-size: 20px; line-height: 28px; }
.desc { margin: 8px 0 0; color: #6b7280; line-height: 20px; }
.format-settings { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.format-option { border: 1px solid #d1d5db; border-radius: 12px; padding: 14px 16px; display: flex; gap: 10px; align-items: flex-start; cursor: pointer; transition: border-color 200ms ease, background-color 200ms ease, box-shadow 200ms ease; }
.format-option:hover { border-color: #c4b5fd; background: #faf5ff; }
.format-option--active { border-color: #7c3aed; background: #f3e8ff; box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.12); }
.format-option__radio { margin-top: 2px; accent-color: #7c3aed; }
.format-option__content { min-width: 0; }
.format-option__title { color: #0f172a; font-size: 14px; font-weight: 600; line-height: 22px; }
.format-option__desc { margin: 2px 0 0; color: #475569; font-size: 12px; line-height: 18px; }
.output-settings { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.output-option { border: 1px solid #d1d5db; border-radius: 12px; padding: 14px 16px; display: flex; gap: 10px; align-items: flex-start; cursor: pointer; transition: border-color 200ms ease, background-color 200ms ease, box-shadow 200ms ease; }
.output-option:hover { border-color: #67e8f9; background: #f0fdfa; }
.output-option--active { border-color: #0891b2; background: #ecfeff; box-shadow: 0 0 0 2px rgba(8, 145, 178, 0.12); }
.output-option__radio { margin-top: 2px; accent-color: #0e7490; }
.output-option__content { min-width: 0; }
.output-option__title { color: #0f172a; font-size: 14px; font-weight: 600; line-height: 22px; }
.output-option__desc { margin: 2px 0 0; color: #475569; font-size: 12px; line-height: 18px; }
.output-directory-panel { grid-column: 1 / -1; border: 1px solid #cbd5e1; border-radius: 12px; background: #f8fafc; padding: 10px 12px; display: flex; flex-wrap: wrap; gap: 10px 12px; align-items: center; min-height: 56px; transition: opacity 200ms ease, border-color 200ms ease, background-color 200ms ease; }
.output-directory-panel--inactive { opacity: 0.6; border-color: #e2e8f0; background: #f8fafc; }
.output-directory-panel__btn { margin: 0; }
.upload-zone { margin-top: 16px; border: 2px dashed #d1d5db; border-radius: 16px; background: #f9fafb; text-align: center; padding: 20px; }
.upload-zone--active { border-color: #1d4ed8; background: #eff6ff; }
.upload-zone__icon { width: 64px; height: 64px; }
.upload-zone__title { margin: 12px 0 0; font-size: 16px; font-weight: 500; line-height: 24px; }
.upload-zone__desc { margin: 0; color: #6b7280; line-height: 20px; }
.primary-btn { margin-top: 12px; border: none; border-radius: 8px; padding: 10px 24px; color: #fff; font-weight: 500; line-height: 20px; background: linear-gradient(90deg, #1d4ed8 0%, #1e3a8a 100%); }
.primary-btn--confirm { width: 100%; margin-top: 0; padding: 12px 0; font-size: 16px; font-weight: 700; line-height: 24px; }
.primary-btn--confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.secondary-btn { border: 1px solid #d1d5db; background: #fff; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
.secondary-btn--retry { color: #1d4ed8; border-color: #bfdbfe; background: #eff6ff; }
.path-tip { margin: 0; color: #475569; font-size: 12px; line-height: 18px; word-break: break-all; }
.hint { color: #b91c1c; margin: 8px 0 0; }
.task-list { margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
.task-empty { color: #6b7280; }
.task-item { border: 1px solid #f1f5f9; border-radius: 12px; padding: 12px; margin-top: 12px; }
.task-item__head { display: flex; justify-content: space-between; gap: 12px; }
.task-item__name { color: #111827; font-weight: 600; }
.task-item__status { color: #475569; font-size: 12px; }
.task-item__status--completed { color: #16a34a; font-weight: 600; }
.task-item__path { color: #6b7280; font-size: 12px; margin-top: 6px; word-break: break-all; }
.progress-row { margin-top: 8px; display: flex; gap: 8px; align-items: center; }
.progress-bar { flex: 1; height: 8px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
.progress-bar__value { display: block; height: 100%; background: #2563eb; }
.task-item__actions { display: flex; gap: 8px; margin-top: 8px; }
.task-item__error { margin-top: 8px; color: #b91c1c; font-size: 12px; }
.task-item__output { margin-top: 8px; color: #047857; font-size: 12px; word-break: break-all; }
.result-panel {
  margin-top: 16px;
  border: 1px solid #dcfce7;
  border-radius: 16px;
  background: rgba(240, 253, 244, 0.95);
  padding: 16px;
  position: sticky;
  top: 86px;
  z-index: 20;
  backdrop-filter: blur(4px);
  box-shadow: 0 8px 20px rgba(22, 101, 52, 0.08);
}
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

.video-convert-page :deep(.tool-top-bar) {
  box-shadow: 0 8px 14px rgba(15, 23, 42, 0.06);
}

@media (max-width: 768px) {
  .content { padding: 16px 16px 96px; }
  .upload-panel { padding: 16px; }
  .format-settings { grid-template-columns: 1fr; }
  .output-settings { grid-template-columns: 1fr; }
  .result-grid { grid-template-columns: 1fr; }
  .action-bar { bottom: 8px; }
  .action-bar__inner { max-width: calc(100% - 24px); }
}
</style>
