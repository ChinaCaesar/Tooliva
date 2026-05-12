<script setup lang="ts">
defineProps<{
  versionPrefix: string;
  version: string;
  slogan: string;
  heartIconUrl: string;
}>();
</script>

<template>
  <footer class="home-footer">
    <p class="home-footer__version">{{ versionPrefix }} {{ version }}</p>
    <p class="home-footer__slogan">
      <img :src="heartIconUrl" alt="" class="home-footer__heart" />
      <span>{{ slogan }}</span>
    </p>
    <div class="home-footer__spacer" aria-hidden="true"></div>
  </footer>
</template>

<style scoped>
.home-footer {
  flex-shrink: 0;
  border-top: 1px solid #e5e7eb;
  padding: 10px 20px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  background: #fff;
}
.home-footer__version {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
  justify-self: start;
}
.home-footer__slogan {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  justify-self: center;
  text-align: center;
}
.home-footer__heart {
  width: 14px;
  height: 14px;
  object-fit: contain;
}
.home-footer__spacer {
  justify-self: end;
}
</style>
