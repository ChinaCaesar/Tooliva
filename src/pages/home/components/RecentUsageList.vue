<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface RecentUsageItemViewModel {
  id: string;
  iconUrl: string;
  iconBackground: string;
  titleKey: string;
  fileName: string;
  relativeTimeKey: string;
  isEmpty?: boolean;
  actionCode?: string;
}

defineProps<{
  title: string;
  viewAllLabel: string;
  items: RecentUsageItemViewModel[];
  emptyStateTitleKey: string;
  emptyStateHintKey: string;
}>();

const emit = defineEmits<{
  (event: "view-all-recent"): void;
  (event: "recent-item-click", actionCode: string): void;
}>();

const { t } = useI18n();

function handleChipClick(item: RecentUsageItemViewModel): void {
  if (item.isEmpty || !item.actionCode) return;
  emit("recent-item-click", item.actionCode);
}
</script>

<template>
  <section class="recent-strip">
    <header class="recent-strip__head">
      <h3 class="recent-strip__title">{{ title }}</h3>
      <button type="button" class="recent-strip__view-all" @click="emit('view-all-recent')">
        <span>{{ viewAllLabel }}</span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </header>

    <div v-if="items.length === 0" class="recent-strip__empty">
      <div class="recent-strip__empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
          <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <div class="recent-strip__empty-text">
        <p class="recent-strip__empty-title">{{ t(emptyStateTitleKey) }}</p>
        <p class="recent-strip__empty-hint">{{ t(emptyStateHintKey) }}</p>
      </div>
    </div>

    <div v-else class="recent-strip__track">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="recent-chip"
        :class="{ 'recent-chip--disabled': item.isEmpty || !item.actionCode }"
        :disabled="item.isEmpty || !item.actionCode"
        @click="handleChipClick(item)"
      >
        <div class="recent-chip__swatch" :style="{ background: item.iconBackground }">
          <img :src="item.iconUrl" alt="" class="recent-chip__icon" />
        </div>
        <div class="recent-chip__body">
          <div class="recent-chip__name">{{ t(item.titleKey) }}</div>
          <div class="recent-chip__meta">{{ t(item.relativeTimeKey) }}</div>
        </div>
        <span class="recent-chip__chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </button>

      <button
        type="button"
        class="recent-chip recent-chip--more"
        :aria-label="viewAllLabel"
        @click="emit('view-all-recent')"
      >
        <span class="recent-chip__dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.recent-strip {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-strip__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.recent-strip__title {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 600;
  color: #1f2937;
}
.recent-strip__view-all {
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  transition: color 160ms ease;
}
.recent-strip__view-all svg {
  width: 12px;
  height: 12px;
}
.recent-strip__view-all:hover {
  color: #6366f1;
}
.recent-strip__view-all:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
  border-radius: 4px;
}

.recent-strip__empty {
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: 12px;
  border: 1px dashed #e0e3ea;
  background: #fafbfd;
  padding: 18px 20px;
}
.recent-strip__empty-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #eef0f4;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  flex-shrink: 0;
}
.recent-strip__empty-icon svg {
  width: 22px;
  height: 22px;
}
.recent-strip__empty-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}
.recent-strip__empty-hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #9ca3af;
}

.recent-strip__track {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) 56px;
  gap: 12px;
  align-items: stretch;
}
@media (max-width: 960px) {
  .recent-strip__track {
    grid-template-columns: repeat(3, minmax(0, 1fr)) 56px;
  }
  .recent-chip:nth-child(4) {
    display: none;
  }
}
@media (max-width: 640px) {
  .recent-strip__track {
    grid-template-columns: repeat(2, minmax(0, 1fr)) 56px;
  }
  .recent-chip:nth-child(3),
  .recent-chip:nth-child(4) {
    display: none;
  }
}

.recent-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #eef0f4;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  min-height: 56px;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.recent-chip:hover:not(:disabled) {
  border-color: #dbeafe;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
}
.recent-chip:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
.recent-chip:disabled,
.recent-chip--disabled {
  cursor: default;
  opacity: 0.7;
}
@media (prefers-reduced-motion: reduce) {
  .recent-chip {
    transition: none;
  }
}
.recent-chip__swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.recent-chip__icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 8px;
}
.recent-chip__body {
  flex: 1;
  min-width: 0;
}
.recent-chip__name {
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-chip__meta {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.5;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-chip__chevron {
  flex-shrink: 0;
  color: #c7cad1;
  display: inline-flex;
  align-items: center;
}
.recent-chip__chevron svg {
  width: 14px;
  height: 14px;
}

.recent-chip--more {
  min-width: 0;
  width: auto;
  padding: 0;
  justify-content: center;
  border-style: dashed;
  border-color: #e0e3ea;
  background: #fafbfd;
}
.recent-chip--more:hover {
  border-color: #c7cad1;
  background: #f5f6fa;
}
.recent-chip__dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.recent-chip__dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #b1b6c2;
}
</style>
