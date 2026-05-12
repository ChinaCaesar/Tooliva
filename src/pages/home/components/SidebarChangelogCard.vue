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
      <button type="button" class="changelog-card__link" @click="emit('viewAll')">{{ viewAllLabel }}</button>
    </div>
    <ul class="changelog-card__list">
      <li v-for="e in entries" :key="e.id" class="changelog-card__item">
        <div class="changelog-card__ver">{{ e.version }}</div>
        <div class="changelog-card__meta">{{ t(e.dateKey) }}</div>
        <p class="changelog-card__summary">{{ t(e.summaryKey) }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.changelog-card {
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
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
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
  color: #0f172a;
}
.changelog-card__link {
  border: none;
  background: transparent;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.changelog-card__link:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 4px;
}
.changelog-card__list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.changelog-card__item {
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}
.changelog-card__item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.changelog-card__ver {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.changelog-card__meta {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
.changelog-card__summary {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #475569;
}
</style>
