<script setup lang="ts">
defineProps<{
  versionPrefix: string;
  version: string;
  slogan: string;
}>();
</script>

<template>
  <footer class="home-footer">
    <p class="home-footer__version">{{ versionPrefix }}：{{ version }}</p>
    <p class="home-footer__slogan">
      <svg class="home-footer__heart" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 20s-7-4.35-9.4-9.05a5 5 0 0 1 8.6-5.05L12 7.2l.8-1.3a5 5 0 0 1 8.6 5.05C19 15.65 12 20 12 20Z"
          fill="#ef4444"
        />
      </svg>
      <span>{{ slogan }}</span>
    </p>
    <div class="home-footer__spacer" aria-hidden="true"></div>
  </footer>
</template>

<style scoped>
.home-footer {
  flex-shrink: 0;
  padding: 8px 20px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  background: transparent;
  min-height: 36px;
}
.home-footer__version {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
  justify-self: start;
}
.home-footer__slogan {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  justify-self: center;
  text-align: center;
}
.home-footer__heart {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}
.home-footer__spacer {
  justify-self: end;
}
</style>
