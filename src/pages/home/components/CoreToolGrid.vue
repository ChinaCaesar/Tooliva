<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface CoreToolCardViewModel {
  id: string;
  iconUrl: string;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  actionCode: string;
}

const props = defineProps<{
  title: string;
  description: string;
  cards: CoreToolCardViewModel[];
}>();

const { t } = useI18n();
const emit = defineEmits<{
  (event: "tool-click", actionCode: string): void;
}>();
</script>

<template>
  <section class="core-tools">
    <h2 class="core-tools__title">{{ title }}</h2>
    <p class="core-tools__desc">{{ description }}</p>

    <div class="core-tools__grid">
      <button
        v-for="card in props.cards"
        :key="card.id"
        type="button"
        class="core-tool-card"
        :style="{ background: card.gradient }"
        @click="emit('tool-click', card.actionCode)"
      >
        <img :src="card.iconUrl" alt="" class="core-tool-card__icon" />
        <h3 class="core-tool-card__title">{{ t(card.titleKey) }}</h3>
        <p class="core-tool-card__desc">{{ t(card.descriptionKey) }}</p>
      </button>
    </div>
  </section>
</template>

<style scoped>
.core-tools__title { margin: 0; color: #111827; font-size: 20px; line-height: 28px; }
.core-tools__desc { margin: 8px 0 0; color: #6b7280; line-height: 20px; }
.core-tools__grid {
  margin-top: 24px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  overflow: hidden;
}
.core-tool-card {
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-radius: 16px; padding: 24px; min-height: 184px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
.core-tool-card__icon { width: 48px; height: 48px; }
.core-tool-card__title { margin: 28px 0 0; color: #fff; font-size: 20px; line-height: 28px; }
.core-tool-card__desc { margin: 4px 0 0; color: #ffffff; line-height: 20px; }
@media (max-width: 1180px) {
  .core-tools__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
    gap: 16px;
  }
  .core-tool-card {
    padding: 20px;
    min-height: 168px;
  }
  .core-tool-card__title {
    margin-top: 20px;
    font-size: 18px;
    line-height: 26px;
  }
}
@media (max-width: 720px) {
  .core-tools__grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }
}
</style>
