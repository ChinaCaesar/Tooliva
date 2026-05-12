<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
}>();
</script>

<template>
  <section class="greeting-hero">
    <h1 class="greeting-hero__title">{{ title }}</h1>
    <p class="greeting-hero__subtitle">{{ subtitle }}</p>
  </section>
</template>

<style scoped>
.greeting-hero {
  margin-bottom: 0;
}
.greeting-hero__title {
  margin: 0;
  font-size: clamp(20px, 2.2vh + 0.55vw, 28px);
  line-height: 1.25;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.greeting-hero__subtitle {
  margin: clamp(4px, 0.6vh, 8px) 0 0;
  font-size: clamp(13px, 1.1vw, 14px);
  line-height: 1.5;
  color: #475569;
}
</style>
