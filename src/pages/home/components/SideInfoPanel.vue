<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface StatViewModel {
  id: string;
  labelKey: string;
  value: string;
  highlight: "primary" | "secondary" | "success" | "warning";
}

interface QuickActionViewModel {
  id: string;
  iconUrl: string;
  labelKey: string;
  count: number;
}

defineProps<{
  statsTitle: string;
  stats: StatViewModel[];
  quickActionsTitle: string;
  quickActions: QuickActionViewModel[];
}>();

const { t } = useI18n();
</script>

<template>
  <aside class="side-panel">
    <section class="common-card">
      <h3 class="common-card__title">{{ statsTitle }}</h3>
      <div class="stats-grid">
        <article
          v-for="item in stats"
          :key="item.id"
          class="stats-card"
          :class="`stats-card--${item.highlight}`"
        >
          <p class="stats-card__label">{{ t(item.labelKey) }}</p>
          <strong class="stats-card__value">{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <section class="common-card">
      <h3 class="common-card__title">{{ quickActionsTitle }}</h3>
      <article v-for="item in quickActions" :key="item.id" class="quick-item">
        <div class="quick-item__left">
          <img :src="item.iconUrl" alt="" class="quick-item__icon" />
          <span>{{ t(item.labelKey) }}</span>
        </div>
        <strong class="quick-item__count">{{ item.count }}</strong>
      </article>
    </section>
  </aside>
</template>

<style scoped>
.side-panel { width: 280px; display: flex; flex-direction: column; gap: 24px; }
.common-card {
  border-radius: 16px; border: 1px solid #e5e7eb; background: #fff; padding: 24px;
}
.common-card__title { margin: 0; color: #111827; font-size: 16px; line-height: 24px; }
.stats-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.stats-card {
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid transparent;
  transition: border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
}
.stats-card:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.stats-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}
.stats-card__label {
  margin: 0;
  color: #1f2937;
  font-size: 12px;
  line-height: 18px;
}
.stats-card__value {
  margin-top: 4px;
  display: inline-block;
  color: #0f172a;
  font-size: 18px;
  line-height: 24px;
}
.stats-card--primary { background: #eff6ff; border-color: #bfdbfe; }
.stats-card--secondary { background: #f5f3ff; border-color: #ddd6fe; }
.stats-card--success { background: #ecfdf5; border-color: #bbf7d0; }
.stats-card--warning { background: #fffbeb; border-color: #fde68a; }
.quick-item {
  margin-top: 12px; border-radius: 8px; background: #f9fafb; padding: 12px;
  border: 1px solid transparent;
  display: flex; align-items: center; justify-content: space-between;
  transition: border-color 200ms ease, background-color 200ms ease;
}
.quick-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}
.quick-item__left { display: flex; align-items: center; gap: 12px; color: #111827; font-weight: 500; }
.quick-item__icon { width: 20px; height: 20px; }
.quick-item__count {
  min-width: 24px; padding: 0 8px; line-height: 24px; text-align: center;
  border-radius: 4px; background: #dbeafe; color: #1e3a8a; font-size: 12px;
}
</style>
