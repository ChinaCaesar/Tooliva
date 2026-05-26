<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ROUTE_PATHS } from "@/config/constants";
import HomeGreetingHero from "@/pages/home/components/HomeGreetingHero.vue";
import HomeFeaturedToolsRow from "@/pages/home/components/HomeFeaturedToolsRow.vue";
import HomeValuePropsStrip from "@/pages/home/components/HomeValuePropsStrip.vue";
import RecentUsageList from "@/pages/home/components/RecentUsageList.vue";
import SidebarSecurityCard from "@/pages/home/components/SidebarSecurityCard.vue";
import SidebarMembershipCard from "@/pages/home/components/SidebarMembershipCard.vue";
import SidebarChangelogCard from "@/pages/home/components/SidebarChangelogCard.vue";
import { useHomePageData } from "@/pages/home/composables/useHomePageData";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
import { resolveHomeToolRoute } from "@/pages/home/config/homeToolRoutes";
import { showHomeInfoDialog } from "@/pages/home/utils/homeDialogs";
import { useExternalNavigate } from "@/composables/useExternalNavigate";

const { t } = useI18n();
const router = useRouter();
const { navigate } = useExternalNavigate();
const {
  greetingTitleKey,
  featuredTools,
  valueProps,
  securityBullets,
  membershipBullets,
  changelogEntries,
  recentItems,
  pageConfig
} = useHomePageData();

/** 路由可解析则跳转；否则提示该工具暂不可达。 */
async function handleToolNavigate(actionCode: string): Promise<void> {
  const route = resolveHomeToolRoute(actionCode);
  if (route) {
    router.push(route);
    return;
  }
  await showHomeInfoDialog(t("pages.home.placeholders.toolUnavailable"), t("pages.home.dialogs.placeholderTitle"));
}

function handleRecentItemClick(actionCode: string): void {
  const route = resolveHomeToolRoute(actionCode);
  if (route) {
    router.push(route);
    return;
  }
  void handleToolNavigate(actionCode);
}

async function handlePlaceholder(messageKey: string): Promise<void> {
  await showHomeInfoDialog(t(messageKey), t("pages.home.dialogs.placeholderTitle"));
}

function goMembership(): void {
  router.push(ROUTE_PATHS.membership).catch(() => {
    /* 路由重复导航等可忽略 */
  });
}

async function handleMembershipLearnMore(): Promise<void> {
  await navigate({
    entryId: "home-sidebar-membership-learn-more",
    logicalPath: "/pricing"
  });
}

async function handleChangelogViewAll(): Promise<void> {
  await navigate({
    entryId: "home-sidebar-changelog-view-all",
    logicalPath: "/changelog"
  });
}

async function handleViewAllRecent(): Promise<void> {
  await handlePlaceholder("pages.home.placeholders.viewAllRecent");
}
</script>

<template>
  <div class="home-page">
    <div class="home-page__body">
      <main class="home-page__main">
        <div class="home-page__scroll">
          <!-- Card 1: 问候语 + 主推工具 -->
          <section class="home-card home-card--hero">
            <HomeGreetingHero
              :title="t(greetingTitleKey)"
              :subtitle="t(pageConfig.sections.greeting.subtitleKey)"
              :wave-icon-url="HOME_ASSETS.pubGreetingWave"
              :illustration-url="HOME_ASSETS.pubHeroToolbox"
            />
            <HomeFeaturedToolsRow
              :cards="featuredTools"
              :cta-label="t('pages.home.featured.useNow')"
              @tool-navigate="handleToolNavigate"
            />
          </section>

          <!-- Card 2: 最近使用 -->
          <section class="home-card">
            <RecentUsageList
              :title="t(pageConfig.sections.recentUsage.titleKey)"
              :view-all-label="t(pageConfig.sections.recentUsage.viewAllKey)"
              :items="recentItems"
              empty-state-title-key="pages.home.recent.emptyStateTitle"
              empty-state-hint-key="pages.home.recent.emptyStateHint"
              @recent-item-click="handleRecentItemClick"
              @view-all-recent="handleViewAllRecent"
            />
          </section>

          <!-- Card 3: 价值卖点 -->
          <section class="home-card">
            <HomeValuePropsStrip
              :section-title="t(pageConfig.sections.valueProps.titleKey)"
              :items="valueProps"
            />
          </section>
        </div>
      </main>

      <aside class="home-page__sidebar">
        <div class="home-page__sidebar-scroll">
          <SidebarSecurityCard
            :title="t(pageConfig.sections.sidebar.security.titleKey)"
            :shield-url="HOME_ASSETS.pubShield"
            :bullets="securityBullets"
          />
          <SidebarMembershipCard
            :title="t(pageConfig.sections.sidebar.membership.titleKey)"
            :learn-more-label="t(pageConfig.sections.sidebar.membership.learnMoreKey)"
            :bullets="membershipBullets"
            :cta-label="t(pageConfig.sections.sidebar.membership.ctaKey)"
            @learn-more="handleMembershipLearnMore"
            @cta="goMembership"
          />
          <SidebarChangelogCard
            :title="t(pageConfig.sections.sidebar.changelog.titleKey)"
            :view-all-label="t(pageConfig.sections.sidebar.changelog.viewAllKey)"
            :entries="changelogEntries"
            @view-all="handleChangelogViewAll"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  background: #f5f6fa;
}

.home-page__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 14px;
  padding: 14px 18px 4px;
  overflow: hidden;
}

.home-page__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.home-page__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}
.home-page__scroll::-webkit-scrollbar {
  width: 6px;
}
.home-page__scroll::-webkit-scrollbar-thumb {
  background: #d6d9e0;
  border-radius: 3px;
}

.home-card {
  border-radius: 16px;
  background: #ffffff;
  padding: 18px 18px 18px;
  border: 1px solid #eef0f4;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}
.home-card--hero {
  /* 略增水平内边距，给工具卡 hover 阴影留出裁切区内的空间 */
  padding: 22px 22px 20px;
  overflow: visible;
  position: relative;
  z-index: 1;
}

.home-page__sidebar {
  width: 300px;
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.home-page__sidebar-scroll {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: #d6d9e0 transparent;
}
.home-page__sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.home-page__sidebar-scroll::-webkit-scrollbar-thumb {
  background: #d6d9e0;
  border-radius: 3px;
}

@media (max-width: 1080px) {
  .home-page__sidebar {
    width: 280px;
  }
}
@media (max-width: 900px) {
  .home-page__body {
    flex-direction: column;
    overflow-y: auto;
  }
  .home-page__main,
  .home-page__sidebar {
    width: 100%;
  }
  .home-page__scroll,
  .home-page__sidebar-scroll {
    overflow: visible;
  }
}
</style>
