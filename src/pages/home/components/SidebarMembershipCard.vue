<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface BulletVm {
  id: string;
  labelKey: string;
  checkIconUrl: string;
}

defineProps<{
  title: string;
  learnMoreLabel: string;
  bullets: BulletVm[];
  ctaLabel: string;
}>();

const emit = defineEmits<{
  learnMore: [];
  cta: [];
}>();

const { t } = useI18n();
</script>

<template>
  <section class="member-card">
    <div class="member-card__head">
      <h3 class="member-card__title">{{ title }}</h3>
      <button type="button" class="member-card__link" @click="emit('learnMore')">{{ learnMoreLabel }}</button>
    </div>
    <ul class="member-card__list">
      <li v-for="b in bullets" :key="b.id" class="member-card__li">
        <img :src="b.checkIconUrl" alt="" class="member-card__check" />
        <span>{{ t(b.labelKey) }}</span>
      </li>
    </ul>
    <button type="button" class="member-card__cta" @click="emit('cta')">{{ ctaLabel }}</button>
  </section>
</template>

<style scoped>
.member-card {
  border-radius: 12px;
  border: 1px solid #fed7aa;
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 40%);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.member-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}
.member-card__title {
  margin: 0;
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
  color: #9a3412;
}
.member-card__link {
  border: none;
  background: transparent;
  color: #ea580c;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}
.member-card__link:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
  border-radius: 4px;
}
.member-card__list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.member-card__li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 18px;
  color: #7c2d12;
  margin-top: 8px;
}
.member-card__li:first-child {
  margin-top: 0;
}
.member-card__check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}
.member-card__cta {
  margin-top: auto;
  flex-shrink: 0;
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(90deg, #f97316 0%, #ea580c 100%);
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.35);
}
.member-card__cta:hover {
  filter: brightness(1.03);
}
.member-card__cta:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
</style>
