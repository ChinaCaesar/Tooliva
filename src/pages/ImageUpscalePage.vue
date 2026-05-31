<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { useImageUpscaleActions } from "@/pages/image-upscale/composables/useImageUpscaleActions";
import { useInterruptOnRouteLeave } from "@/composables/useInterruptOnRouteLeave";

const { t, locale } = useI18n();
const {
  items,
  visibleItems,
  hiddenItemCount,
  isProcessing,
  isDropActive,
  hintMessage,
  sourceDirectory,
  outputDirectory,
  outputDirectoryMode,
  scaleFactor,
  qualityMode,
  outputFormat,
  denoiseLevel,
  sharpenLevel,
  preserveTransparentBackground,
  concurrency,
  canStart,
  outputFooterPath,
  effectiveOutputDirectory,
  selectedCount,
  pickImages,
  pickSourceDirectory,
  pickAddFolder,
  pickOutputDirectory,
  openEffectiveOutputDirectory,
  startUpscale,
  interruptProcessing,
  clearItems,
  removeItem,
  removeSelected,
  resetUpscaleSettings,
  handleDrop,
  onDragOver,
  onDragLeave
} = useImageUpscaleActions();

useInterruptOnRouteLeave({
  when: () => isProcessing.value,
  message: () =>
    locale.value.startsWith("zh")
      ? "当前页面任务正在进行，切换页面会中断任务。确定切换吗？"
      : "A task is still running on this page. Switching pages will interrupt it. Continue?",
  interrupt: () => interruptProcessing()
});

const scaleOptions = [2, 3, 4] as const;
const modeOptions = ["fast", "standard", "high"] as const;
const formatOptions = ["original", "png", "jpg", "webp"] as const;
const outputModeOptions = ["source", "custom", "overwrite"] as const;
const adjustmentOptions = ["off", "low", "medium", "high"] as const;
const concurrencyOptions = ["auto", 1, 2, 4] as const;

function dash(): string {
  return t("pages.imageUpscale.table.dash");
}

function itemPreviewSrc(path: string): string {
  if (!path || !isTauri()) return "";
  try {
    return convertFileSrc(path);
  } catch {
    return "";
  }
}
</script>

<template>
  <div class="image-upscale-page">
    <div class="page-shell">
      <main class="page-main" role="main">
        <div class="workspace-grid">
          <div class="main-column">
            <header class="workspace-head">
              <div>
                <h2 class="workspace-head__title">{{ t("pages.imageUpscale.title") }}</h2>
                <p class="workspace-head__desc">{{ t("pages.imageUpscale.description") }}</p>
              </div>
            </header>

            <div class="main-column__body">
              <section
                class="upload-zone"
                :class="{ 'upload-zone--active': isDropActive }"
                @click.self="pickImages"
                @drop="handleDrop"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
              >
                <div class="upload-zone__icon" aria-hidden="true">
                  <svg viewBox="0 0 80 64" class="upload-zone__svg">
                    <rect x="6" y="14" width="36" height="28" rx="4" fill="#e0e7ff" stroke="#6366f1" stroke-width="1.5" />
                    <rect x="30" y="22" width="36" height="28" rx="4" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5" />
                    <circle cx="58" cy="18" r="12" fill="#2563eb" />
                    <path d="M58 13v10M53 18h10" stroke="#fff" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </div>
                <p class="upload-zone__title">{{ t("pages.imageUpscale.upload.dropTitle") }}</p>
                <p class="upload-zone__desc">{{ t("pages.imageUpscale.upload.dropDesc") }}</p>
                <div class="upload-zone__actions">
                  <button type="button" class="btn btn--primary btn--sm" :disabled="isProcessing" @click.stop="pickImages">
                    {{ t("pages.imageUpscale.upload.button") }}
                  </button>
                  <button type="button" class="btn btn--secondary btn--sm" :disabled="isProcessing" @click.stop="pickAddFolder">
                    {{ t("pages.imageUpscale.upload.addFolder") }}
                  </button>
                </div>
                <output v-if="hintMessage" class="hint">{{ hintMessage }}</output>
              </section>

              <section class="list-card" :aria-label="t('pages.imageUpscale.fileListTitle')">
                <div class="list-card__head">
                  <h3 class="list-card__title">{{ t("pages.imageUpscale.fileListTitle") }} ({{ items.length }})</h3>
                  <div v-if="items.length > 0" class="list-card__actions">
                    <button type="button" class="btn btn--secondary btn--sm" :disabled="isProcessing || items.length === 0" @click="clearItems">
                      {{ t("pages.imageUpscale.clearList") }}
                    </button>
                    <button
                      type="button"
                      class="btn btn--danger btn--sm"
                      :disabled="isProcessing || selectedCount === 0"
                      @click="removeSelected"
                    >
                      {{ t("pages.imageUpscale.deleteSelected") }}
                    </button>
                  </div>
                </div>
                <p v-if="hiddenItemCount > 0" class="list-card__tip">
                  {{ t("pages.imageUpscale.listOverflowTip", { count: hiddenItemCount }) }}
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
                    <p class="list-empty__title">{{ t("pages.imageUpscale.empty.title") }}</p>
                    <p class="list-empty__desc">{{ t("pages.imageUpscale.empty.desc") }}</p>
                  </div>

                  <div v-else class="table-wrap">
                    <table class="task-table task-table--centered">
                      <thead>
                        <tr>
                          <th scope="col" class="task-table__th-name">{{ t("pages.imageUpscale.table.fileName") }}</th>
                          <th scope="col">{{ t("pages.imageUpscale.table.originalSize") }}</th>
                          <th scope="col">{{ t("pages.imageUpscale.table.outputSize") }}</th>
                          <th scope="col">{{ t("pages.imageUpscale.table.outputFormat") }}</th>
                          <th scope="col">{{ t("pages.imageUpscale.table.preview") }}</th>
                          <th scope="col">{{ t("pages.imageUpscale.table.status") }}</th>
                          <th scope="col">{{ t("pages.imageUpscale.table.progress") }}</th>
                          <th scope="col" class="task-table__col-action">{{ t("pages.imageUpscale.table.operation") }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in visibleItems" :key="item.id">
                          <td class="task-table__cell-name" :title="item.inputPath">
                            <span class="task-table__name">{{ item.fileName }}</span>
                            <p v-if="item.error" class="task-table__err">{{ item.error }}</p>
                            <p v-if="item.outputPath" class="task-table__out">{{ item.outputPath }}</p>
                          </td>
                          <td class="task-table__cell-muted">{{ item.originalSize ?? dash() }}</td>
                          <td class="task-table__cell-muted">{{ item.outputSize ?? dash() }}</td>
                          <td>{{ item.outputFormat ?? dash() }}</td>
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
                              {{ t(`pages.imageUpscale.status.${item.status}`) }}
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
                              :aria-label="t('pages.imageUpscale.removeAria')"
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
                  </div>
                </div>
              </section>
            </div>
          </div>

          <aside class="settings-rail" :aria-label="t('pages.imageUpscale.settings.title')">
            <section class="settings-block">
              <div class="settings-block__title">{{ t("pages.imageUpscale.settings.title") }}</div>
              <div class="field-group">
                <span class="field-label">{{ t("pages.imageUpscale.settings.scale") }}</span>
                <div class="choice-row" role="radiogroup" :aria-label="t('pages.imageUpscale.settings.scale')">
                  <label v-for="option in scaleOptions" :key="option" class="choice-pill" :class="{ 'choice-pill--active': scaleFactor === option }">
                    <input v-model="scaleFactor" type="radio" :value="option" :disabled="isProcessing" />
                    <span>{{ option }}x</span>
                  </label>
                </div>
              </div>

              <div class="field-group">
                <label class="field-label" for="upscale-mode">{{ t("pages.imageUpscale.settings.mode") }}</label>
                <select id="upscale-mode" v-model="qualityMode" class="field-select" :disabled="isProcessing">
                  <option v-for="option in modeOptions" :key="option" :value="option">
                    {{ t(`pages.imageUpscale.options.mode.${option}`) }}
                  </option>
                </select>
              </div>

              <div class="field-group">
                <span class="field-label">{{ t("pages.imageUpscale.settings.outputFormat") }}</span>
                <div class="format-grid" role="radiogroup" :aria-label="t('pages.imageUpscale.settings.outputFormat')">
                  <label v-for="option in formatOptions" :key="option" class="choice-pill" :class="{ 'choice-pill--active': outputFormat === option }">
                    <input v-model="outputFormat" type="radio" :value="option" :disabled="isProcessing" />
                    <span>{{ t(`pages.imageUpscale.options.format.${option}`) }}</span>
                  </label>
                </div>
              </div>

              <div class="field-group">
                <span class="field-label">{{ t("common.outputMode") }}</span>
                <div class="format-grid" role="radiogroup" :aria-label="t('common.outputMode')">
                  <label
                    v-for="option in outputModeOptions"
                    :key="option"
                    class="choice-pill"
                    :class="{ 'choice-pill--active': outputDirectoryMode === option }"
                  >
                    <input v-model="outputDirectoryMode" type="radio" :value="option" :disabled="isProcessing" />
                    <span>{{ t(`common.outputModes.${option}`) }}</span>
                  </label>
                </div>
              </div>

              <p class="settings-tip">{{ t("pages.imageUpscale.settings.tip") }}</p>
            </section>

            <section class="settings-block">
              <div class="settings-block__title">{{ t("pages.imageUpscale.advanced.title") }}</div>
              <div class="field-group">
                <label class="field-label" for="upscale-denoise">{{ t("pages.imageUpscale.advanced.denoise") }}</label>
                <select id="upscale-denoise" v-model="denoiseLevel" class="field-select" :disabled="isProcessing">
                  <option v-for="option in adjustmentOptions" :key="option" :value="option">
                    {{ t(`pages.imageUpscale.options.level.${option}`) }}
                  </option>
                </select>
              </div>
              <div class="field-group">
                <label class="field-label" for="upscale-sharpen">{{ t("pages.imageUpscale.advanced.sharpen") }}</label>
                <select id="upscale-sharpen" v-model="sharpenLevel" class="field-select" :disabled="isProcessing">
                  <option v-for="option in adjustmentOptions" :key="option" :value="option">
                    {{ t(`pages.imageUpscale.options.level.${option}`) }}
                  </option>
                </select>
              </div>
              <label class="switch-row" for="upscale-alpha">
                <span>{{ t("pages.imageUpscale.advanced.preserveAlpha") }}</span>
                <input id="upscale-alpha" v-model="preserveTransparentBackground" type="checkbox" :disabled="isProcessing" />
              </label>
              <div class="field-group">
                <label class="field-label" for="upscale-concurrency">{{ t("pages.imageUpscale.advanced.concurrency") }}</label>
                <select id="upscale-concurrency" v-model="concurrency" class="field-select" :disabled="isProcessing">
                  <option v-for="option in concurrencyOptions" :key="option" :value="option">
                    {{ t(`pages.imageUpscale.options.concurrency.${option}`) }}
                  </option>
                </select>
              </div>
              <button type="button" class="reset-link" :disabled="isProcessing" @click="resetUpscaleSettings">
                {{ t("pages.imageUpscale.advanced.reset") }}
              </button>
            </section>
          </aside>
        </div>
      </main>

      <footer class="bottom-bar">
        <div class="bottom-bar__left">
          <span class="bottom-bar__label">{{ t("pages.imageUpscale.footer.saveTo") }}</span>
          <span class="bottom-bar__path" :title="outputFooterPath">{{ outputFooterPath }}</span>
          <button
            v-if="outputDirectoryMode !== 'overwrite'"
            type="button"
            class="btn btn--link"
            :disabled="isProcessing"
            @click="pickOutputDirectory"
          >
            {{ t("pages.imageUpscale.footer.changeOutput") }}
          </button>
          <button
            v-if="outputDirectoryMode !== 'overwrite'"
            type="button"
            class="btn btn--link"
            :disabled="!effectiveOutputDirectory"
            @click="openEffectiveOutputDirectory"
          >
            {{ t("pages.imageUpscale.footer.openDirectory") }}
          </button>
        </div>
        <button
          type="button"
          class="btn btn--primary btn--start"
          :disabled="!canStart"
          :aria-busy="isProcessing"
          @click="startUpscale"
        >
          {{ isProcessing ? t("pages.imageUpscale.processing") : t("pages.imageUpscale.start") }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.image-upscale-page {
  --surface-muted: #f5f6fa;
  --surface: #ffffff;
  --border: #eef0f4;
  --border-weak: #e7e9ee;
  --text: #1f2937;
  --text-secondary: #4b5563;
  --text-muted: #6b7280;
  --text-hint: #9ca3af;
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --danger: #ef4444;
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f6fa;
  min-width: 0;
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
  overflow: hidden;
}

.workspace-grid {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 350px);
  gap: 14px;
  align-items: stretch;
  overflow: hidden;
}

.main-column {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.workspace-head {
  flex-shrink: 0;
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

.main-column__body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 18px;
  padding-right: 2px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
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

.control-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.control-card,
.settings-block,
.task-section {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fafbfd;
}

.control-card {
  padding: 14px;
}

.control-card__title,
.settings-block__title,
.task-toolbar__title {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--text);
}

.path-tip,
.list-tip,
.settings-tip,
.hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  word-break: break-word;
}

.hint {
  color: var(--danger);
}

.control-card__actions,
.upload-zone__actions,
.task-toolbar__actions,
.choice-row,
.format-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.control-card__actions,
.upload-zone__actions {
  margin-top: 12px;
}

.upload-zone {
  flex-shrink: 0;
  border: 1px dashed #d6d9e0;
  border-radius: 16px;
  background: #fafbfd;
  text-align: center;
  padding: 28px 18px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.upload-zone:hover,
.upload-zone--active {
  border-color: #c7d2fe;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
}

.upload-zone--active {
  background: #f5f6fa;
}

.upload-zone__icon {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.upload-zone__svg {
  width: 80px;
  height: 64px;
  filter: drop-shadow(0 8px 20px rgba(99, 102, 241, 0.14));
}

.upload-zone__title,
.task-empty__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.upload-zone__desc,
.task-empty__desc {
  margin: 6px 0 0;
  color: var(--text-hint);
  font-size: 13px;
  line-height: 1.5;
}

.upload-zone__actions {
  justify-content: center;
}

.upload-zone__actions .btn {
  box-sizing: border-box;
  min-width: 96px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  line-height: 1;
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

.list-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.list-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
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
  width: 18%;
}

.task-table__name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
  max-width: 100%;
  margin: 0;
  color: var(--text);
  font-weight: 600;
  line-height: 1.35;
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
  color: var(--text-muted);
  font-size: 12px;
}

.task-table__status--ok {
  color: #22c55e;
  font-weight: 600;
}

.task-table__status--bad {
  color: #dc2626;
  font-weight: 600;
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

.settings-rail {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}

.settings-block {
  padding: 16px;
  background: var(--surface);
}

.field-group {
  margin-top: 14px;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.field-select {
  width: 100%;
  height: 36px;
  border: 1px solid var(--border-weak);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  padding: 0 10px;
  outline: none;
}

.field-select:focus-visible {
  border-color: #c7d2fe;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.format-grid {
  align-items: stretch;
}

.choice-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 7px 12px;
  border: 1px solid var(--border-weak);
  border-radius: 999px;
  color: var(--text-secondary);
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}

.choice-pill input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.choice-pill--active {
  border-color: #c7d2fe;
  color: var(--primary-dark);
  background: #eef2ff;
}

.switch-row {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
}

.reset-link {
  margin-top: 14px;
  border: 0;
  background: transparent;
  color: #f97316;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.bottom-bar {
  flex-shrink: 0;
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
}

.bottom-bar__left {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
  font-size: 12px;
}

.bottom-bar__label {
  color: var(--text-hint);
  flex-shrink: 0;
}

.bottom-bar__path {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn {
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    box-shadow 0.15s,
    filter 0.15s,
    border-color 0.15s;
}

.btn:disabled,
.choice-pill:has(input:disabled),
.reset-link:disabled,
.switch-row:has(input:disabled) {
  cursor: default;
  opacity: 0.58;
}

.btn:focus-visible,
.choice-pill:focus-within,
.reset-link:focus-visible,
.task-table__checkbox:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

.btn--primary {
  background: var(--primary);
  color: #fff;
  padding: 10px 18px;
  font-weight: 600;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.22);
}

.btn--primary:hover:not(:disabled) {
  background: var(--primary-dark);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.28);
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

.btn--danger {
  color: #dc2626;
  border-color: #fee2e2;
  background: #fff7f7;
}

.btn--link {
  padding: 4px 0;
  border: none;
  background: transparent;
  color: var(--accent-link);
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

.btn--sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn--xs {
  padding: 5px 10px;
}

.btn--start {
  padding: 12px 28px;
  font-size: 15px;
  flex-shrink: 0;
  border-radius: 999px;
  min-width: 132px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.22);
}

@media (max-width: 980px) {
  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-rail {
    overflow: visible;
  }

  .control-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .upload-zone {
    transition: none;
  }
}
</style>
