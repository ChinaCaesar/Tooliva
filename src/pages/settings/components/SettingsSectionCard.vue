<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <section class="settings-section-card">
    <h2 class="settings-section-card__title">{{ title }}</h2>
    <div class="settings-section-card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.settings-section-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px 18px 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.settings-section-card__title {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 22px;
  font-weight: 700;
  color: #0f172a;
}
.settings-section-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
