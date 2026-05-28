import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { HomeRecentUsagePayload } from "@/bridge/tauriClient";
import { LOCAL_DATA_CLEARED_EVENT } from "@/config/constants";
import { getAllToolsSorted, getHomeFeaturedToolsSorted, getSearchToolEntriesSorted, getToolByActionCode, normalizeRegistryActionCode } from "@/config/tools.registry";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
import { HOME_PAGE_CONFIG } from "@/pages/home/config/home.config";
import { isTauri } from "@tauri-apps/api/core";
import { tauriClient } from "@/bridge/tauriClient";
import { fetchChangelogEntries } from "@/modules/changelog/api";
import {
  HOME_CHANGELOG_MOCK,
  HOME_MEMBERSHIP_BULLETS_MOCK,
  HOME_RECENT_ITEMS_MOCK,
  HOME_SECURITY_BULLETS_MOCK,
  HOME_VALUE_PROPS_MOCK
} from "@/pages/home/mock/home.mock";

interface HomeRecentItemViewModel {
  id: string;
  iconUrl: string;
  iconBackground: string;
  titleKey: string;
  fileName: string;
  relativeTimeKey: string;
  isEmpty?: boolean;
  actionCode?: string;
}

interface HomeFeaturedToolCardViewModel {
  id: string;
  iconUrl: string;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  actionCode: string;
}

interface HomeValuePropViewModel {
  id: string;
  iconUrl: string;
  titleKey: string;
  descriptionKey: string;
}

interface HomeSidebarBulletViewModel {
  id: string;
  labelKey: string;
  checkStyle: "green" | "orange";
}

interface HomeChangelogEntryViewModel {
  id: string;
  version: string;
  dateKey?: string;
  summaryKey?: string;
  dateText?: string;
  summaryText?: string;
}

/** 与后端「每工具最近一次」语义对齐的防御性去重（兼容旧版返回多条同工具事件）。 */
function dedupeRecentUsageByTool(items: HomeRecentUsagePayload[]): HomeRecentUsagePayload[] {
  const best = new Map<string, HomeRecentUsagePayload>();
  for (const item of items) {
    const cur = best.get(item.toolKey);
    if (!cur || item.usedAtTs > cur.usedAtTs || (item.usedAtTs === cur.usedAtTs && item.id > cur.id)) {
      best.set(item.toolKey, item);
    }
  }
  return Array.from(best.values())
    .sort((a, b) => b.usedAtTs - a.usedAtTs || b.id - a.id)
    .slice(0, 4);
}

const ROUTABLE_TOOL_KEYS = new Set(getAllToolsSorted().map((t) => normalizeRegistryActionCode(t.actionCode)));

function normalizeHomeToolKey(toolKey: string): string {
  return normalizeRegistryActionCode(toolKey);
}

function resolveRecentItemMeta(toolKey: string): { titleKey: string; iconUrl: string; iconBackground: string } {
  const key = normalizeHomeToolKey(toolKey);
  const def = getToolByActionCode(key);
  if (!def) {
    return {
      titleKey: "pages.home.tools.removedTool.shortTitle",
      iconUrl: HOME_ASSETS.pubToolImageCompress,
      iconBackground: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)"
    };
  }
  return {
    titleKey: def.shortTitleKey,
    iconUrl: HOME_ASSETS[def.iconKey],
    iconBackground: def.gradient
  };
}

function mapMockRecentToViewModels(): HomeRecentItemViewModel[] {
  const seen = new Set<string>();
  const out: HomeRecentItemViewModel[] = [];
  for (const item of HOME_RECENT_ITEMS_MOCK) {
    const key = normalizeHomeToolKey(item.toolKey ?? "image-compress");
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = resolveRecentItemMeta(key);
    out.push({
      id: item.id,
      iconUrl: meta.iconUrl,
      iconBackground: meta.iconBackground,
      titleKey: meta.titleKey,
      fileName: item.fileName,
      relativeTimeKey: item.relativeTimeKey,
      isEmpty: false,
      actionCode: ROUTABLE_TOOL_KEYS.has(key) ? key : undefined
    });
    if (out.length >= 4) break;
  }
  return out;
}

function mapRelativeTimeKey(usedAtTs: number): string {
  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - usedAtTs);
  if (diffSeconds < 300) return "pages.home.recent.usedJustNow";
  if (diffSeconds < 3600) return "pages.home.relativeTime.fifteenMinutesAgo";
  if (diffSeconds < 86400) return "pages.home.relativeTime.oneHourAgo";
  if (diffSeconds < 172800) return "pages.home.recent.usedYesterday";
  if (diffSeconds < 259200) return "pages.home.recent.usedTwoDaysAgo";
  return "pages.home.relativeTime.twoDaysAgo";
}

function greetingTitleKeyFromHour(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "pages.home.greeting.morning";
  if (h >= 12 && h < 18) return "pages.home.greeting.afternoon";
  if (h >= 18 && h < 22) return "pages.home.greeting.evening";
  return "pages.home.greeting.night";
}

/**
 * 首页数据装配层，后续可切换为 API 数据源。
 */
export function useHomePageData() {
  const { locale } = useI18n();
  const recentItems = ref<HomeRecentItemViewModel[]>(mapMockRecentToViewModels());
  const changelogEntries = ref<HomeChangelogEntryViewModel[]>(HOME_CHANGELOG_MOCK);

  const greetingTitleKey = computed(() => greetingTitleKeyFromHour());

  const topBar = computed(() => ({
    ...HOME_PAGE_CONFIG.topBar,
    logoUrl: HOME_ASSETS.pubAppLogo,
    crownIconUrl: HOME_ASSETS.pubCrown
  }));

  const featuredTools = computed<HomeFeaturedToolCardViewModel[]>(() =>
    getHomeFeaturedToolsSorted().map((item) => ({
      id: item.key,
      iconUrl: HOME_ASSETS[item.iconKey],
      titleKey: item.titleKey,
      descriptionKey: item.descriptionKey,
      gradient: item.gradient,
      actionCode: item.actionCode
    }))
  );

  const valueProps = computed<HomeValuePropViewModel[]>(() =>
    HOME_VALUE_PROPS_MOCK.map((item) => ({
      id: item.id,
      iconUrl: HOME_ASSETS[item.iconKey],
      titleKey: item.titleKey,
      descriptionKey: item.descriptionKey
    }))
  );

  const securityBullets = computed<HomeSidebarBulletViewModel[]>(() =>
    HOME_SECURITY_BULLETS_MOCK.map((item) => ({
      id: item.id,
      labelKey: item.labelKey,
      checkStyle: "green"
    }))
  );

  const membershipBullets = computed<HomeSidebarBulletViewModel[]>(() =>
    HOME_MEMBERSHIP_BULLETS_MOCK.map((item) => ({
      id: item.id,
      labelKey: item.labelKey,
      checkStyle: "orange"
    }))
  );

  const searchToolEntries = computed(() => getSearchToolEntriesSorted());

  const pageConfig = computed(() => HOME_PAGE_CONFIG);

  async function hydrateDashboardFromSqlite(): Promise<void> {
    if (!isTauri()) {
      return;
    }
    try {
      const dashboard = await tauriClient.getHomeDashboard();
      const deduped = dedupeRecentUsageByTool(dashboard.recentItems);

      if (deduped.length === 0) {
        recentItems.value = [];
      } else {
        recentItems.value = deduped.map((item) => {
          const normalized = normalizeHomeToolKey(item.toolKey);
          const meta = resolveRecentItemMeta(normalized);
          return {
            id: `recent-${item.id}`,
            iconUrl: meta.iconUrl,
            iconBackground: meta.iconBackground,
            titleKey: meta.titleKey,
            fileName: item.fileName,
            relativeTimeKey: mapRelativeTimeKey(item.usedAtTs),
            isEmpty: false,
            actionCode: ROUTABLE_TOOL_KEYS.has(normalized) ? normalized : undefined
          };
        });
      }
    } catch {
      recentItems.value = [];
    }
  }

  async function hydrateChangelog(): Promise<void> {
    try {
      const entries = await fetchChangelogEntries(2, locale.value);
      if (entries.length === 0) {
        changelogEntries.value = HOME_CHANGELOG_MOCK;
        return;
      }

      changelogEntries.value = entries.map((item) => ({
        id: item.id,
        version: item.version,
        dateText: item.date,
        summaryText: item.summary
      }));
    } catch {
      changelogEntries.value = HOME_CHANGELOG_MOCK;
    }
  }

  function onLocalDataCleared(): void {
    if (!isTauri()) {
      recentItems.value = [];
      return;
    }
    void hydrateDashboardFromSqlite();
  }

  onMounted(() => {
    void hydrateDashboardFromSqlite();
    void hydrateChangelog();
    globalThis.addEventListener(LOCAL_DATA_CLEARED_EVENT, onLocalDataCleared);
  });

  watch(locale, () => {
    void hydrateChangelog();
  });

  onUnmounted(() => {
    globalThis.removeEventListener(LOCAL_DATA_CLEARED_EVENT, onLocalDataCleared);
  });

  return {
    topBar,
    greetingTitleKey,
    featuredTools,
    valueProps,
    securityBullets,
    membershipBullets,
    changelogEntries,
    searchToolEntries,
    recentItems,
    pageConfig
  };
}
