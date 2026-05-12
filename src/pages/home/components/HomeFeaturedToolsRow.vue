<script setup lang="ts">
import { useI18n } from "vue-i18n";

export interface FeaturedToolCardVm {
  id: string;
  cardType: "tool" | "placeholder";
  iconUrl: string;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  actionCode?: string;
  placeholderMessageKey?: string;
}

defineProps<{
  cards: FeaturedToolCardVm[];
  ctaLabel: string;
}>();

const emit = defineEmits<{
  toolNavigate: [actionCode: string];
  placeholder: [messageKey: string];
}>();

const { t } = useI18n();

function isExploreCard(card: FeaturedToolCardVm): boolean {
  return card.id === "feat-more";
}

function handleCardClick(card: FeaturedToolCardVm): void {
  if (isExploreCard(card)) {
    if (card.placeholderMessageKey) emit("placeholder", card.placeholderMessageKey);
    return;
  }
  if (card.cardType === "tool" && card.actionCode) {
    emit("toolNavigate", card.actionCode);
    return;
  }
  if (card.placeholderMessageKey) {
    emit("placeholder", card.placeholderMessageKey);
  }
}
</script>

<template>
  <section class="featured-row" aria-label="featured tools">
    <div class="featured-row__track">
      <button
        v-for="card in cards"
        :key="card.id"
        type="button"
        class="feat-card"
        :class="{
          'feat-card--explore': isExploreCard(card),
          'feat-card--ghost-tool': card.cardType === 'placeholder' && !isExploreCard(card)
        }"
        @click="handleCardClick(card)"
      >
        <template v-if="isExploreCard(card)">
          <div class="feat-card__explore">
            <span class="feat-card__explore-plus" aria-hidden="true">+</span>
            <p class="feat-card__explore-title">{{ t(card.titleKey) }}</p>
            <p class="feat-card__explore-sub">{{ t(card.descriptionKey) }}</p>
          </div>
        </template>
        <template v-else>
          <div class="feat-card__top">
            <div class="feat-card__swatch" :style="{ background: card.gradient }">
              <img :src="card.iconUrl" alt="" class="feat-card__icon-img" />
            </div>
            <h3 class="feat-card__title">{{ t(card.titleKey) }}</h3>
            <p class="feat-card__desc">{{ t(card.descriptionKey) }}</p>
          </div>
          <span class="feat-card__cta">{{ ctaLabel }} →</span>
        </template>
      </button>
    </div>
  </section>
</template>

<style scoped>
.featured-row {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 0;
}
.featured-row__track {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: clamp(10px, 1.2vw, 16px);
  align-items: stretch;
}
.feat-card {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  border: 1px solid #e8ecf1;
  border-radius: 16px;
  padding: clamp(14px, 1.8vh, 20px) clamp(12px, 1.4vw, 16px) clamp(12px, 1.4vh, 16px);
  cursor: pointer;
  text-align: center;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.feat-card:not(.feat-card--explore) {
  justify-content: flex-start;
}
.feat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
  border-color: #dbeafe;
}
.feat-card:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .feat-card {
    transition: border-color 200ms ease, box-shadow 200ms ease;
  }
  .feat-card:hover {
    transform: none;
  }
}
.feat-card--ghost-tool {
  opacity: 0.98;
}
.feat-card--explore {
  border-style: dashed;
  border-color: #cbd5e1;
  background: #fafbfc;
  box-shadow: none;
  align-items: center;
  text-align: center;
  justify-content: center;
}
.feat-card--explore:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}
.feat-card__top {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  flex: 0 0 auto;
}
.feat-card__swatch {
  width: clamp(52px, 6vh, 64px);
  height: clamp(52px, 6vh, 64px);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
.feat-card__icon-img {
  width: clamp(30px, 3.4vh, 36px);
  height: clamp(30px, 3.4vh, 36px);
  object-fit: contain;
}
.feat-card__title {
  margin: clamp(18px, 2.4vh, 26px) 0 0;
  width: 100%;
  font-size: clamp(15px, 1.35vw, 17px);
  line-height: 1.35;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.feat-card__desc {
  margin: 8px auto 0;
  width: 100%;
  max-width: 22ch;
  font-size: clamp(12px, 1.1vw, 13px);
  line-height: 1.55;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: center;
}
.feat-card__cta {
  display: block;
  margin-top: auto;
  padding-top: clamp(14px, 2vh, 28px);
  width: 100%;
  font-size: clamp(12px, 1.05vw, 13px);
  font-weight: 600;
  color: #2563eb;
}
.feat-card__explore {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 4px;
  min-height: 0;
}
.feat-card__explore-plus {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px dashed #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 300;
  color: #64748b;
  line-height: 1;
}
.feat-card__explore-title {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: #475569;
}
.feat-card__explore-sub {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: #64748b;
}
</style>
