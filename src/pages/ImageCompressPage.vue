<script setup lang="ts">
import { ref, watchEffect, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useImageCompressActions } from "@/pages/image-compress/composables/useImageCompressActions";

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
  resolutionPreset,
  maxWidthBound,
  maxHeightBound,
  resultSummary,
  canStart,
  allVisibleSelected,
  someVisibleSelected,
  selectedCount,
  formatElapsed,
  formatBytes,
  formatCompressionRatio,
  pickImages,
  pickSourceDirectory,
  pickAddFolder,
  pickOutputDirectory,
  startCompress,
  clearItems,
  removeItem,
  removeSelected,
  toggleItemSelected,
  toggleSelectAllVisible,
  isItemSelected,
  resetCompressSettings,
  handleDrop,
  onDragOver,
  onDragLeave
} = useImageCompressActions();

const selectAllCheckboxRef = ref<HTMLInputElement | null>(null);

watchEffect(() => {
  const el = selectAllCheckboxRef.value;
  if (!el) return;
  el.indeterminate = someVisibleSelected.value && !allVisibleSelected.value;
});

function dash(): string {
  return t("pages.imageCompress.table.dash");
}

function resolutionCell(item: { originalSize?: string }): string {
  return item.originalSize ?? dash();
}

function onMaxWidthInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  maxWidthBound.value = raw === "" ? null : Math.max(1, Number.parseInt(raw, 10) || 1);
}

function onMaxHeightInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  maxHeightBound.value = raw === "" ? null : Math.max(1, Number.parseInt(raw, 10) || 1);
}

const outputFooterPath = computed(() =>
  outputDirectory.value.trim().length > 0
    ? outputDirectory.value.trim()
    : t("pages.imageCompress.output.defaultDirectory")
);
</script>

<template>
  <div class="image-compress-page">
    <div class="page-shell">
      <div class="page-main">
        <div class="workspace-grid">
          <div class="main-column">
            <header class="workspace-head">
              <div class="workspace-head__text">
                <h2 class="workspace-head__title">{{ t("pages.imageCompress.title") }}</h2>
                <p class="workspace-head__desc">{{ t("pages.imageCompress.description") }}</p>
              </div>
            </header>

            <div class="main-column__body">
            

              <div
                class="upload-zone"
                :class="{ 'upload-zone--active': isDropActive }"
                @click.self="pickImages"
                @drop="handleDrop"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
              >
                <div class="upload-zone__icon" aria-hidden="true">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M7 15l3-3 2 2 4-4" />
                    <circle cx="8.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <p class="upload-zone__title">{{ t("pages.imageCompress.upload.dropTitle") }}</p>
                <p class="upload-zone__desc">{{ t("pages.imageCompress.upload.formatsLine") }}</p>
                <div class="upload-zone__actions">
                  <button type="button" class="primary-btn primary-btn--sm btn-touch" @click.stop="pickImages">
                    {{ t("pages.imageCompress.upload.button") }}
                  </button>
                  <button type="button" class="secondary-btn btn-touch" @click.stop="pickAddFolder">
                    {{ t("pages.imageCompress.upload.addFolder") }}
                  </button>
                </div>
                <p v-if="hintMessage" class="hint">{{ hintMessage }}</p>
              </div>

              <section class="task-section" :aria-label="t('pages.imageCompress.fileListTitle')">
                <div class="task-toolbar">
                  <h3 class="task-toolbar__title">{{ t("pages.imageCompress.fileListTitle") }} ({{ items.length }})</h3>
                  <div class="task-toolbar__actions">
                    <button type="button" class="secondary-btn btn-touch" :disabled="isProcessing" @click="clearItems">
                      {{ t("pages.imageCompress.clearList") }}
                    </button>
                    <button
                      type="button"
                      class="toolbar-danger btn-touch"
                      :disabled="isProcessing || selectedCount === 0"
                      @click="removeSelected"
                    >
                      {{ t("pages.imageCompress.deleteSelected") }}
                    </button>
                  </div>
                </div>
                <p v-if="hiddenItemCount > 0" class="list-tip">
                  {{ t("pages.imageCompress.listOverflowTip", { count: hiddenItemCount }) }}
                </p>

                <div v-if="items.length === 0" class="task-empty">
                  <div class="task-empty__icon" aria-hidden="true">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1">
                      <path d="M4 6h16v12H4z" />
                      <path d="M8 10h8M8 14h5" />
                    </svg>
                  </div>
                  <p class="task-empty__title">{{ t("pages.imageCompress.empty.title") }}</p>
                  <p class="task-empty__desc">{{ t("pages.imageCompress.empty.desc") }}</p>
                </div>

                <div v-else class="table-scroll">
                  <table class="task-table">
                    <thead>
                      <tr>
                        <th class="task-table__col-check" scope="col">
                          <input
                            ref="selectAllCheckboxRef"
                            type="checkbox"
                            class="task-table__checkbox"
                            :checked="allVisibleSelected"
                            :aria-label="t('pages.imageCompress.table.selectAll')"
                            :disabled="isProcessing"
                            @change="toggleSelectAllVisible"
                          />
                        </th>
                        <th scope="col">{{ t("pages.imageCompress.table.fileName") }}</th>
                        <th scope="col">{{ t("pages.imageCompress.table.originalSize") }}</th>
                        <th scope="col">{{ t("pages.imageCompress.table.resolution") }}</th>
                        <th scope="col">{{ t("pages.imageCompress.table.compressedSize") }}</th>
                        <th scope="col">{{ t("pages.imageCompress.table.status") }}</th>
                        <th scope="col">{{ t("pages.imageCompress.table.progress") }}</th>
                        <th class="task-table__col-op" scope="col">{{ t("pages.imageCompress.table.operation") }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in visibleItems" :key="item.id">
                        <td>
                          <input
                            type="checkbox"
                            class="task-table__checkbox"
                            :checked="isItemSelected(item.id)"
                            :aria-label="t('pages.imageCompress.table.selectRow')"
                            :disabled="isProcessing"
                            @change="toggleItemSelected(item.id)"
                          />
                        </td>
                        <td class="task-table__cell-name">{{ item.fileName }}</td>
                        <td>{{ item.originalBytes ?? dash() }}</td>
                        <td>{{ resolutionCell(item) }}</td>
                        <td>{{ item.outputBytes ?? dash() }}</td>
                        <td
                          :class="{
                            'task-table__status--ok': item.status === 'completed',
                            'task-table__status--bad': item.status === 'failed'
                          }"
                        >
                          {{ t(`pages.imageCompress.status.${item.status}`) }}
                        </td>
                        <td>
                          <div class="progress-inline">
                            <progress class="progress-native" :value="item.progress" max="100">
                              {{ item.progress }}%
                            </progress>
                            <span class="progress-inline__pct">{{ item.progress }}%</span>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            class="secondary-btn secondary-btn--compact btn-touch"
                            :disabled="isProcessing"
                            @click="removeItem(item.id)"
                          >
                            {{ t("pages.imageCompress.remove") }}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
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
            </div>
          </div>

          <aside class="settings-rail" :aria-label="t('pages.imageCompress.settings.title')">
            <div class="settings-block">
              <div class="settings-block__title">{{ t("pages.imageCompress.settings.title") }}</div>
              <div class="quality-block">
                <div class="quality-block__head">
                  <span>{{ t("pages.imageCompress.settings.quality") }}</span>
                  <span class="quality-block__value" aria-live="polite">{{ quality }}</span>
                </div>
                <div class="quality-block__slider-row">
                  <span class="quality-block__edge">{{ t("pages.imageCompress.settings.qualityLow") }}</span>
                  <input v-model.number="quality" class="quality-slider" type="range" min="1" max="100" :disabled="isProcessing" />
                  <span class="quality-block__edge">{{ t("pages.imageCompress.settings.qualityHigh") }}</span>
                </div>
              </div>
              <div class="format-block">
                <span class="format-block__label">{{ t("pages.imageCompress.settings.format") }}</span>
                <div class="format-row" role="radiogroup" :aria-label="t('pages.imageCompress.settings.format')">
                  <label class="format-option" :class="{ 'format-option--active': targetFormat === 'auto' }">
                    <input v-model="targetFormat" type="radio" value="auto" :disabled="isProcessing" />
                    <span class="format-option__radio" aria-hidden="true">
                      <span v-if="targetFormat === 'auto'" class="format-option__radio-dot" />
                    </span>
                    <span class="format-option__text">{{ t("pages.imageCompress.settings.formatAuto") }}</span>
                  </label>
                  <label class="format-option" :class="{ 'format-option--active': targetFormat === 'jpg' }">
                    <input v-model="targetFormat" type="radio" value="jpg" :disabled="isProcessing" />
                    <span class="format-option__radio" aria-hidden="true">
                      <span v-if="targetFormat === 'jpg'" class="format-option__radio-dot" />
                    </span>
                    <span class="format-option__text">JPG</span>
                  </label>
                  <label class="format-option" :class="{ 'format-option--active': targetFormat === 'png' }">
                    <input v-model="targetFormat" type="radio" value="png" :disabled="isProcessing" />
                    <span class="format-option__radio" aria-hidden="true">
                      <span v-if="targetFormat === 'png'" class="format-option__radio-dot" />
                    </span>
                    <span class="format-option__text">PNG</span>
                  </label>
                  <label class="format-option" :class="{ 'format-option--active': targetFormat === 'webp' }">
                    <input v-model="targetFormat" type="radio" value="webp" :disabled="isProcessing" />
                    <span class="format-option__radio" aria-hidden="true">
                      <span v-if="targetFormat === 'webp'" class="format-option__radio-dot" />
                    </span>
                    <span class="format-option__text">WEBP</span>
                  </label>
                </div>
              </div>
              <p class="scale-tip">{{ t("pages.imageCompress.settings.tip") }}</p>
            </div>

            <details class="advanced-block" open>
              <summary class="advanced-block__summary">{{ t("pages.imageCompress.advanced.title") }}</summary>
              <div class="advanced-block__body">
                <label class="field-label" for="compress-resolution">{{ t("pages.imageCompress.advanced.resolution") }}</label>
                <select id="compress-resolution" v-model="resolutionPreset" class="field-select" :disabled="isProcessing">
                  <option value="original">{{ t("pages.imageCompress.advanced.resolutionOriginal") }}</option>
                  <option value="bounded">{{ t("pages.imageCompress.advanced.resolutionBounded") }}</option>
                </select>

                <div class="bound-row">
                  <label class="field-label" for="compress-max-w">{{ t("pages.imageCompress.advanced.maxWidth") }}</label>
                  <div class="bound-input-wrap">
                    <input
                      id="compress-max-w"
                      type="number"
                      min="1"
                      class="field-input"
                      :placeholder="t('pages.imageCompress.advanced.noLimit')"
                      :value="maxWidthBound ?? ''"
                      :disabled="isProcessing || resolutionPreset !== 'bounded'"
                      @input="onMaxWidthInput"
                    />
                    <span class="bound-suffix">px</span>
                  </div>
                </div>
                <div class="bound-row">
                  <label class="field-label" for="compress-max-h">{{ t("pages.imageCompress.advanced.maxHeight") }}</label>
                  <div class="bound-input-wrap">
                    <input
                      id="compress-max-h"
                      type="number"
                      min="1"
                      class="field-input"
                      :placeholder="t('pages.imageCompress.advanced.noLimit')"
                      :value="maxHeightBound ?? ''"
                      :disabled="isProcessing || resolutionPreset !== 'bounded'"
                      @input="onMaxHeightInput"
                    />
                    <span class="bound-suffix">px</span>
                  </div>
                </div>

                <p class="advanced-note">{{ t("pages.imageCompress.advanced.notWired") }}</p>
                <div class="switch-row">
                  <label class="switch-label" for="compress-sharpen">{{ t("pages.imageCompress.advanced.sharpen") }}</label>
                  <input id="compress-sharpen" type="checkbox" disabled class="switch-input" :aria-label="t('pages.imageCompress.advanced.sharpen')" />
                </div>
                <p class="field-hint">{{ t("pages.imageCompress.advanced.sharpenHint") }}</p>
                <div class="switch-row">
                  <label class="switch-label" for="compress-exif">{{ t("pages.imageCompress.advanced.exif") }}</label>
                  <input id="compress-exif" type="checkbox" disabled checked class="switch-input" :aria-label="t('pages.imageCompress.advanced.exif')" />
                </div>
                <p class="field-hint">{{ t("pages.imageCompress.advanced.exifHint") }}</p>

                <button type="button" class="reset-link btn-touch" :disabled="isProcessing" @click="resetCompressSettings">
                  {{ t("pages.imageCompress.advanced.reset") }}
                </button>
              </div>
            </details>
          </aside>
        </div>
      </div>

      <footer class="bottom-bar">
        <div class="bottom-bar__left">
          <div class="bottom-bar__row">
            <span class="bottom-bar__label">{{ t("pages.imageCompress.footer.saveTo") }}</span>
            <span class="bottom-bar__path" :title="outputFooterPath">{{ outputFooterPath }}</span>
            <button type="button" class="btn btn--link" :disabled="isProcessing" @click="pickOutputDirectory">
              {{ t("pages.imageCompress.footer.changeOutput") }}
            </button>
          </div>
        </div>
        <button
          type="button"
          class="btn btn--primary btn--start"
          :disabled="!canStart"
          :aria-busy="isProcessing"
          @click="startCompress"
        >
          {{ isProcessing ? t("pages.imageCompress.processing") : t("pages.imageCompress.start") }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.image-compress-page {
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
  --accent-link: #f97316;
  --accent-link-hover: #ea580c;
  --cta-shadow: 0 4px 12px rgba(243, 132, 30, 0.25);
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface-muted);
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
  flex: 1;
}

.workspace-head {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
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

.control-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.control-card {
  border: 1px solid #dbeafe;
  border-radius: 14px;
  padding: 14px;
  background: #fafbfd;
  min-width: 0;
}

.control-card__title {
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.control-card__actions {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.path-tip {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.path-tip--muted {
  color: var(--text-hint);
}

.upload-zone {
  flex-shrink: 0;
  border: 1px dashed #d6d9e0;
  border-radius: 14px;
  background: #fafbfd;
  text-align: center;
  padding: 22px 16px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.upload-zone:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.upload-zone:hover {
  border-color: #c7d2fe;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
}

.upload-zone--active {
  border-color: #c7d2fe;
  background: #f5f6fa;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.upload-zone__icon {
  display: flex;
  justify-content: center;
  color: #b1b6c2;
  margin-bottom: 8px;
}

.upload-zone__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.upload-zone__desc {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.upload-zone__actions {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.hint {
  color: #ef4444;
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.45;
}

.task-section {
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  background: #fafbfd;
  min-width: 0;
}

.task-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.task-toolbar__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.task-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.toolbar-danger {
  border: none;
  background: transparent;
  color: #dc2626;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  padding: 8px 10px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.toolbar-danger:hover:not(:disabled) {
  background: #fee2e2;
}

.toolbar-danger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.list-tip {
  margin: 8px 0 0;
  color: var(--primary);
  font-size: 12px;
  line-height: 1.5;
}

.task-empty {
  margin-top: 16px;
  padding: 28px 16px;
  text-align: center;
  color: var(--text-muted);
  border: 1px dashed #e0e3ea;
  border-radius: 14px;
  background: #f5f6fa;
}

.task-empty__icon {
  display: flex;
  justify-content: center;
  color: #c7cad1;
  margin-bottom: 10px;
}

.task-empty__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.task-empty__desc {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.table-scroll {
  margin-top: 12px;
  overflow-x: auto;
  max-width: 100%;
}

.task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0;
}

.task-table th,
.task-table td {
  border-bottom: 1px solid #e7e9ee;
  padding: 10px 8px;
  text-align: left;
  vertical-align: middle;
}

.task-table th {
  font-weight: 600;
  color: var(--text);
  background: #ffffff;
  white-space: nowrap;
}

.task-table__col-check {
  width: 40px;
}

.task-table__col-op {
  white-space: nowrap;
}

.task-table__cell-name {
  font-weight: 600;
  color: var(--text);
  word-break: break-word;
  max-width: 220px;
}

.task-table__checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary);
}

.task-table__status--ok {
  color: #22c55e;
  font-weight: 600;
}

.task-table__status--bad {
  color: #dc2626;
  font-weight: 600;
}

.progress-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.progress-native {
  flex: 1;
  height: 10px;
  border: none;
  border-radius: 999px;
  overflow: hidden;
  accent-color: var(--primary);
}

.progress-native::-webkit-progress-bar {
  background: #e7e9ee;
  border-radius: 999px;
}

.progress-native::-webkit-progress-value {
  background: var(--primary);
  border-radius: 999px;
}

.progress-native::-moz-progress-bar {
  background: var(--primary);
  border-radius: 999px;
}

.progress-inline__pct {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: right;
}

.settings-rail {
  align-self: stretch;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px 18px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}

.settings-rail::-webkit-scrollbar {
  width: 6px;
}
.settings-rail::-webkit-scrollbar-thumb {
  background: #d6d9e0;
  border-radius: 3px;
}

.settings-block__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
  margin-bottom: 10px;
  letter-spacing: 0;
}

.quality-block__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.quality-block__value {
  min-width: 36px;
  text-align: center;
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid var(--border-weak);
  font-weight: 700;
  color: var(--text);
  background: #fafbfd;
}

.quality-block__slider-row {
  margin-top: 8px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
}

.quality-block__edge {
  font-size: 11px;
  color: var(--text-hint);
  max-width: 52px;
  line-height: 1;
}

.quality-slider {
  width: 100%;
  accent-color: var(--primary);
}

.format-block {
  margin-top: 14px;
}

.format-block__label {
  font-size: 13px;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 8px;
}

.format-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.format-option {
  position: relative;
  min-width: 0;
  border: 1px solid var(--border-weak);
  border-radius: 12px;
  padding: 10px 12px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
  min-height: 44px;
  box-sizing: border-box;
  background: #fff;
}

.format-option--active {
  border-color: #c7d2fe;
  background: #ffffff;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.12);
}

.format-option__radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #d6d9e0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

.format-option--active .format-option__radio {
  border-color: var(--primary);
}

.format-option__radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}

.format-option__text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0;
}

.format-option input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.scale-tip {
  margin: 10px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.advanced-block {
  margin-top: 4px;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0 12px 12px;
  background: #fafbfd;
}

.advanced-block__summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  padding: 12px 0;
  color: var(--text);
  list-style: none;
}

.advanced-block__summary::-webkit-details-marker {
  display: none;
}

.advanced-block__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.field-select,
.field-input {
  width: 100%;
  border: 1px solid var(--border-weak);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  min-height: 44px;
  box-sizing: border-box;
  background: #fff;
  color: var(--text);
}

.field-select:focus-visible,
.field-input:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-color: #c7d2fe;
}

.bound-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bound-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bound-suffix {
  font-size: 13px;
  color: var(--text-muted);
}

.advanced-note {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-muted);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.switch-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.switch-input {
  width: 20px;
  height: 20px;
  accent-color: var(--primary);
}

.field-hint {
  margin: -4px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-hint);
}

.reset-link {
  margin-top: 4px;
  border: none;
  background: transparent;
  color: var(--accent-link);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
}

.reset-link:hover:not(:disabled) {
  color: var(--accent-link-hover);
}

.reset-link:focus-visible {
  outline: 2px solid var(--accent-link);
  outline-offset: 2px;
  border-radius: 4px;
}

.reset-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-btn {
  border: none;
  border-radius: 999px;
  padding: 10px 20px;
  color: #fff;
  font-weight: 600;
  line-height: 20px;
  background: var(--primary);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.22);
  cursor: pointer;
  transition:
    opacity 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}

.primary-btn:hover:not(:disabled) {
  background: var(--primary-dark);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.28);
}

.primary-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.primary-btn--sm {
  padding: 10px 18px;
  font-size: 14px;
}

.primary-btn--confirm {
  min-width: 160px;
  padding: 12px 24px;
  font-size: 15px;
}

.primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.secondary-btn {
  border: 1px solid var(--border-weak);
  background: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: var(--text-secondary);
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}

.secondary-btn:hover:not(:disabled) {
  border-color: #dbeafe;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.06);
}

.secondary-btn--compact {
  padding: 6px 10px;
  font-size: 13px;
}

.secondary-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.secondary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-touch {
  min-height: 44px;
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
    box-shadow 0.15s;
}

.btn:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

.btn--primary {
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
  color: #ffffff;
  padding: 10px 18px;
  font-weight: 700;
  box-shadow: var(--cta-shadow);
}

.btn--primary:hover:not(:disabled) {
  filter: brightness(1.03);
  box-shadow: 0 6px 16px rgba(243, 132, 30, 0.32);
}

.btn--primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--link {
  background: none;
  border: none;
  color: var(--accent-link);
  padding: 4px 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
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

.result-panel {
  flex-shrink: 0;
  margin-top: 4px;
  border: 1px solid #bbf7d0;
  border-radius: 14px;
  background: rgba(240, 253, 244, 0.95);
  padding: 14px 16px;
}

.result-panel h3 {
  margin: 0;
  color: #166534;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.result-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.result-item {
  border: 1px solid #bbf7d0;
  background: #fff;
  border-radius: 10px;
  padding: 10px;
  min-width: 0;
}

.result-item__label {
  color: var(--text-secondary);
  font-size: 12px;
  display: block;
  margin-bottom: 4px;
}

.result-item__success {
  color: #22c55e;
}

.result-item__failed {
  color: #dc2626;
}

@media (prefers-reduced-motion: reduce) {
  .upload-zone,
  .primary-btn,
  .secondary-btn,
  .format-option,
  .btn--primary {
    transition-duration: 0.01ms !important;
  }
}

@media (max-width: 1023px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .settings-rail {
    max-height: none;
    order: 2;
  }

  .main-column {
    order: 1;
  }
}

@media (max-width: 1024px) {
  .result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-shell {
    padding: 10px 12px 12px;
  }

  .control-grid {
    grid-template-columns: 1fr;
  }

  .task-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-grid {
    grid-template-columns: 1fr;
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
}
</style>
