<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface ValuePropVm {
  id: string;
  iconUrl: string;
  titleKey: string;
  descriptionKey: string;
}

defineProps<{
  sectionTitle: string;
  items: ValuePropVm[];
}>();

const { t } = useI18n();
</script>

<template>
  <section class="value-strip">
    <h2 class="value-strip__heading">{{ sectionTitle }}</h2>
    <div class="value-strip__row">
      <article v-for="item in items" :key="item.id" class="value-item">
        <img :src="item.iconUrl" alt="" class="value-item__icon" />
        <div class="value-item__text">
          <h3 class="value-item__title">{{ t(item.titleKey) }}</h3>
          <p class="value-item__desc">{{ t(item.descriptionKey) }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.value-strip {
  margin-top: 0;
  padding-top: clamp(6px, 0.9vh, 10px);
  border-top: 1px solid #e8ecf1;
}
.value-strip__heading {
  margin: 0 0 clamp(6px, 0.8vh, 10px);
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
  color: #0f172a;
}
.value-strip__row {
  display: flex;
  gap: clamp(6px, 0.8vw, 10px);
  flex-wrap: wrap;
}
.value-item {
  flex: 1 1 0;
  min-width: 100px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: clamp(6px, 0.9vh, 10px) clamp(8px, 1vw, 10px);
  border-radius: 12px;
  background: #f8fafc;
}
.value-item__icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}
.value-item__title {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 600;
  color: #0f172a;
}
.value-item__desc {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
