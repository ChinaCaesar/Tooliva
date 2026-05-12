import { computed, onMounted, ref } from "vue";
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
  isEmpty: boolean;
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
  checkIconUrl: string;
}

interface HomeChangelogEntryViewModel {
  id: string;
  version: string;
  dateKey: string;
  summaryKey: string;
}

function createEmptyRecentRows(): HomeRecentItemViewModel[] {
  const emptyBg = "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)";
  return Array.from({ length: 3 }, (_, index) => ({
    id: `empty-${index + 1}`,
    iconUrl: HOME_ASSETS.pubIconPlusMore,
    iconBackground: emptyBg,
    titleKey: "pages.home.recent.emptyTitle",
    fileName: "—",
    relativeTimeKey: "pages.home.recent.emptyTime",
    isEmpty: true,
    actionCode: undefined
  }));
}

function accentForToolKey(toolKey: string): string {
  if (toolKey === "video-convert") return "linear-gradient(135deg, #7c3aed 15%, #a855f7 85%)";
  if (toolKey === "image-watermark") return "linear-gradient(135deg, #ea580c 15%, #f97316 85%)";
  if (toolKey === "image-upscale") return "linear-gradient(135deg, #059669 15%, #10b981 85%)";
  return "linear-gradient(135deg, #1e40af 15%, #3b82f6 85%)";
}

function resolveRecentItemMeta(toolKey: string): { titleKey: string; iconUrl: string; iconBackground: string } {
  const iconBackground = accentForToolKey(toolKey);
  if (toolKey === "video-convert") {
    return {
      titleKey: "pages.home.tools.videoConvert.shortTitle",
      iconUrl: HOME_ASSETS.pubIconVideo,
      iconBackground
    };
  }
  if (toolKey === "image-upscale") {
    return {
      titleKey: "pages.home.tools.imageUpscale.shortTitle",
      iconUrl: HOME_ASSETS.toolImageUpscale,
      iconBackground
    };
  }
  if (toolKey === "image-watermark") {
    return {
      titleKey: "pages.home.tools.imageWatermark.shortTitle",
      iconUrl: HOME_ASSETS.pubIconWatermark,
      iconBackground
    };
  }
  return {
    titleKey: "pages.home.tools.imageCompress.title",
    iconUrl: HOME_ASSETS.pubIconCompress,
    iconBackground
  };
}

function mapRelativeTimeKey(usedAtTs: number): string {
  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - usedAtTs);
  if (diffSeconds < 300) return "pages.home.recent.usedJustNow";
  if (diffSeconds < 3600) return "pages.home.relativeTime.fifteenMinutesAgo";
  if (diffSeconds < 86400) return "pages.home.relativeTime.oneHourAgo";
  if (diffSeconds < 172800) return "pages.home.recent.usedYesterday";
  return "pages.home.relativeTime.oneHourAgo";
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
  const recentItems = ref<HomeRecentItemViewModel[]>(
    HOME_RECENT_ITEMS_MOCK.slice(0, 3).map((item) => {
      const key = item.toolKey ?? "image-compress";
      const meta = resolveRecentItemMeta(key);
      return {
        id: item.id,
        iconUrl: HOME_ASSETS[item.iconKey],
        iconBackground: meta.iconBackground,
        titleKey: item.titleKey,
        fileName: item.fileName,
        relativeTimeKey: item.relativeTimeKey,
        isEmpty: false,
        actionCode: key
      };
    })
  );

  const greetingTitleKey = computed(() => greetingTitleKeyFromHour());

  const topBar = computed(() => ({
    ...HOME_PAGE_CONFIG.topBar,
    logoUrl: HOME_ASSETS.pubAppLogo,
    searchIconUrl: HOME_ASSETS.pubSearch,
    settingsIconUrl: HOME_ASSETS.pubSettings,
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
      checkIconUrl: HOME_ASSETS.pubGreenCheck
    }))
  );

  const membershipBullets = computed<HomeSidebarBulletViewModel[]>(() =>
    HOME_MEMBERSHIP_BULLETS_MOCK.map((item) => ({
      id: item.id,
      labelKey: item.labelKey,
      checkIconUrl: HOME_ASSETS.pubOrangeCheck
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

      if (dashboard.recentItems.length === 0) {
        recentItems.value = createEmptyRecentRows();
      } else {
        recentItems.value = dashboard.recentItems.slice(0, 3).map((item) => {
          const meta = resolveRecentItemMeta(item.toolKey);
          return {
            id: `recent-${item.id}`,
            iconUrl: meta.iconUrl,
            iconBackground: meta.iconBackground,
            titleKey: meta.titleKey,
            fileName: item.fileName,
            relativeTimeKey: mapRelativeTimeKey(item.usedAtTs),
            isEmpty: false,
            actionCode: item.toolKey
          };
        });
      }
    } catch {
      recentItems.value = createEmptyRecentRows();
    }
  }

  onMounted(() => {
    void hydrateDashboardFromSqlite();
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
