<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ROUTE_PATHS } from "@/config/constants";
import ToolPageTopBar from "@/components/common/ToolPageTopBar.vue";
import { useImageCompressActions } from "@/pages/image-compress/composables/useImageCompressActions";

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
  quality,
  targetFormat,
  resultSummary,
  canStart,
  formatElapsed,
  formatBytes,
  formatCompressionRatio,
  pickImages,
  pickSourceDirectory,
  pickOutputDirectory,
  startCompress,
  clearItems,
  removeItem,
  handleDrop,
  onDragOver,
  onDragLeave
} = useImageCompressActions();

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
  <div class="image-compress-page">
    <ToolPageTopBar title-key="common.backToHome" variant="compact" @back-home="backToHome" @open-settings="goToSettings" />
    <main class="image-compress-page__content">
      <section class="upload-panel">
        <h2>{{ t("pages.imageCompress.title") }}</h2>
        <p class="panel-desc">{{ t("pages.imageCompress.description") }}</p>

        <div class="control-grid">
          <div class="control-card">
            <div class="control-card__title">{{ t("pages.imageCompress.source.title") }}</div>
            <div class="control-card__actions">
              <button type="button" class="secondary-btn" @click="pickImages">{{ t("pages.imageCompress.source.pickImages") }}</button>
              <button type="button" class="secondary-btn" @click="pickSourceDirectory">
                {{ t("pages.imageCompress.source.pickDirectory") }}
              </button>
            </div>
            <p class="path-tip">{{ sourceDirectory || t("pages.imageCompress.source.directoryNotSelected") }}</p>
          </div>

          <div class="control-card">
            <div class="control-card__title">{{ t("pages.imageCompress.output.title") }}</div>
            <div class="control-card__actions">
              <button type="button" class="secondary-btn" @click="pickOutputDirectory">
                {{ t("pages.imageCompress.output.pickDirectory") }}
              </button>
            </div>
            <p class="path-tip">{{ outputDirectory || t("pages.imageCompress.output.defaultDirectory") }}</p>
          </div>
        </div>

        <div class="compress-settings">
          <div class="compress-settings__title">{{ t("pages.imageCompress.settings.title") }}</div>
          <div class="quality-row">
            <span>{{ t("pages.imageCompress.settings.quality") }}</span>
            <input v-model.number="quality" class="quality-slider" type="range" min="1" max="100" />
            <strong>{{ quality }}</strong>
          </div>
          <div class="format-row">
            <span>{{ t("pages.imageCompress.settings.format") }}</span>
            <label class="format-option" :class="{ 'format-option--active': targetFormat === 'jpg' }">
              <input v-model="targetFormat" type="radio" value="jpg" />
              <span>JPG</span>
            </label>
            <label class="format-option" :class="{ 'format-option--active': targetFormat === 'png' }">
              <input v-model="targetFormat" type="radio" value="png" />
              <span>PNG</span>
            </label>
            <label class="format-option" :class="{ 'format-option--active': targetFormat === 'webp' }">
              <input v-model="targetFormat" type="radio" value="webp" />
              <span>WEBP</span>
            </label>
          </div>
          <p class="scale-tip">{{ t("pages.imageCompress.settings.tip") }}</p>
        </div>

        <div class="upload-zone" :class="{ 'upload-zone--active': isDropActive }" @drop="handleDrop" @dragover="onDragOver" @dragleave="onDragLeave">
          <p class="upload-zone__title">{{ t("pages.imageCompress.upload.dropTitle") }}</p>
          <p class="upload-zone__desc">{{ t("pages.imageCompress.upload.dropDesc") }}</p>
          <button type="button" class="primary-btn" @click="pickImages">{{ t("pages.imageCompress.upload.button") }}</button>
          <p v-if="hintMessage" class="hint">{{ hintMessage }}</p>
        </div>
      </section>

      <section v-if="resultSummary" class="result-panel">
        <h3>{{ t("pages.imageCompress.result.title") }}</h3>
        <div class="result-grid">
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageCompress.result.total") }}</span>
            <strong>{{ resultSummary.total }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageCompress.result.success") }}</span>
            <strong class="result-item__success">{{ resultSummary.success }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageCompress.result.failed") }}</span>
            <strong class="result-item__failed">{{ resultSummary.failed }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageCompress.result.elapsed") }}</span>
            <strong>{{ formatElapsed(resultSummary.elapsedMs) }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageCompress.result.ratio") }}</span>
            <strong>{{ formatCompressionRatio(resultSummary.compressionRatio) }}</strong>
          </div>
          <div class="result-item">
            <span class="result-item__label">{{ t("pages.imageCompress.result.sizeChange") }}</span>
            <strong>{{ formatBytes(resultSummary.totalInputBytes) }} → {{ formatBytes(resultSummary.totalOutputBytes) }}</strong>
          </div>
        </div>
      </section>

      <section class="task-list">
        <div class="task-list__head">
          <h3>{{ t("pages.imageCompress.fileListTitle") }} ({{ items.length }})</h3>
          <button type="button" class="secondary-btn" :disabled="isProcessing" @click="clearItems">
            {{ t("pages.imageCompress.clearList") }}
          </button>
        </div>
        <p v-if="hiddenItemCount > 0" class="list-tip">
          {{ t("pages.imageCompress.listOverflowTip", { count: hiddenItemCount }) }}
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
              {{ t(`pages.imageCompress.status.${item.status}`) }}
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
          <p v-if="item.originalBytes || item.outputBytes" class="task-item__size">
            {{ item.originalBytes || "-" }} → {{ item.outputBytes || "-" }}
            <span v-if="item.compressionRatio" class="task-item__ratio">({{ item.compressionRatio }})</span>
          </p>
          <div v-if="item.outputPath" class="task-item__output">{{ item.outputPath }}</div>
          <div v-if="item.error" class="task-item__error">{{ item.error }}</div>
          <div class="task-item__actions">
            <button type="button" class="secondary-btn" :disabled="isProcessing" @click="removeItem(item.id)">
              {{ t("pages.imageCompress.remove") }}
            </button>
          </div>
        </article>
      </section>
    </main>
    <div class="action-bar">
      <div class="action-bar__inner">
        <button type="button" class="primary-btn primary-btn--confirm" :disabled="!canStart" @click="startCompress">
          {{ isProcessing ? t("pages.imageCompress.processing") : t("pages.imageCompress.start") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-compress-page { background: #fff; border-radius: 16px; overflow: hidden; min-height: calc(100vh - 48px); padding-top: 74px; }
.image-compress-page__content { padding: 24px 24px 104px; }
.upload-panel { border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; background: #fff; }
.upload-panel h2 { margin: 0; color: #111827; font-size: 20px; line-height: 28px; }
.panel-desc { margin: 8px 0 0; color: #64748b; font-size: 14px; line-height: 22px; }
.control-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.control-card { border: 1px solid #dbeafe; border-radius: 12px; padding: 12px; background: #f8fafc; min-width: 0; }
.control-card__title { color: #0f172a; font-size: 14px; font-weight: 600; line-height: 22px; }
.control-card__actions { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
.compress-settings { margin-top: 12px; border: 1px solid #dbeafe; border-radius: 12px; padding: 12px; background: #f8fafc; }
.compress-settings__title { color: #0f172a; font-size: 14px; font-weight: 600; line-height: 22px; }
.quality-row { margin-top: 8px; display: flex; align-items: center; gap: 8px; color: #334155; }
.quality-slider { flex: 1; }
.format-row { margin-top: 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: #334155; }
.format-option { border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: all 200ms ease; }
.format-option--active { border-color: #0284c7; background: #ecfeff; box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.14); }
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
.task-item__ratio { color: #0f766e; font-weight: 600; margin-left: 4px; }
.task-item__error { margin-top: 8px; color: #b91c1c; font-size: 12px; }
.task-item__output { margin-top: 8px; color: #047857; font-size: 12px; word-break: break-all; }
.task-item__actions { margin-top: 8px; display: flex; gap: 8px; }
.result-panel { margin-top: 16px; border: 1px solid #dcfce7; border-radius: 16px; background: rgba(240, 253, 244, 0.95); padding: 16px; position: sticky; top: 86px; z-index: 20; backdrop-filter: blur(4px); box-shadow: 0 8px 20px rgba(22, 101, 52, 0.08); }
.result-panel h3 { margin: 0; color: #166534; font-size: 16px; line-height: 24px; }
.result-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.result-item { border: 1px solid #bbf7d0; background: #fff; border-radius: 10px; padding: 10px; min-width: 0; }
.result-item__label { color: #475569; font-size: 12px; display: block; margin-bottom: 4px; }
.result-item__success { color: #15803d; }
.result-item__failed { color: #b91c1c; }
.action-bar { position: fixed; left: 0; right: 0; bottom: 12px; z-index: 40; pointer-events: none; }
.action-bar__inner { max-width: calc(100% - 48px); margin: 0 auto; padding: 10px; border-radius: 14px; background: rgba(255, 255, 255, 0.9); border: 1px solid #dbeafe; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12); backdrop-filter: blur(8px); pointer-events: auto; }
.image-compress-page :deep(.tool-top-bar) {
  box-shadow: 0 8px 14px rgba(15, 23, 42, 0.06);
}

@media (max-width: 1024px) {
  .result-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 768px) {
  .image-compress-page__content { padding: 16px 16px 96px; }
  .upload-panel { padding: 16px; }
  .control-grid { grid-template-columns: 1fr; }
  .task-list__head { flex-direction: column; align-items: flex-start; }
  .result-grid { grid-template-columns: 1fr; }
  .action-bar { bottom: 8px; }
  .action-bar__inner { max-width: calc(100% - 24px); }
}
</style>
