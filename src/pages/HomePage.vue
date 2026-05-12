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

const { t } = useI18n();
const router = useRouter();
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

function handleToolNavigate(actionCode: string): void {
  const route = resolveHomeToolRoute(actionCode);
  if (route) router.push(route);
}

function handleRecentItemClick(actionCode: string): void {
  const route = resolveHomeToolRoute(actionCode);
  if (route) router.push(route);
}

async function handlePlaceholder(messageKey: string): Promise<void> {
  await showHomeInfoDialog(t(messageKey), t("pages.home.dialogs.placeholderTitle"));
}

function goMembership(): void {
  router.push(ROUTE_PATHS.membership).catch(() => {
    /* 路由重复导航等可忽略 */
  });
}

async function handleChangelogViewAll(): Promise<void> {
  await showHomeInfoDialog(
    t("pages.home.sections.sidebar.changelog.viewAllHint"),
    t(pageConfig.value.sections.sidebar.changelog.titleKey)
  );
}
</script>

<template>
  <div class="home-page">
    <div class="home-page__body">
      <main class="home-page__main">
        <div class="home-page__main-scroll">
          <div class="home-page__main-stack">
            <HomeGreetingHero
              class="home-page__hero"
              :title="t(greetingTitleKey)"
              :subtitle="t(pageConfig.sections.greeting.subtitleKey)"
            />
            <div class="home-page__featured-slot">
              <HomeFeaturedToolsRow
                :cards="featuredTools"
                :cta-label="t('pages.home.featured.useNow')"
                @tool-navigate="handleToolNavigate"
                @placeholder="handlePlaceholder"
              />
            </div>
            <RecentUsageList
              class="home-page__recent-slot"
              :title="t(pageConfig.sections.recentUsage.titleKey)"
              :view-all-label="t(pageConfig.sections.recentUsage.viewAllKey)"
              :items="recentItems"
              empty-state-title-key="pages.home.recent.emptyStateTitle"
              empty-state-hint-key="pages.home.recent.emptyStateHint"
              @recent-item-click="handleRecentItemClick"
              @view-all-recent="handlePlaceholder('pages.home.placeholders.viewAllRecent')"
            />
            <HomeValuePropsStrip
              class="home-page__value-slot"
              :section-title="t(pageConfig.sections.valueProps.titleKey)"
              :items="valueProps"
            />
          </div>
        </div>
      </main>

      <aside class="home-page__sidebar">
        <div class="home-page__sidebar-scroll">
          <div class="home-page__sidebar-pane">
            <SidebarSecurityCard
              :title="t(pageConfig.sections.sidebar.security.titleKey)"
              :shield-url="HOME_ASSETS.pubShield"
              :bullets="securityBullets"
            />
          </div>
          <div class="home-page__sidebar-pane">
            <SidebarMembershipCard
              :title="t(pageConfig.sections.sidebar.membership.titleKey)"
              :learn-more-label="t(pageConfig.sections.sidebar.membership.learnMoreKey)"
              :bullets="membershipBullets"
              :cta-label="t(pageConfig.sections.sidebar.membership.ctaKey)"
              @learn-more="goMembership"
              @cta="goMembership"
            />
          </div>
          <div class="home-page__sidebar-pane">
            <SidebarChangelogCard
              :title="t(pageConfig.sections.sidebar.changelog.titleKey)"
              :view-all-label="t(pageConfig.sections.sidebar.changelog.viewAllKey)"
              :entries="changelogEntries"
              @view-all="handleChangelogViewAll"
            />
          </div>
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
}
.home-page__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: clamp(12px, 1.5vw, 18px);
  padding: clamp(8px, 1.2vh, 14px) clamp(14px, 2vw, 22px) clamp(6px, 1vh, 10px);
  overflow: hidden;
}
.home-page__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.home-page__main-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
}
.home-page__main-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1vh, 12px);
}
.home-page__hero {
  flex-shrink: 0;
}
.home-page__featured-slot {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.home-page__recent-slot {
  flex-shrink: 0;
}
.home-page__value-slot {
  flex-shrink: 0;
  margin-top: auto;
  padding-top: clamp(4px, 0.8vh, 10px);
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1vh, 10px);
  padding-bottom: 4px;
}
.home-page__sidebar-pane {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.home-page__sidebar-pane :deep(.side-card),
.home-page__sidebar-pane :deep(.member-card),
.home-page__sidebar-pane :deep(.changelog-card) {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
}
</style>
