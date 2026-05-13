import { computed, onMounted, onUnmounted, ref } from "vue";
import type { HomeRecentUsagePayload } from "@/bridge/tauriClient";
import { LOCAL_DATA_CLEARED_EVENT } from "@/config/constants";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
import { HOME_PAGE_CONFIG } from "@/pages/home/config/home.config";
import { isTauri } from "@tauri-apps/api/core";
import { tauriClient } from "@/bridge/tauriClient";
import {
  HOME_CHANGELOG_MOCK,
  HOME_FEATURED_TOOLS_MOCK,
  HOME_MEMBERSHIP_BULLETS_MOCK,
  HOME_RECENT_ITEMS_MOCK,
  HOME_SEARCH_TOOL_ENTRIES_MOCK,
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
  cardType: "tool" | "placeholder";
  iconUrl: string;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  actionCode?: string;
  placeholderMessageKey?: string;
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
  dateKey: string;
  summaryKey: string;
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
      iconUrl: HOME_ASSETS[item.iconKey],
      iconBackground: meta.iconBackground,
      titleKey: item.titleKey,
      fileName: item.fileName,
      relativeTimeKey: item.relativeTimeKey,
      isEmpty: false,
      actionCode: KNOWN_HOME_TOOL_KEYS.has(key) ? key : undefined
    });
    if (out.length >= 4) break;
  }
  return out;
}

/** 设计稿中的 4 个主推工具 key，未来新增/下线只需调整此集合。 */
const KNOWN_HOME_TOOL_KEYS = new Set<string>([
  "image-compress",
  "video-to-gif",
  "image-upscale",
  "image-watermark"
]);

/** 兼容旧版 SQLite `tool_key` 与历史数据。 */
function normalizeHomeToolKey(toolKey: string): string {
  if (toolKey === "video-convert") return "video-to-gif";
  if (toolKey === "screen-record") return "image-upscale";
  return toolKey;
}

function accentForToolKey(toolKey: string): string {
  if (toolKey === "video-to-gif") return "linear-gradient(135deg, #a37cff 0%, #7c4dff 100%)";
  if (toolKey === "image-upscale") return "linear-gradient(135deg, #2ec591 0%, #19a374 100%)";
  if (toolKey === "image-watermark") return "linear-gradient(135deg, #ff8a48 0%, #f76b1c 100%)";
  return "linear-gradient(135deg, #4286ff 0%, #2d6ff5 100%)";
}

function resolveRecentItemMeta(toolKey: string): { titleKey: string; iconUrl: string; iconBackground: string } {
  const key = normalizeHomeToolKey(toolKey);
  const iconBackground = accentForToolKey(key);
  if (!KNOWN_HOME_TOOL_KEYS.has(key)) {
    return {
      titleKey: "pages.home.tools.removedTool.shortTitle",
      iconUrl: HOME_ASSETS.pubIconImageCompress,
      iconBackground: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)"
    };
  }
  if (key === "video-to-gif") {
    return {
      titleKey: "pages.home.tools.videoToGif.shortTitle",
      iconUrl: HOME_ASSETS.pubIconVideoConvert,
      iconBackground
    };
  }
  if (key === "image-upscale") {
    return {
      titleKey: "pages.home.tools.imageUpscale.shortTitle",
      iconUrl: HOME_ASSETS.pubIconScreenRecord,
      iconBackground
    };
  }
  if (key === "image-watermark") {
    return {
      titleKey: "pages.home.tools.imageWatermark.shortTitle",
      iconUrl: HOME_ASSETS.pubIconImageWatermark,
      iconBackground
    };
  }
  return {
    titleKey: "pages.home.tools.imageCompress.shortTitle",
    iconUrl: HOME_ASSETS.pubIconImageCompress,
    iconBackground
  };
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
  const recentItems = ref<HomeRecentItemViewModel[]>(mapMockRecentToViewModels());

  const greetingTitleKey = computed(() => greetingTitleKeyFromHour());

  const topBar = computed(() => ({
    ...HOME_PAGE_CONFIG.topBar,
    logoUrl: HOME_ASSETS.pubAppLogo,
    crownIconUrl: HOME_ASSETS.pubCrown
  }));

  const featuredTools = computed<HomeFeaturedToolCardViewModel[]>(() =>
    HOME_FEATURED_TOOLS_MOCK.map((item) => ({
      id: item.id,
      cardType: item.cardType,
      iconUrl: HOME_ASSETS[item.iconKey],
      titleKey: item.titleKey,
      descriptionKey: item.descriptionKey,
      gradient: item.gradient,
      actionCode: item.actionCode,
      placeholderMessageKey: item.placeholderMessageKey
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

  const changelogEntries = computed<HomeChangelogEntryViewModel[]>(() => HOME_CHANGELOG_MOCK);

  const searchToolEntries = computed(() => HOME_SEARCH_TOOL_ENTRIES_MOCK);

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
            actionCode: KNOWN_HOME_TOOL_KEYS.has(normalized) ? normalized : undefined
          };
        });
      }
    } catch {
      recentItems.value = [];
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
    globalThis.addEventListener(LOCAL_DATA_CLEARED_EVENT, onLocalDataCleared);
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
