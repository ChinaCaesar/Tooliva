<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface BulletVm {
  id: string;
  labelKey: string;
  checkStyle: "green" | "orange";
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
      <button type="button" class="member-card__link" @click="emit('learnMore')">
        <span>{{ learnMoreLabel }}</span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
    <ul class="member-card__list">
      <li v-for="b in bullets" :key="b.id" class="member-card__li">
        <span class="member-card__check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="member-card__label">{{ t(b.labelKey) }}</span>
      </li>
    </ul>
    <button type="button" class="member-card__cta" @click="emit('cta')">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 8.5 7 12l5-7 5 7 4-3.5L19 18H5L3 8.5Z" />
      </svg>
      <span>{{ ctaLabel }}</span>
    </button>
  </section>
</template>

<style scoped>
.member-card {
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
.member-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}
.member-card__title {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  color: #1f2937;
}
.member-card__link {
  border: none;
  background: transparent;
  color: #f97316;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}
.member-card__link svg {
  width: 12px;
  height: 12px;
}
.member-card__link:hover {
  color: #ea580c;
}
.member-card__link:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
  border-radius: 4px;
}

.member-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.member-card__li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #4b5563;
}
.member-card__check {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #f97316;
}
.member-card__check svg {
  width: 14px;
  height: 14px;
}
.member-card__label {
  min-width: 0;
}

.member-card__cta {
  margin-top: 4px;
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  background: linear-gradient(135deg, #fbb054 0%, #f78c2c 100%);
  box-shadow: 0 4px 12px rgba(243, 132, 30, 0.28);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: filter 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.member-card__cta svg {
  width: 16px;
  height: 16px;
}
.member-card__cta:hover {
  filter: brightness(1.04);
  box-shadow: 0 6px 16px rgba(243, 132, 30, 0.35);
}
.member-card__cta:active {
  transform: translateY(1px);
}
.member-card__cta:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}
</style>
