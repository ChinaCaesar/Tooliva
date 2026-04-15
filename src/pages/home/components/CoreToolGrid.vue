<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface CoreToolCardViewModel {
  id: string;
  iconUrl: string;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
}

interface PlaceholderCardViewModel {
  id: string;
  titleKey: string;
}

const props = defineProps<{
  title: string;
  description: string;
  cards: CoreToolCardViewModel[];
  placeholders: PlaceholderCardViewModel[];
}>();

const { t } = useI18n();
</script>

<template>
  <section class="core-tools">
    <h2 class="core-tools__title">{{ title }}</h2>
    <p class="core-tools__desc">{{ description }}</p>

    <div class="core-tools__grid">
      <article v-for="card in props.cards" :key="card.id" class="core-tool-card" :style="{ background: card.gradient }">
        <img :src="card.iconUrl" alt="" class="core-tool-card__icon" />
        <h3 class="core-tool-card__title">{{ t(card.titleKey) }}</h3>
        <p class="core-tool-card__desc">{{ t(card.descriptionKey) }}</p>
      </article>
    </div>

    <div class="core-tools__grid">
      <article v-for="placeholder in props.placeholders" :key="placeholder.id" class="tool-placeholder">
        <div class="tool-placeholder__plus">+</div>
        <p class="tool-placeholder__text">{{ t(placeholder.titleKey) }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.core-tools__title { margin: 0; color: #111827; font-size: 20px; line-height: 28px; }
.core-tools__desc { margin: 8px 0 0; color: #6b7280; line-height: 20px; }
.core-tools__grid {
  margin-top: 24px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px;
}
.core-tool-card {
  border-radius: 16px; padding: 24px; min-height: 184px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
.core-tool-card__icon { width: 48px; height: 48px; }
.core-tool-card__title { margin: 28px 0 0; color: #fff; font-size: 20px; line-height: 28px; }
.core-tool-card__desc { margin: 4px 0 0; color: rgba(255, 255, 255, 0.8); line-height: 20px; }
.tool-placeholder {
  border-radius: 16px; border: 2px dashed #d1d5db; background: #f3f4f6;
  min-height: 184px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
}
.tool-placeholder__plus {
  width: 48px; height: 48px; border-radius: 999px; background: #e5e7eb; color: #9ca3af; font-size: 24px;
  display: flex; align-items: center; justify-content: center;
}
.tool-placeholder__text { margin: 0; color: #9ca3af; font-weight: 500; }
</style>
