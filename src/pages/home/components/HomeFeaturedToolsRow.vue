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
  return card.cardType === "placeholder";
}

function handleCardClick(card: FeaturedToolCardVm): void {
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
        :class="{ 'feat-card--explore': isExploreCard(card) }"
        @click="handleCardClick(card)"
      >
        <template v-if="isExploreCard(card)">
          <div class="feat-card__explore">
            <span class="feat-card__explore-plus" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            <p class="feat-card__explore-title">{{ t(card.titleKey) }}</p>
            <p class="feat-card__explore-sub">{{ t(card.descriptionKey) }}</p>
          </div>
        </template>
        <template v-else>
          <div class="feat-card__icon-wrap" :style="{ background: card.gradient }">
            <img :src="card.iconUrl" alt="" class="feat-card__icon-img" />
          </div>
          <h3 class="feat-card__title">{{ t(card.titleKey) }}</h3>
          <p class="feat-card__desc">{{ t(card.descriptionKey) }}</p>
          <span class="feat-card__cta">
            <span>{{ ctaLabel }}</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14m-5-6 6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </template>
      </button>
    </div>
  </section>
</template>

<style scoped>
.featured-row {
  width: 100%;
}
.featured-row__track {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}
@media (max-width: 960px) {
  .featured-row__track {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .featured-row__track {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.feat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  background: #ffffff;
  padding: 18px 16px 16px;
  cursor: pointer;
  min-height: 198px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}
.feat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  border-color: #dbeafe;
}
.feat-card:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .feat-card {
    transition: border-color 180ms ease, box-shadow 180ms ease;
  }
  .feat-card:hover {
    transform: none;
  }
}

.feat-card__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.feat-card__icon-img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 12px;
}
.feat-card__title {
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0;
}
.feat-card__desc {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #9aa1ad;
  white-space: pre-line;
}
.feat-card__cta {
  margin-top: auto;
  padding-top: 14px;
  font-size: 12px;
  font-weight: 500;
  color: #6366f1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.feat-card__cta svg {
  width: 14px;
  height: 14px;
}

.feat-card--explore {
  border-style: dashed;
  border-color: #d6d9e0;
  background: #fafbfd;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: none;
}
.feat-card--explore:hover {
  border-color: #b1b6c2;
  background: #f5f6fa;
  transform: none;
  box-shadow: none;
}
.feat-card__explore {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 4px;
}
.feat-card__explore-plus {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e8eaf0;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.feat-card__explore-plus svg {
  width: 22px;
  height: 22px;
}
.feat-card__explore-title {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 600;
  color: #6b7280;
}
.feat-card__explore-sub {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: #aab0bc;
  white-space: pre-line;
}
</style>
