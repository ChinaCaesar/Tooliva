<script setup lang="ts">
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
const { topBar, coreTools, placeholders, recentItems, quickActions, footerLinks, stats, membership, pageConfig } =
  useHomePageData();

/**
 * 处理首页工具卡片点击事件。
 */
function handleToolClick(actionCode: string): void {
  if (actionCode === "video-convert") {
    router.push(ROUTE_PATHS.videoConvert);
  }
}
</script>

<template>
  <div class="home-page">
    <HomeTopBar
      :logo-url="topBar.logoUrl"
      :app-name="t(topBar.appNameKey)"
      :search-icon-url="topBar.searchIconUrl"
      :search-placeholder="t(topBar.searchPlaceholderKey)"
      :avatar-url="topBar.avatarUrl"
      :user-name="t(topBar.userNameKey)"
      :user-role="t(topBar.userRoleKey)"
      :settings-icon-url="topBar.settingsIconUrl"
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
        <RecentUsageList :title="t(pageConfig.sections.recentUsage.titleKey)" :items="recentItems" />
      </main>

      <SideInfoPanel
        :membership-title="t('pages.home.membership.title')"
        :membership="membership"
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
}
.home-page__content {
  display: flex;
  gap: 24px;
  padding: 24px;
}
.home-page__main { flex: 1; min-width: 0; }
@media (max-width: 1260px) {
  .home-page__content { flex-direction: column; }
}
</style>
