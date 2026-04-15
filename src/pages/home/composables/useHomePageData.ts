import { computed, onMounted, ref } from "vue";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
import { HOME_PAGE_CONFIG } from "@/pages/home/config/home.config";
import { isTauri } from "@tauri-apps/api/core";
import { tauriClient } from "@/bridge/tauriClient";
import { ROUTE_PATHS } from "@/config/constants";
import {
  HOME_CORE_TOOLS_MOCK,
  HOME_FOOTER_LINKS_MOCK,
  HOME_QUICK_ACTIONS_MOCK,
  HOME_RECENT_ITEMS_MOCK,
  HOME_TOOL_PLACEHOLDERS_MOCK
} from "@/pages/home/mock/home.mock";

interface HomeStatViewModel {
  id: string;
  labelKey: string;
  value: string;
  highlight: "primary" | "secondary" | "success" | "warning";
}

interface HomeRecentItemViewModel {
  id: string;
  iconUrl: string;
  titleKey: string;
  fileName: string;
  relativeTimeKey: string;
  isEmpty: boolean;
}

interface HomeFrequentToolViewModel {
  id: string;
  labelKey: string;
  usageCount: number;
  route: string;
  actionCode: string;
  isEmpty: boolean;
}

/**
 * 统一构造最近使用空态占位，保证无数据时列表视觉稳定。
 */
function createEmptyRecentRows(): HomeRecentItemViewModel[] {
  return Array.from({ length: 3 }, (_, index) => ({
    id: `empty-${index + 1}`,
    iconUrl: HOME_ASSETS.recentVideo,
    titleKey: "pages.home.recent.emptyTitle",
    fileName: "—",
    relativeTimeKey: "pages.home.recent.emptyTime",
    isEmpty: true
  }));
}

function resolveRecentItemMeta(toolKey: string): { titleKey: string; iconUrl: string } {
  if (toolKey === "video-convert") {
    return {
      titleKey: "pages.home.tools.videoConvert.shortTitle",
      iconUrl: HOME_ASSETS.recentVideo
    };
  }
  if (toolKey === "image-upscale") {
    return {
      titleKey: "pages.home.tools.imageUpscale.shortTitle",
      iconUrl: HOME_ASSETS.recentUpscale
    };
  }
  return {
    titleKey: "pages.home.tools.imageCompress.title",
    iconUrl: HOME_ASSETS.recentImage
  };
}

/**
 * 将工具 key 映射到多语言标题 key，避免在组件层写分支。
 */
function resolveToolLabelKey(toolKey: string): string {
  if (toolKey === "video-convert") return "pages.home.tools.videoConvert.shortTitle";
  if (toolKey === "image-upscale") return "pages.home.tools.imageUpscale.shortTitle";
  return "pages.home.tools.imageCompress.title";
}

/**
 * 把工具标识映射为前端路由，保证跳转路径集中维护。
 */
function resolveToolRoute(toolKey: string): string {
  if (toolKey === "video-convert") return ROUTE_PATHS.videoConvert;
  if (toolKey === "image-upscale") return ROUTE_PATHS.imageUpscale;
  if (toolKey === "image-compress") return ROUTE_PATHS.imageCompress;
  return ROUTE_PATHS.home;
}

/**
 * 把时间戳转成 i18n 相对时间键，减少首页重复计算开销。
 */
function mapRelativeTimeKey(usedAtTs: number): string {
  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - usedAtTs);
  if (diffSeconds < 300) return "pages.home.recent.justNow";
  if (diffSeconds < 3600) return "pages.home.relativeTime.fifteenMinutesAgo";
  return "pages.home.relativeTime.oneHourAgo";
}

/**
 * 生成高频工具空态，保持右侧模块高度与布局稳定。
 */
function createEmptyFrequentTools(): HomeFrequentToolViewModel[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `freq-empty-${index + 1}`,
    labelKey: "pages.home.frequent.emptyTool",
    usageCount: 0,
    route: ROUTE_PATHS.tools,
    actionCode: "",
    isEmpty: true
  }));
}

/**
 * 首页数据装配层，后续可切换为 API 数据源。
 */
export function useHomePageData() {
  const stats = ref<HomeStatViewModel[]>([
    {
      id: "stats-total-usage",
      labelKey: "pages.home.stats.totalUsageCount",
      value: "0",
      highlight: "primary"
    },
    {
      id: "stats-today-usage",
      labelKey: "pages.home.stats.todayUsageCount",
      value: "0",
      highlight: "secondary"
    },
    {
      id: "stats-total-saved",
      labelKey: "pages.home.stats.totalSavedMinutes",
      value: "0 min",
      highlight: "success"
    },
    {
      id: "stats-today-saved",
      labelKey: "pages.home.stats.todaySavedMinutes",
      value: "0 min",
      highlight: "warning"
    }
  ]);

  const recentItems = ref<HomeRecentItemViewModel[]>(
    HOME_RECENT_ITEMS_MOCK.slice(0, 3).map((item) => ({
      id: item.id,
      iconUrl: HOME_ASSETS[item.iconKey],
      titleKey: item.titleKey,
      fileName: item.fileName,
      relativeTimeKey: item.relativeTimeKey,
      isEmpty: false
    }))
  );
  const frequentTools = ref<HomeFrequentToolViewModel[]>(createEmptyFrequentTools());

  const topBar = computed(() => ({
    ...HOME_PAGE_CONFIG.topBar,
    logoUrl: HOME_ASSETS.logo,
    searchIconUrl: HOME_ASSETS.search,
    avatarUrl: HOME_ASSETS.avatar,
    settingsIconUrl: HOME_ASSETS.settings
  }));

  const coreTools = computed(() =>
    HOME_CORE_TOOLS_MOCK.map((item) => ({
      ...item,
      iconUrl: HOME_ASSETS[item.iconKey]
    }))
  );

  const placeholders = computed(() => HOME_TOOL_PLACEHOLDERS_MOCK);

  const quickActions = computed(() =>
    HOME_QUICK_ACTIONS_MOCK.map((item) => ({
      ...item,
      iconUrl: HOME_ASSETS[item.iconKey]
    }))
  );

  const footerLinks = computed(() =>
    HOME_FOOTER_LINKS_MOCK.map((item) => ({
      ...item,
      iconUrl: HOME_ASSETS[item.iconKey]
    }))
  );

  const pageConfig = computed(() => HOME_PAGE_CONFIG);

  /**
   * 从 SQLite 读取首页统计与最近使用数据。
   */
  async function hydrateDashboardFromSqlite(): Promise<void> {
    if (!isTauri()) {
      return;
    }
    try {
      const dashboard = await tauriClient.getHomeDashboard();
      stats.value = [
        {
          id: "stats-total-usage",
          labelKey: "pages.home.stats.totalUsageCount",
          value: String(dashboard.stats.totalUsageCount),
          highlight: "primary"
        },
        {
          id: "stats-today-usage",
          labelKey: "pages.home.stats.todayUsageCount",
          value: String(dashboard.stats.todayUsageCount),
          highlight: "secondary"
        },
        {
          id: "stats-total-saved",
          labelKey: "pages.home.stats.totalSavedMinutes",
          value: `${dashboard.stats.totalSavedMinutes} min`,
          highlight: "success"
        },
        {
          id: "stats-today-saved",
          labelKey: "pages.home.stats.todaySavedMinutes",
          value: `${dashboard.stats.todaySavedMinutes} min`,
          highlight: "warning"
        }
      ];

      if (dashboard.recentItems.length === 0) {
        recentItems.value = createEmptyRecentRows();
      } else {
        recentItems.value = dashboard.recentItems.slice(0, 3).map((item) => {
          const meta = resolveRecentItemMeta(item.toolKey);
          return {
            id: `recent-${item.id}`,
            iconUrl: meta.iconUrl,
            titleKey: meta.titleKey,
            fileName: item.fileName,
            relativeTimeKey: mapRelativeTimeKey(item.usedAtTs),
            isEmpty: false
          };
        });
      }

      if (dashboard.topTools.length === 0) {
        frequentTools.value = createEmptyFrequentTools();
      } else {
        frequentTools.value = dashboard.topTools.slice(0, 5).map((item, index) => ({
          id: `freq-${index + 1}-${item.toolKey}`,
          labelKey: resolveToolLabelKey(item.toolKey),
          usageCount: item.usageCount,
          route: resolveToolRoute(item.toolKey),
          actionCode: item.toolKey,
          isEmpty: false
        }));
      }
    } catch {
      recentItems.value = createEmptyRecentRows();
      frequentTools.value = createEmptyFrequentTools();
    }
  }

  onMounted(() => {
    void hydrateDashboardFromSqlite();
  });

  return {
    topBar,
    coreTools,
    placeholders,
    recentItems,
    quickActions,
    footerLinks,
    stats,
    frequentTools,
    pageConfig
  };
}
