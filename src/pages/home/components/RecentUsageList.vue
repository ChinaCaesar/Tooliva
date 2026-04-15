<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface RecentUsageItemViewModel {
  id: string;
  iconUrl: string;
  titleKey: string;
  fileName: string;
  relativeTimeKey: string;
}

const props = defineProps<{
  title: string;
  items: RecentUsageItemViewModel[];
}>();

const { t } = useI18n();
</script>

<template>
  <section class="recent-list">
    <h3 class="recent-list__title">{{ title }}</h3>
    <article v-for="item in props.items" :key="item.id" class="recent-list__item">
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
  </section>
</template>

<style scoped>
.recent-list {
  margin-top: 24px; border-radius: 16px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 24px;
}
.recent-list__title { margin: 0 0 12px; color: #111827; font-size: 18px; line-height: 28px; }
.recent-list__item {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-radius: 8px; padding: 12px; margin-top: 8px;
}
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
</style>
