<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { message } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { ROUTE_PATHS } from "@/config/constants";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
import { HOME_PAGE_CONFIG } from "@/pages/home/config/home.config";
import { HOME_FEATURED_TOOLS_MOCK } from "@/pages/home/mock/home.mock";
import { resolveHomeToolRoute } from "@/pages/home/config/homeToolRoutes";
import { APP_NAV_SECONDARY_ITEMS, type AppNavSecondaryItem } from "@/layouts/app-shell/appNav.config";
import type { HomeFeaturedToolCardDef } from "@/pages/home/types/home";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

/**
 * 与首页主推工具同源；排除「更多工具」占位项（不在侧栏展示）。
 */
const featuredToolsNav = computed(() => HOME_FEATURED_TOOLS_MOCK.filter((item) => item.id !== "feat-more"));

function isFeaturedToolActive(item: HomeFeaturedToolCardDef): boolean {
  if (item.cardType !== "tool" || !item.actionCode) return false;
  const target = resolveHomeToolRoute(item.actionCode);
  return target != null && route.path === target;
}

function navSecondaryActive(item: AppNavSecondaryItem): boolean {
  if (item.kind !== "route" || !item.path) return false;
  return route.path === item.path;
}

async function goHome(): Promise<void> {
  await router.push(ROUTE_PATHS.home).catch(() => {
    /* 重复导航 */
  });
}

async function onFeaturedClick(item: HomeFeaturedToolCardDef): Promise<void> {
  if (item.cardType === "tool" && item.actionCode) {
    const target = resolveHomeToolRoute(item.actionCode);
    if (target) {
      await router.push(target).catch(() => {
        /* 重复导航 */
      });
    }
    return;
  }
  if (item.placeholderMessageKey) {
    const body = t(item.placeholderMessageKey);
    if (isTauri()) {
      await message(body, { title: t("layout.appShell.placeholderTitle") });
    } else {
      globalThis.alert(body);
    }
  }
}

async function onSecondaryClick(item: AppNavSecondaryItem): Promise<void> {
  if (item.kind === "route" && item.path) {
    await router.push(item.path).catch(() => {
      /* 重复导航 */
    });
    return;
  }
  if (item.kind === "placeholder" && item.placeholderMessageKey) {
    const body = t(item.placeholderMessageKey);
    if (isTauri()) {
      await message(body, { title: t("layout.appShell.placeholderTitle") });
    } else {
      globalThis.alert(body);
    }
  }
}
</script>

<template>
  <aside class="app-sidebar" :aria-label="t('layout.appShell.sidebarAria')">
    <nav class="app-sidebar__nav app-sidebar__nav--primary" :aria-label="t('layout.appShell.primaryNavAria')">
      <button
        type="button"
        class="app-sidebar__link app-sidebar__link--home"
        :aria-label="t('common.backToHome')"
        @click="goHome"
      >
        <span class="app-sidebar__back-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="app-sidebar__back-icon">
            <path
              fill="currentColor"
              d="M10.78 4.97a.75.75 0 0 1 0 1.06L5.81 11h13.44a.75.75 0 0 1 0 1.5H5.81l4.97 4.97a.75.75 0 1 1-1.06 1.06l-6.25-6.25a.75.75 0 0 1 0-1.06l6.25-6.25a.75.75 0 0 1 1.06 0"
            />
          </svg>
        </span>
        <span>{{ t("common.backToHome") }}</span>
      </button>

      <button
        v-for="item in featuredToolsNav"
        :key="item.id"
        type="button"
        class="app-sidebar__link app-sidebar__link--tool"
        :class="{ 'app-sidebar__link--active': isFeaturedToolActive(item) }"
        @click="onFeaturedClick(item)"
      >
        <img :src="HOME_ASSETS[item.iconKey]" alt="" class="app-sidebar__tool-icon" />
        <span class="app-sidebar__tool-label">{{ t(item.titleKey) }}</span>
      </button>
    </nav>

    <div class="app-sidebar__spacer" />

    <nav class="app-sidebar__nav app-sidebar__nav--secondary" :aria-label="t('layout.appShell.secondaryNavAria')">
      <button
        v-for="item in APP_NAV_SECONDARY_ITEMS"
        :key="item.id"
        type="button"
        class="app-sidebar__link"
        :class="{ 'app-sidebar__link--active': navSecondaryActive(item) }"
        @click="onSecondaryClick(item)"
      >
        {{ t(item.labelKey) }}
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: 220px;
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 10px;
  border-right: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  box-sizing: border-box;
}
.app-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}
.app-sidebar__nav--primary {
  overflow-y: auto;
  min-height: 0;
  flex: 1 1 auto;
  padding-right: 2px;
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
  transition: background-color 0.15s ease, color 0.15s ease;
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
.app-sidebar__back-icon {
  width: 18px;
  height: 18px;
  display: block;
}
.app-sidebar__link--tool {
  display: flex;
  align-items: center;
  gap: 8px;
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
.app-sidebar__link:hover {
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}
.app-sidebar__link:hover .app-sidebar__back-icon-wrap {
  color: #1d4ed8;
}
.app-sidebar__link--active {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-weight: 600;
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
</style>
