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
        <div class="value-item__badge" aria-hidden="true">
          <img :src="item.iconUrl" alt="" class="value-item__icon" />
        </div>
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
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.value-strip__heading {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 600;
  color: #1f2937;
}
.value-strip__row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 960px) {
  .value-strip__row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .value-strip__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.value-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 2px;
  min-width: 0;
}
.value-item__badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.value-item__icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.value-item__text {
  min-width: 0;
}
.value-item__title {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.value-item__desc {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
