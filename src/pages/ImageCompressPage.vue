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
  outputMode,
  sourceDirectory,
  quality,
  targetFormat,
  resolutionPreset,
  maxWidthBound,
  maxHeightBound,
  canStart,
  allVisibleSelected,
  someVisibleSelected,
  selectedCount,
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
const outputModeOptions = ["source", "custom", "overwrite"] as const;

watchEffect(() => {
  const el = selectAllCheckboxRef.value;
  if (!el) return;
  el.indeterminate = someVisibleSelected.value && !allVisibleSelected.value;
});

function dash(): string {
  return t("pages.imageCompress.table.dash");
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
  outputMode.value === "overwrite"
    ? t("common.outputModes.overwrite")
    : outputMode.value === "source"
      ? t("pages.imageCompress.footer.defaultOutput")
      : outputDirectory.value.trim().length > 0
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
              <div class="upload-shell">
                <div
                  class="upload-stage"
                  :class="{ 'upload-stage--active': isDropActive }"
                  @click.self="pickImages"
                  @drop="handleDrop"
                  @dragover="onDragOver"
                  @dragleave="onDragLeave"
                >
                  <div class="upload-zone">
                    <div class="upload-zone__icon" aria-hidden="true">
                      <svg viewBox="0 0 80 64" class="upload-zone__svg">
                        <rect x="6" y="14" width="36" height="28" rx="4" fill="#e0e7ff" stroke="#6366f1" stroke-width="1.5" />
                        <rect x="30" y="22" width="36" height="28" rx="4" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5" />
                        <circle cx="58" cy="18" r="12" fill="#2563eb" />
                        <path d="M58 13v10M53 18h10" stroke="#fff" stroke-width="2" stroke-linecap="round" />
                      </svg>
                    </div>
                    <strong class="upload-zone__title">{{ t("pages.imageCompress.upload.dropTitle") }}</strong>
                    <p class="upload-zone__desc">{{ t("pages.imageCompress.upload.dropDesc") }}</p>
                    <div class="upload-zone__actions">
                      <button type="button" class="btn btn--primary" @click.stop="pickImages">
                        {{ t("pages.imageCompress.source.pickImages") }}
                      </button>
                      <button type="button" class="btn btn--secondary" @click.stop="pickAddFolder">
                        {{ t("pages.imageCompress.source.pickDirectory") }}
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="hintMessage" class="preview-hint" role="status">{{ hintMessage }}</p>
              </div>

              <section class="list-card" aria-labelledby="compress-list-heading">
                <div class="list-card__head">
                  <h3 id="compress-list-heading" class="list-card__title">
                    {{ t("pages.imageCompress.list.title") }} ({{ items.length }})
                  </h3>
                  <div v-if="items.length > 0" class="list-card__actions">
                    <button type="button" class="btn btn--secondary btn--sm" :disabled="isProcessing" @click="clearItems">
                      {{ t("pages.imageCompress.clearList") }}
                    </button>
                    <button
                      type="button"
                      class="btn btn--danger btn--sm"
                      :disabled="isProcessing || selectedCount === 0"
                      @click="removeSelected"
                    >
                      {{ t("pages.imageCompress.list.deleteSelected") }}
                    </button>
                  </div>
                </div>
                <p v-if="hiddenItemCount > 0" class="list-card__tip" role="status">
                  {{ t("pages.imageCompress.listOverflowTip", { count: hiddenItemCount }) }}
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
                    <p class="list-empty__title">{{ t("pages.imageCompress.list.emptyTitle") }}</p>
                    <p class="list-empty__desc">{{ t("pages.imageCompress.list.emptyDesc") }}</p>
                  </div>

                  <div v-else class="table-wrap">
                  <table class="task-table task-table--centered">
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
                        <th class="task-table__th-name" scope="col">{{ t("pages.imageCompress.table.fileName") }}</th>
                        <th scope="col">{{ t("pages.imageCompress.table.originalSize") }}</th>
                        <th scope="col">{{ t("pages.imageCompress.table.compressedSize") }}</th>
                        <th scope="col">{{ t("pages.imageCompress.table.status") }}</th>
                        <th scope="col">{{ t("pages.imageCompress.table.progress") }}</th>
                        <th class="task-table__col-action" scope="col">{{ t("pages.imageCompress.table.operation") }}</th>
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
                        <td class="task-table__cell-name" :title="item.fileName">
                          <span class="task-table__name">{{ item.fileName }}</span>
                        </td>
                        <td>{{ item.originalBytes ?? dash() }}</td>
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
                          <span class="task-table__progress-pct">{{ item.progress }}%</span>
                        </td>
                        <td class="task-table__col-action">
                          <button
                            type="button"
                            class="task-table__icon-btn task-table__icon-btn--danger"
                            :disabled="isProcessing"
                            :aria-label="t('pages.imageCompress.removeAria')"
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
              <div class="format-block">
                <span class="format-block__label">{{ t("common.outputMode") }}</span>
                <div class="format-row" role="radiogroup" :aria-label="t('common.outputMode')">
                  <label
                    v-for="option in outputModeOptions"
                    :key="option"
                    class="format-option"
                    :class="{ 'format-option--active': outputMode === option }"
                  >
                    <input v-model="outputMode" type="radio" :value="option" :disabled="isProcessing" />
                    <span class="format-option__radio" aria-hidden="true">
                      <span v-if="outputMode === option" class="format-option__radio-dot" />
                    </span>
                    <span class="format-option__text">{{ t(`common.outputModes.${option}`) }}</span>
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
            <button
              v-if="outputMode !== 'overwrite'"
              type="button"
              class="btn btn--link"
              :disabled="isProcessing"
              @click="pickOutputDirectory"
            >
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

.upload-shell {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-stage {
  flex-shrink: 0;
  min-height: 120px;
  border: 1px dashed #d6d9e0;
  border-radius: 14px;
  background: #fafbfd;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.upload-stage:hover {
  border-color: #c7d2fe;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
}

.upload-stage:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.upload-stage--active {
  border-color: #c7d2fe;
  background: #f5f6fa;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
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

.preview-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #ef4444;
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
  color: var(--text-secondary);
  letter-spacing: 0;
  table-layout: fixed;
}

.task-table thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #ffffff;
}

.task-table th,
.task-table td {
  border-bottom: 1px solid #e7e9ee;
  padding: 10px 12px;
  text-align: center;
  vertical-align: middle;
}

.task-table--centered .task-table__th-name,
.task-table--centered .task-table__cell-name {
  text-align: start;
}

.task-table th {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.task-table__col-action {
  width: 56px;
  text-align: center;
}

.task-table__col-check {
  width: 48px;
  text-align: center;
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

.btn--primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.btn--danger {
  background: #fff;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.btn--danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.task-table__cell-name {
  font-weight: 600;
  color: var(--text);
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
  line-height: 1.35;
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

.task-table__checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary);
  vertical-align: middle;
}

.task-table__status--ok {
  color: #22c55e;
  font-weight: 600;
}

.task-table__status--bad {
  color: #dc2626;
  font-weight: 600;
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

.btn--start {
  padding: 12px 28px;
  font-size: 15px;
  flex-shrink: 0;
  border-radius: 999px;
}

@media (prefers-reduced-motion: reduce) {
  .upload-stage,
  .primary-btn,
  .secondary-btn,
  .format-option,
  .btn {
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

@media (max-width: 768px) {
  .page-shell {
    padding: 10px 12px 12px;
  }

  .control-grid {
    grid-template-columns: 1fr;
  }

  .list-card__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .list-card__actions {
    width: 100%;
    justify-content: flex-start;
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
