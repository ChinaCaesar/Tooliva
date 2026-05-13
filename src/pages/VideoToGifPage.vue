<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <div class="tool-workspace-page">
    <div class="tool-workspace-page__scroll">
      <header class="tool-workspace-head">
        <h2 id="video-to-gif-title" class="tool-workspace-head__title">{{ t("pages.videoToGif.title") }}</h2>
        <p class="tool-workspace-head__desc">{{ t("pages.videoToGif.description") }}</p>
      </header>
      <section class="tool-workspace-placeholder" aria-labelledby="video-to-gif-title">
        <p class="tool-workspace-placeholder__note">{{ t("pages.videoToGif.comingSoon") }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tool-workspace-page {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f6fa;
  min-width: 0;
  box-sizing: border-box;
}

.tool-workspace-page__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 18px 24px;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}
.tool-workspace-page__scroll::-webkit-scrollbar {
  width: 6px;
}
.tool-workspace-page__scroll::-webkit-scrollbar-thumb {
  background: #d6d9e0;
  border-radius: 3px;
}

.tool-workspace-head {
  margin-bottom: 14px;
}

.tool-workspace-head__title {
  margin: 0 0 8px;
  font-size: clamp(18px, 1.6vw, 22px);
  font-weight: 600;
  line-height: 1.35;
  color: #1f2937;
  letter-spacing: 0;
}

.tool-workspace-head__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #4b5563;
  max-width: 52rem;
}

.tool-workspace-placeholder {
  border-radius: 16px;
  border: 1px dashed #d6d9e0;
  background: #fafbfd;
  padding: 28px 22px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.tool-workspace-placeholder__note {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #6b7280;
  text-align: center;
  max-width: 28rem;
}

@media (prefers-reduced-motion: reduce) {
  .tool-workspace-page__scroll {
    scroll-behavior: auto;
  }
}
</style>
