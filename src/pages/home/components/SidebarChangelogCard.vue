<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface EntryVm {
  id: string;
  version: string;
  dateKey: string;
  summaryKey: string;
}

defineProps<{
  title: string;
  viewAllLabel: string;
  entries: EntryVm[];
}>();

const emit = defineEmits<{
  viewAll: [];
}>();

const { t } = useI18n();
</script>

<template>
  <section class="changelog-card">
    <div class="changelog-card__head">
      <h3 class="changelog-card__title">{{ title }}</h3>
      <button type="button" class="changelog-card__link" @click="emit('viewAll')">
        <span>{{ viewAllLabel }}</span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <ul class="changelog-card__list">
      <li v-for="e in entries" :key="e.id" class="changelog-card__item">
        <div class="changelog-card__row">
          <span class="changelog-card__ver">{{ e.version }}</span>
          <span class="changelog-card__date">{{ t(e.dateKey) }}</span>
        </div>
        <p class="changelog-card__summary">{{ t(e.summaryKey) }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.changelog-card {
  border-radius: 14px;
  border: 1px solid #eef0f4;
  background: #ffffff;
  padding: 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
}
.changelog-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}
.changelog-card__title {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  color: #1f2937;
}
.changelog-card__link {
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  transition: color 160ms ease;
}
.changelog-card__link svg {
  width: 12px;
  height: 12px;
}
.changelog-card__link:hover {
  color: #6366f1;
}
.changelog-card__link:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
  border-radius: 4px;
}

.changelog-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.changelog-card__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.changelog-card__row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.changelog-card__ver {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}
.changelog-card__date {
  font-size: 11px;
  color: #9ca3af;
}
.changelog-card__summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: #6b7280;
}
</style>
