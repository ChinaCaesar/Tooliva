<script setup lang="ts">
import { computed, toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ROUTE_PATHS } from "@/config/constants";
import AppSidebar from "@/layouts/app-shell/AppSidebar.vue";
import AppFooter from "@/layouts/app-shell/AppFooter.vue";
import { useAppSidebarCollapse } from "@/layouts/app-shell/composables/useAppSidebarCollapse";
import HomeTopBar from "@/pages/home/components/HomeTopBar.vue";
import { useHomePageData } from "@/pages/home/composables/useHomePageData";
import { resolveHomeToolRoute } from "@/pages/home/config/homeToolRoutes";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { topBar, searchToolEntries, pageConfig } = useHomePageData();
const appSidebarCollapse = useAppSidebarCollapse();
const sidebarCollapsed = toRef(appSidebarCollapse, "collapsed");

watch(
  () => route.name,
  (name) => {
    if (name === "home") appSidebarCollapse.setCollapsed(true);
  },
  { immediate: true }
);

/** 壳内默认展示侧栏；路由 meta.hideAppSidebar 可隐藏（如登录等独立壳外页不适用） */
const showAppSidebar = computed(() => {
  if (route.meta.hideAppSidebar === true) return false;
  return true;
});

function collapseSidebar(): void {
  appSidebarCollapse.setCollapsed(true);
}

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
      :search-placeholder="t(topBar.searchPlaceholderKey)"
      :search-shortcut-label="searchShortcutLabel"
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
        @collapse-for-home="collapseSidebar"
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
    />
  </div>
</template>

<style scoped>
.app-shell {
  border-radius: 16px;
  background: #f5f6fa;
  overflow: hidden;
  height: 100vh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-top: 0;
  box-sizing: border-box;
}
.app-shell__header {
  position: relative;
  z-index: 10;
}
.app-shell__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 0;
  overflow: hidden;
  background: #f5f6fa;
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
