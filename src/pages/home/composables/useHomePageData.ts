import { computed } from "vue";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
import { HOME_PAGE_CONFIG } from "@/pages/home/config/home.config";
import {
  HOME_CORE_TOOLS_MOCK,
  HOME_FOOTER_LINKS_MOCK,
  HOME_MEMBERSHIP_MOCK,
  HOME_QUICK_ACTIONS_MOCK,
  HOME_RECENT_ITEMS_MOCK,
  HOME_STATS_MOCK,
  HOME_TOOL_PLACEHOLDERS_MOCK
} from "@/pages/home/mock/home.mock";

/**
 * 首页数据装配层，后续可切换为 API 数据源。
 */
export function useHomePageData() {
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

  const recentItems = computed(() =>
    HOME_RECENT_ITEMS_MOCK.map((item) => ({
      ...item,
      iconUrl: HOME_ASSETS[item.iconKey]
    }))
  );

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

  const stats = computed(() => HOME_STATS_MOCK);
  const membership = computed(() => HOME_MEMBERSHIP_MOCK);
  const pageConfig = computed(() => HOME_PAGE_CONFIG);

  return {
    topBar,
    coreTools,
    placeholders,
    recentItems,
    quickActions,
    footerLinks,
    stats,
    membership,
    pageConfig
  };
}
