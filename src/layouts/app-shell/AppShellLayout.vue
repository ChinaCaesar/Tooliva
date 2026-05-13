<script setup lang="ts">
import { computed, toRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ROUTE_PATHS } from "@/config/constants";
import AppSidebar from "@/layouts/app-shell/AppSidebar.vue";
import AppFooter from "@/layouts/app-shell/AppFooter.vue";
import { useAppSidebarCollapse } from "@/layouts/app-shell/composables/useAppSidebarCollapse";
import HomeTopBar from "@/pages/home/components/HomeTopBar.vue";
import { useHomePageData } from "@/pages/home/composables/useHomePageData";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
import { resolveHomeToolRoute } from "@/pages/home/config/homeToolRoutes";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { topBar, searchToolEntries, pageConfig } = useHomePageData();
const appSidebarCollapse = useAppSidebarCollapse();
const sidebarCollapsed = toRef(appSidebarCollapse, "collapsed");

/** 首页不展示侧栏；其余壳内子页默认展示，除非路由 meta.hideAppSidebar 为 true */
const showAppSidebar = computed(() => {
  const p = route.path;
  if (p === ROUTE_PATHS.home || p === "/" || p === "") return false;
  if (route.meta.hideAppSidebar === true) return false;
  return true;
});

const isApplePlatform = computed(() => /Mac|iPhone|iPad|iPod/i.test(navigator.platform));

const searchShortcutLabel = computed(() =>
  isApplePlatform.value ? t(topBar.value.searchShortcutMacKey) : t(topBar.value.searchShortcutKey)
);

const searchableTools = computed(() =>
  searchToolEntries.value.map((item) => {
    const route = resolveHomeToolRoute(item.actionCode);
    return {
      id: item.id,
      title: t(item.titleKey),
      route: route ?? ROUTE_PATHS.home
    };
  })
);

function handleSearchSelect(route: string): void {
  if (!route || route === ROUTE_PATHS.home) return;
  router.push(route);
}

function goMembership(): void {
  router.push(ROUTE_PATHS.membership).catch(() => {
    /* 重复导航 */
  });
}
</script>

<template>
  <div class="app-shell">
    <HomeTopBar
      class="app-shell__header"
      show-window-controls
      :logo-url="topBar.logoUrl"
      :app-name="t(topBar.appNameKey)"
      :tagline="t(topBar.taglineKey)"
      :search-icon-url="topBar.searchIconUrl"
      :search-placeholder="t(topBar.searchPlaceholderKey)"
      :search-shortcut-label="searchShortcutLabel"
      :settings-icon-url="topBar.settingsIconUrl"
      :settings-aria-label="t('pages.home.topBar.settingsAria')"
      :member-cta-label="t(topBar.memberCtaKey)"
      :crown-icon-url="topBar.crownIconUrl"
      :search-tools="searchableTools"
      @search-select="handleSearchSelect"
      @member-cta="goMembership"
    />

    <div class="app-shell__body">
      <AppSidebar
        v-if="showAppSidebar"
        :collapsed="sidebarCollapsed"
        @toggle-collapse="appSidebarCollapse.toggle"
      />
      <main class="app-shell__main" :class="{ 'app-shell__main--full': !showAppSidebar }">
        <div class="app-shell__router">
          <RouterView v-slot="{ Component }">
            <Transition name="route-shell" mode="out-in">
              <component :is="Component" :key="route.fullPath" />
            </Transition>
          </RouterView>
        </div>
      </main>
    </div>

    <AppFooter
      :version-prefix="t(pageConfig.footer.versionPrefixKey)"
      :version="pageConfig.footer.version"
      :slogan="t(pageConfig.footer.sloganKey)"
      :heart-icon-url="HOME_ASSETS.pubHeartFooter"
    />
  </div>
</template>

<style scoped>
.app-shell {
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
  height: 100vh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-top: 10px;
  box-sizing: border-box;
}
.app-shell__header {
  box-shadow: 0 8px 14px rgba(15, 23, 42, 0.06);
}
.app-shell__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 0;
  overflow: hidden;
}
.app-shell__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.app-shell__main--full {
  min-width: 100%;
}
.app-shell :deep(.home-top-bar) {
  box-shadow: 0 8px 14px rgba(15, 23, 42, 0.06);
}

.app-shell__router {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}
</style>

<style>
.route-shell-enter-active {
  transition:
    opacity 0.2s cubic-bezier(0.33, 1, 0.68, 1),
    transform 0.2s cubic-bezier(0.33, 1, 0.68, 1);
}
.route-shell-leave-active {
  transition:
    opacity 0.16s cubic-bezier(0.4, 0, 1, 1),
    transform 0.16s cubic-bezier(0.4, 0, 1, 1);
}
.route-shell-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.route-shell-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .route-shell-enter-active,
  .route-shell-leave-active {
    transition-duration: 0.01ms !important;
    transition-property: opacity !important;
  }
  .route-shell-enter-from,
  .route-shell-leave-to {
    transform: none !important;
  }
}
</style>
