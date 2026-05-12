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
        {{ viewAllLabel }}
      </button>
    </header>
    <div class="recent-strip__track">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="recent-chip"
        :class="{ 'recent-chip--empty': item.isEmpty }"
        :disabled="item.isEmpty || !item.actionCode"
        @click="handleChipClick(item)"
      >
        <div class="recent-chip__swatch" :style="{ background: item.iconBackground }">
          <img :src="item.iconUrl" alt="" class="recent-chip__icon" />
        </div>
        <div class="recent-chip__body">
          <div class="recent-chip__name">{{ t(item.titleKey) }}</div>
          <div class="recent-chip__meta">
            <span class="recent-chip__time">{{ t(item.relativeTimeKey) }}</span>
            <span v-if="item.fileName && item.fileName !== '—'" class="recent-chip__dot" aria-hidden="true">·</span>
            <span v-if="item.fileName && item.fileName !== '—'" class="recent-chip__file">{{ item.fileName }}</span>
          </div>
        </div>
        <span class="recent-chip__chevron" aria-hidden="true">›</span>
      </button>
      <button
        type="button"
        class="recent-chip recent-chip--more"
        :aria-label="viewAllLabel"
        @click="emit('view-all-recent')"
      >
        <span class="recent-chip__dots" aria-hidden="true">···</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.recent-strip {
  margin-top: 0;
}
.recent-strip__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: clamp(8px, 1vh, 12px);
}
.recent-strip__title {
  margin: 0;
  font-size: clamp(15px, 1.25vw, 16px);
  line-height: 1.4;
  font-weight: 700;
  color: #0f172a;
}
.recent-strip__view-all {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 4px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.recent-strip__view-all:hover {
  color: #2563eb;
}
.recent-strip__view-all:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 4px;
}
.recent-strip__track {
  display: flex;
  flex-direction: row;
  gap: clamp(8px, 1vw, 12px);
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
  align-items: stretch;
}
.recent-chip {
  flex: 0 0 auto;
  width: min(216px, 38vw);
  min-width: 172px;
  min-height: 48px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 10px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  text-align: left;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}
.recent-chip:hover:not(:disabled) {
  border-color: #dbeafe;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
}
.recent-chip:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.recent-chip:disabled {
  cursor: default;
  opacity: 0.85;
}
.recent-chip--empty {
  opacity: 0.88;
}
.recent-chip__swatch {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.recent-chip__icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.recent-chip__body {
  flex: 1;
  min-width: 0;
}
.recent-chip__name {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-chip__meta {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.recent-chip__time {
  flex-shrink: 0;
  color: #64748b;
}
.recent-chip__dot {
  flex-shrink: 0;
  color: #cbd5e1;
}
.recent-chip__file {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.recent-chip__chevron {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 500;
  color: #d1d5db;
  line-height: 1;
  padding-left: 2px;
}
.recent-chip--more {
  width: 48px;
  min-width: 48px;
  min-height: 48px;
  padding: 0;
  justify-content: center;
  border-style: dashed;
  border-color: #e2e8f0;
  background: #fafbfc;
}
.recent-chip--more:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}
.recent-chip__dots {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #94a3b8;
  line-height: 1;
}
</style>
