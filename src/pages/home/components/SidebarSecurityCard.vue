<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface BulletVm {
  id: string;
  labelKey: string;
  checkStyle: "green" | "orange";
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
      <img v-if="shieldUrl" :src="shieldUrl" alt="" class="side-card__deco" aria-hidden="true" />
    </div>
    <ul class="side-card__list">
      <li v-for="b in bullets" :key="b.id" class="side-card__li">
        <span class="side-card__check" :class="`side-card__check--${b.checkStyle}`" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="side-card__label">{{ t(b.labelKey) }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.side-card {
  position: relative;
  border-radius: 14px;
  border: 1px solid #eef0f4;
  background: #ffffff;
  padding: 14px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  color: #1f2937;
}
.side-card__deco {
  position: absolute;
  right: 15px;
  bottom: 8px;
  width: 80px;
  height: auto;
  object-fit: contain;
  opacity: 0.72;
  pointer-events: none;
  user-select: none;
}
.side-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 1;
}
.side-card__li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #4b5563;
}
.side-card__check {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.side-card__check svg {
  width: 14px;
  height: 14px;
}
.side-card__check--green {
  color: #22c55e;
}
.side-card__check--orange {
  color: #f97316;
}
.side-card__label {
  min-width: 0;
}
</style>
