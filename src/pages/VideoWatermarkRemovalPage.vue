<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <div class="video-watermark-removal-page">
    <div class="page-shell">
      <section class="placeholder-panel" aria-labelledby="video-watermark-removal-title">
        <h2 id="video-watermark-removal-title">{{ t("pages.videoWatermarkRemoval.title") }}</h2>
        <p class="placeholder-panel__desc">{{ t("pages.videoWatermarkRemoval.description") }}</p>
        <p class="placeholder-panel__note">{{ t("pages.videoWatermarkRemoval.comingSoon") }}</p>
        <p class="placeholder-panel__related">
          <RouterLink class="placeholder-panel__related-link" :to="{ name: 'image-watermark-removal' }">
            {{ t("pages.videoWatermarkRemoval.relatedImageLink") }}
          </RouterLink>
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.video-watermark-removal-page {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
  min-width: 0;
  box-sizing: border-box;
}

.page-shell {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 12px 20px 120px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.placeholder-panel {
  padding: 32px 24px;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
}

.placeholder-panel h2 {
  margin: 0 0 12px;
  font-size: 1.35rem;
  font-weight: 600;
  color: #0f172a;
}

.placeholder-panel__desc {
  margin: 0 0 12px;
  line-height: 1.6;
  color: #475569;
}

.placeholder-panel__note {
  margin: 0;
  font-size: 0.95rem;
  color: #64748b;
}

.placeholder-panel__related {
  margin: 16px 0 0;
  font-size: 0.95rem;
}

.placeholder-panel__related-link {
  color: #6366f1;
  text-decoration: none;
  font-weight: 500;
}

.placeholder-panel__related-link:hover {
  text-decoration: underline;
}

.placeholder-panel__related-link:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .page-shell {
    padding: 10px 16px 112px;
  }
}
</style>
