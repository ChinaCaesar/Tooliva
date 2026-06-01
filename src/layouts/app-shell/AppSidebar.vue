<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ChevronLeft, Crown, House } from "@lucide/vue";
import { ROUTE_PATHS } from "@/config/constants";
import { runRouteInterruptCheck } from "@/router/interruptGuard";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
import { getAllToolsSorted, type AppToolDef } from "@/config/tools.registry";
import { resolveHomeToolRoute } from "@/pages/home/config/homeToolRoutes";
import { APP_NAV_SECONDARY_ITEMS, type AppNavSecondaryItem } from "@/layouts/app-shell/appNav.config";
import { showAppAlert } from "@/utils/appDialog";

defineProps<{
  collapsed: boolean;
}>();

const emit = defineEmits<{
  toggleCollapse: [];
  collapseForHome: [];
}>();

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

/** 与工具注册表同源：全部可路由工具（含仅导航项）。 */
const featuredToolsNav = computed(() => getAllToolsSorted());

function isFeaturedToolActive(item: AppToolDef): boolean {
  const target = resolveHomeToolRoute(item.actionCode);
  return target != null && route.path === target;
}

function navSecondaryActive(item: AppNavSecondaryItem): boolean {
  if (item.kind !== "route" || !item.path) return false;
  return route.path === item.path;
}

async function goHome(): Promise<void> {
  if (!(await runRouteInterruptCheck())) return;
  emit("collapseForHome");
  await router.push(ROUTE_PATHS.home).catch(() => {
    /* 重复导航 */
  });
}

async function onFeaturedClick(item: AppToolDef): Promise<void> {
  const target = resolveHomeToolRoute(item.actionCode);
  if (target) {
    if (!(await runRouteInterruptCheck())) return;
    await router.push(target).catch(() => {
      /* 重复导航 */
    });
  }
}

async function onSecondaryClick(item: AppNavSecondaryItem): Promise<void> {
  if (item.kind === "route" && item.path) {
    if (!(await runRouteInterruptCheck())) return;
    await router.push(item.path).catch(() => {
      /* 重复导航 */
    });
    return;
  }
  if (item.kind === "placeholder" && item.placeholderMessageKey) {
    await showAppAlert({
      title: t("layout.appShell.placeholderTitle"),
      message: t(item.placeholderMessageKey)
    });
  }
}
</script>

<template>
  <aside
    class="app-sidebar"
    :class="{ 'app-sidebar--collapsed': collapsed }"
    :aria-label="t('layout.appShell.sidebarAria')"
  >
    <div class="app-sidebar__toolbar">
      <button
        type="button"
        class="app-sidebar__collapse-btn"
        :aria-expanded="!collapsed"
        aria-controls="app-sidebar-nav"
        :aria-label="collapsed ? t('layout.appShell.expandSidebar') : t('layout.appShell.collapseSidebar')"
        @click="emit('toggleCollapse')"
      >
        <span class="app-sidebar__collapse-icon-wrap" aria-hidden="true">
          <ChevronLeft
            :size="18"
            :stroke-width="2"
            class="app-sidebar__collapse-lucide"
            :class="{ 'app-sidebar__collapse-lucide--collapsed': collapsed }"
          />
        </span>
      </button>
    </div>

    <div id="app-sidebar-nav" class="app-sidebar__regions">
      <nav class="app-sidebar__nav app-sidebar__nav--primary" :aria-label="t('layout.appShell.primaryNavAria')">
        <button
          type="button"
          class="app-sidebar__link app-sidebar__link--home"
          :aria-label="t('common.backToHome')"
          @click="goHome"
        >
          <span class="app-sidebar__back-icon-wrap" aria-hidden="true">
            <House :size="18" :stroke-width="2" class="app-sidebar__back-lucide" />
          </span>
          <span class="app-sidebar__label-text">{{ t("common.backToHome") }}</span>
        </button>

        <button
          v-for="item in featuredToolsNav"
          :key="item.key"
          type="button"
          class="app-sidebar__link app-sidebar__link--tool"
          :class="{ 'app-sidebar__link--active': isFeaturedToolActive(item) }"
          @click="onFeaturedClick(item)"
        >
          <img :src="HOME_ASSETS[item.iconKey]" alt="" class="app-sidebar__tool-icon" />
          <span class="app-sidebar__tool-label app-sidebar__label-text">{{ t(item.titleKey) }}</span>
        </button>
      </nav>

      <div class="app-sidebar__spacer" />

      <nav class="app-sidebar__nav app-sidebar__nav--secondary" :aria-label="t('layout.appShell.secondaryNavAria')">
        <button
          v-for="item in APP_NAV_SECONDARY_ITEMS"
          :key="item.id"
          type="button"
          class="app-sidebar__link app-sidebar__link--secondary"
          :class="{
            'app-sidebar__link--active': navSecondaryActive(item),
            'app-sidebar__link--membership-active': item.id === 'membership' && navSecondaryActive(item)
          }"
          :title="
            collapsed && item.subtitleKey ? `${t(item.labelKey)} — ${t(item.subtitleKey)}` : undefined
          "
          :aria-label="
            collapsed && item.subtitleKey ? `${t(item.labelKey)}. ${t(item.subtitleKey)}` : undefined
          "
          @click="onSecondaryClick(item)"
        >
          <span class="app-sidebar__sec-icon-wrap" aria-hidden="true">
            <Crown v-if="item.id === 'membership'" :size="18" :stroke-width="2" class="app-sidebar__sec-lucide" />
            <svg v-else viewBox="0 0 24 24" class="app-sidebar__sec-icon">
              <path
                fill="currentColor"
                d="M3 17v2h6v-2H3zm0-6v2h10v-2H3zm0-6v2h14V5H3zm16 14h-2v-4h2v4zm0-6h-2v-4h2v4zm0-6h-2V3h2v4z"
              />
            </svg>
          </span>
          <span class="app-sidebar__sec-col">
            <span class="app-sidebar__sec-label app-sidebar__label-text">{{ t(item.labelKey) }}</span>
            <span v-if="item.subtitleKey" class="app-sidebar__sec-sub app-sidebar__label-text">{{
              t(item.subtitleKey)
            }}</span>
          </span>
        </button>
      </nav>
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar {
  --app-sidebar-width-expanded: 160px;
  --app-sidebar-width-collapsed: 60px;
  width: var(--app-sidebar-width-expanded);
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 10px 10px;
  border-right: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  box-sizing: border-box;
  transition:
    width 0.22s cubic-bezier(0.33, 1, 0.68, 1),
    padding 0.22s cubic-bezier(0.33, 1, 0.68, 1);
}
.app-sidebar--collapsed {
  width: var(--app-sidebar-width-collapsed);
  padding: 8px 6px 10px;
}
.app-sidebar__toolbar {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 6px;
}
.app-sidebar--collapsed .app-sidebar__toolbar {
  justify-content: center;
}
.app-sidebar__collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #475569;
  cursor: pointer;
  transition:
    background-color 0.18s ease-out,
    color 0.18s ease-out,
    transform 0.22s cubic-bezier(0.33, 1, 0.68, 1);
}
.app-sidebar__collapse-btn:hover {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}
.app-sidebar__collapse-btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
.app-sidebar__collapse-btn:active {
  transform: scale(0.94);
}
.app-sidebar__collapse-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
}
.app-sidebar__collapse-lucide {
  display: block;
  color: inherit;
  transition: transform 0.22s cubic-bezier(0.33, 1, 0.68, 1);
}
.app-sidebar__collapse-lucide--collapsed {
  transform: rotate(180deg);
}
.app-sidebar__regions {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.app-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}
.app-sidebar__nav--primary {
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  flex: 1 1 auto;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: #b8c4d6 transparent;
}
.app-sidebar__nav--primary::-webkit-scrollbar {
  width: 1px;
}
.app-sidebar__nav--primary::-webkit-scrollbar-track {
  background: transparent;
}
.app-sidebar__nav--primary::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #d4dce8 0%, #b8c4d6 100%);
  border-radius: 999px;
}
.app-sidebar__nav--primary::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #b8c4d6 0%, #94a3b8 100%);
}
.app-sidebar__nav--secondary {
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
}
.app-sidebar__spacer {
  flex: 0 0 8px;
}
.app-sidebar__link {
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #334155;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  padding: 8px 10px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    padding 0.22s cubic-bezier(0.33, 1, 0.68, 1);
}
.app-sidebar__link--home {
  display: flex;
  align-items: center;
  gap: 8px;
}
.app-sidebar__back-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: #475569;
}
.app-sidebar__back-lucide {
  display: block;
  color: inherit;
}
.app-sidebar__link--tool {
  display: flex;
  align-items: center;
  gap: 8px;
}
.app-sidebar__link--secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
.app-sidebar__sec-col {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.app-sidebar__sec-sub {
  font-size: 11px;
  line-height: 1.35;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.app-sidebar__sec-lucide {
  display: block;
  color: inherit;
}
.app-sidebar__link--membership-active {
  position: relative;
  padding-left: 12px;
  background: rgba(59, 130, 246, 0.12) !important;
}
.app-sidebar__link--membership-active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: #3b82f6;
}
.app-sidebar__link--membership-active .app-sidebar__sec-sub {
  color: #1e40af;
}
.app-sidebar__sec-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: #475569;
}
.app-sidebar__sec-icon {
  width: 18px;
  height: 18px;
  display: block;
}
.app-sidebar__tool-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}
.app-sidebar__tool-label {
  min-width: 0;
  flex: 1;
}
.app-sidebar__sec-label {
  min-width: 0;
  flex: 1;
}
.app-sidebar__label-text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  transition:
    opacity 0.2s cubic-bezier(0.33, 1, 0.68, 1),
    max-width 0.22s cubic-bezier(0.33, 1, 0.68, 1);
  max-width: 200px;
  opacity: 1;
}
.app-sidebar--collapsed .app-sidebar__label-text,
.app-sidebar--collapsed .app-sidebar__sec-label {
  max-width: 0;
  opacity: 0;
  pointer-events: none;
}
.app-sidebar--collapsed .app-sidebar__link--home,
.app-sidebar--collapsed .app-sidebar__link--tool,
.app-sidebar--collapsed .app-sidebar__link--secondary {
  justify-content: center;
  gap: 0;
  padding-left: 8px;
  padding-right: 8px;
  min-height: 40px;
}
.app-sidebar__link:hover {
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}
.app-sidebar__link:hover .app-sidebar__back-icon-wrap,
.app-sidebar__link:hover .app-sidebar__sec-icon-wrap {
  color: #1d4ed8;
}
.app-sidebar__link--active {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-weight: 600;
}
.app-sidebar__link--active .app-sidebar__sec-icon-wrap {
  color: #1d4ed8;
}
.app-sidebar__link:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
.app-sidebar__version {
  margin: 10px 6px 0;
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .app-sidebar,
  .app-sidebar__link,
  .app-sidebar__collapse-btn,
  .app-sidebar__collapse-lucide,
  .app-sidebar__label-text {
    transition-duration: 0.01ms !important;
  }
  .app-sidebar__collapse-lucide--collapsed {
    transform: none;
  }
  .app-sidebar__collapse-btn:active {
    transform: none;
  }
}
</style>
