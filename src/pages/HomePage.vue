<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ROUTE_PATHS } from "@/config/constants";
import HomeTopBar from "@/pages/home/components/HomeTopBar.vue";
import CoreToolGrid from "@/pages/home/components/CoreToolGrid.vue";
import RecentUsageList from "@/pages/home/components/RecentUsageList.vue";
import SideInfoPanel from "@/pages/home/components/SideInfoPanel.vue";
import HomeFooterBar from "@/pages/home/components/HomeFooterBar.vue";
import { useHomePageData } from "@/pages/home/composables/useHomePageData";

/**
 * 首页组装容器，仅负责页面编排与多语言映射。
 */
const { t } = useI18n();
const router = useRouter();
const { topBar, coreTools, placeholders, recentItems, quickActions, footerLinks, stats, frequentTools, pageConfig } =
  useHomePageData();

/**
 * 处理首页工具卡片点击事件。
 */
function handleToolClick(actionCode: string): void {
  if (actionCode === "video-convert") {
    router.push(ROUTE_PATHS.videoConvert);
    return;
  }
  if (actionCode === "image-compress") {
    router.push(ROUTE_PATHS.imageCompress);
    return;
  }
  if (actionCode === "image-upscale") {
    router.push(ROUTE_PATHS.imageUpscale);
    return;
  }
  if (actionCode === "image-watermark") {
    router.push(ROUTE_PATHS.imageWatermark);
  }
}

/**
 * 处理首页高频工具点击跳转。
 */
function handleFrequentToolClick(route: string): void {
  if (!route) return;
  router.push(route);
}

/**
 * 首页顶部搜索候选列表，统一由核心工具映射生成。
 */
const searchableTools = computed(() =>
  coreTools.value.map((item) => ({
    id: item.id,
    title: t(item.titleKey),
    route:
      item.actionCode === "video-convert"
        ? ROUTE_PATHS.videoConvert
        : item.actionCode === "image-compress"
          ? ROUTE_PATHS.imageCompress
          : item.actionCode === "image-upscale"
            ? ROUTE_PATHS.imageUpscale
            : ROUTE_PATHS.imageWatermark
  }))
);

/**
 * 处理顶部快捷搜索项点击，跳转到对应工具页。
 */
function handleSearchSelect(route: string): void {
  if (!route) return;
  router.push(route);
}
</script>

<template>
  <div class="home-page">
    <HomeTopBar
      :logo-url="topBar.logoUrl"
      :app-name="t(topBar.appNameKey)"
      :search-icon-url="topBar.searchIconUrl"
      :search-placeholder="t(topBar.searchPlaceholderKey)"
      :settings-icon-url="topBar.settingsIconUrl"
      :search-tools="searchableTools"
      @search-select="handleSearchSelect"
    />

    <section class="home-page__content">
      <main class="home-page__main">
        <CoreToolGrid
          :title="t(pageConfig.sections.coreTools.titleKey)"
          :description="t(pageConfig.sections.coreTools.descriptionKey)"
          :cards="coreTools"
          :placeholders="placeholders"
          @tool-click="handleToolClick"
        />
        <RecentUsageList
          :title="t(pageConfig.sections.recentUsage.titleKey)"
          :frequent-tools-title="t('pages.home.sections.frequentTools.title')"
          :times-unit-label="t('pages.home.frequent.timesUnit')"
          :items="recentItems"
          :frequent-tools="frequentTools"
          @frequent-tool-click="handleFrequentToolClick"
        />
      </main>

      <SideInfoPanel
        :stats-title="t(pageConfig.sections.usageStats.titleKey)"
        :stats="stats"
        :quick-actions-title="t(pageConfig.sections.quickActions.titleKey)"
        :quick-actions="quickActions"
      />
    </section>

    <HomeFooterBar
      :copyright-text="t(pageConfig.footer.copyrightKey)"
      :version-prefix="t(pageConfig.footer.versionPrefixKey)"
      :version="pageConfig.footer.version"
      :links="footerLinks"
    />
  </div>
</template>

<style scoped>
.home-page {
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
  min-height: calc(100vh - 48px);
  padding-top: 72px;
}
.home-page__content {
  display: flex;
  gap: 24px;
  padding: 24px;
}
.home-page__main { flex: 1; min-width: 0; }
.home-page :deep(.side-panel) {
  width: 320px;
  flex-shrink: 0;
}
.home-page :deep(.home-top-bar) {
  box-shadow: 0 8px 14px rgba(15, 23, 42, 0.06);
}
@media (max-width: 1260px) {
  .home-page__content { flex-direction: column; }
  .home-page :deep(.side-panel) {
    width: 100%;
  }
}
@media (max-width: 1180px) {
  .home-page__content {
    gap: 20px;
    padding: 20px;
  }
}
@media (max-width: 768px) {
  .home-page {
    min-height: 100vh;
    padding-top: 124px;
  }
  .home-page__content {
    padding: 16px;
    gap: 16px;
  }
}
</style>
