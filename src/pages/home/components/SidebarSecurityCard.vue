<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface BulletVm {
  id: string;
  labelKey: string;
  checkIconUrl: string;
}

defineProps<{
  title: string;
  shieldUrl: string;
  bullets: BulletVm[];
}>();

const { t } = useI18n();
</script>

<template>
  <section class="side-card">
    <div class="side-card__head">
      <h3 class="side-card__title">{{ title }}</h3>
      <img :src="shieldUrl" alt="" class="side-card__deco" />
    </div>
    <ul class="side-card__list">
      <li v-for="b in bullets" :key="b.id" class="side-card__li">
        <img :src="b.checkIconUrl" alt="" class="side-card__check" />
        <span>{{ t(b.labelKey) }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.side-card {
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: clamp(12px, 1.4vh, 16px) 14px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.side-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}
.side-card__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
  color: #0f172a;
}
.side-card__deco {
  width: 44px;
  height: 44px;
  object-fit: contain;
  flex-shrink: 0;
}
.side-card__list {
  list-style: none;
  margin: clamp(8px, 1vh, 12px) 0 0;
  padding: 0;
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.side-card__li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #475569;
  margin-top: clamp(6px, 0.8vh, 10px);
}
.side-card__li:first-of-type {
  margin-top: 0;
}
.side-card__check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}
</style>
