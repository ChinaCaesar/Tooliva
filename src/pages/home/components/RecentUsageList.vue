<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface RecentUsageItemViewModel {
  id: string;
  iconUrl: string;
  titleKey: string;
  fileName: string;
  relativeTimeKey: string;
  isEmpty?: boolean;
}

interface FrequentToolViewModel {
  id: string;
  labelKey: string;
  usageCount: number;
  route: string;
  actionCode: string;
  isEmpty?: boolean;
}

const props = defineProps<{
  title: string;
  frequentToolsTitle: string;
  timesUnitLabel: string;
  items: RecentUsageItemViewModel[];
  frequentTools: FrequentToolViewModel[];
}>();
const emit = defineEmits<{
  (event: "frequent-tool-click", route: string): void;
}>();

const { t } = useI18n();
</script>

<template>
  <section class="recent-list">
    <div class="recent-list__split">
      <div class="recent-list__column recent-list__column--left">
        <h3 class="recent-list__title">{{ title }}</h3>
        <article v-for="item in props.items" :key="item.id" class="recent-list__item" :class="{ 'recent-list__item--empty': item.isEmpty }">
          <div class="recent-list__left">
            <div class="recent-list__icon-wrap">
              <img :src="item.iconUrl" alt="" class="recent-list__icon" />
            </div>
            <div>
              <div class="recent-list__name">{{ t(item.titleKey) }}</div>
              <div class="recent-list__file">{{ item.fileName }}</div>
            </div>
          </div>
          <div class="recent-list__time">{{ t(item.relativeTimeKey) }}</div>
        </article>
      </div>

      <div class="recent-list__divider" aria-hidden="true"></div>

      <div class="recent-list__column recent-list__column--right">
        <h3 class="recent-list__title">{{ frequentToolsTitle }}</h3>
        <button
          v-for="item in props.frequentTools"
          :key="item.id"
          type="button"
          class="frequent-item"
          :class="{ 'frequent-item--empty': item.isEmpty }"
          :disabled="item.isEmpty"
          @click="emit('frequent-tool-click', item.route)"
        >
          <div class="frequent-item__left">
            <span class="frequent-item__name">{{ t(item.labelKey) }}</span>
            <span class="frequent-item__action" v-if="!item.isEmpty">{{ item.actionCode }}</span>
          </div>
          <span class="frequent-item__count">{{ item.usageCount }} {{ timesUnitLabel }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.recent-list {
  margin-top: 24px; border-radius: 16px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 24px;
}
.recent-list__split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1px minmax(260px, 320px);
  gap: 16px;
}
.recent-list__column { min-width: 0; }
.recent-list__divider { background: #e5e7eb; border-radius: 999px; }
.recent-list__title { margin: 0 0 12px; color: #111827; font-size: 18px; line-height: 28px; }
.recent-list__item {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-radius: 8px; padding: 12px; margin-top: 8px;
  min-height: 64px;
}
.recent-list__item--empty { opacity: 0.8; }
.recent-list__left { display: flex; align-items: center; gap: 16px; }
.recent-list__icon-wrap {
  width: 40px; height: 40px; border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 15%, #1e40af 85%);
  display: flex; align-items: center; justify-content: center;
}
.recent-list__icon { width: 20px; height: 20px; }
.recent-list__name { color: #111827; font-weight: 500; line-height: 20px; }
.recent-list__file { color: #9ca3af; font-size: 12px; line-height: 16px; }
.recent-list__time { color: #6b7280; font-size: 12px; line-height: 16px; }

.frequent-item {
  margin-top: 8px;
  width: 100%;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.frequent-item:hover:not(:disabled) {
  border-color: #93c5fd;
  box-shadow: 0 8px 16px rgba(30, 64, 175, 0.08);
  transform: translateY(-1px);
}
.frequent-item:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.frequent-item--empty {
  cursor: default;
  opacity: 0.8;
}
.frequent-item__left {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.frequent-item__name {
  color: #0f172a;
  font-size: 14px;
  line-height: 20px;
  text-align: left;
}
.frequent-item__action {
  margin-top: 2px;
  color: #64748b;
  font-size: 11px;
  line-height: 16px;
  text-align: left;
}
.frequent-item__count {
  color: #1e3a8a;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}

@media (max-width: 1080px) {
  .recent-list__split {
    grid-template-columns: 1fr;
  }
  .recent-list__divider { display: none; }
}
</style>
