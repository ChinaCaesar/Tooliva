<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ROUTE_PATHS } from "@/config/constants";
import ToolPageTopBar from "@/components/common/ToolPageTopBar.vue";

const router = useRouter();
const { t } = useI18n();

/**
 * 返回首页，保持工具页统一入口行为。
 */
function backToHome(): void {
  router.push(ROUTE_PATHS.home);
}

/**
 * 打开设置页，复用全局设置入口。
 */
function goToSettings(): void {
  router.push(ROUTE_PATHS.settings);
}
</script>

<template>
  <div class="image-compress-page">
    <ToolPageTopBar title-key="common.backToHome" variant="compact" @back-home="backToHome" @open-settings="goToSettings" />
    <main class="image-compress-page__content">
      <section class="placeholder-panel">
        <h1>{{ t("pages.imageCompress.title") }}</h1>
        <p>{{ t("pages.imageCompress.placeholder") }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.image-compress-page { background: #fff; border-radius: 16px; overflow: hidden; min-height: calc(100vh - 48px); padding-top: 74px; }
.image-compress-page__content { padding: 24px; }
.placeholder-panel {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  background: #ffffff;
}
.placeholder-panel h1 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  line-height: 28px;
}
.placeholder-panel p {
  margin: 8px 0 0;
  color: #6b7280;
  line-height: 22px;
}

.image-compress-page :deep(.tool-top-bar) {
  box-shadow: 0 8px 14px rgba(15, 23, 42, 0.06);
}
</style>
