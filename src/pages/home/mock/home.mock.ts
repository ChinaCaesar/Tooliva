import { ROUTE_PATHS } from "@/config/constants";
import type {
  HomeFooterLinkItem,
  HomeMembershipInfo,
  HomeQuickActionItem,
  HomeRecentItem,
  HomeStatItem,
  HomeToolCardItem
} from "@/pages/home/types/home";

/**
 * 核心工具卡片 mock，后续可直接替换为接口返回。
 */
export const HOME_CORE_TOOLS_MOCK: HomeToolCardItem[] = [
  {
    id: "tool-image-compress",
    iconKey: "toolImageCompress",
    titleKey: "pages.home.tools.imageCompress.title",
    descriptionKey: "pages.home.tools.imageCompress.description",
    gradient: "linear-gradient(135deg, #1e40af 15%, #3b82f6 85%)",
    actionCode: "image-compress"
  },
  {
    id: "tool-video-convert",
    iconKey: "toolVideoConvert",
    titleKey: "pages.home.tools.videoConvert.title",
    descriptionKey: "pages.home.tools.videoConvert.description",
    gradient: "linear-gradient(135deg, #7c3aed 15%, #a855f7 85%)",
    actionCode: "video-convert"
  },
  {
    id: "tool-image-upscale",
    iconKey: "toolImageUpscale",
    titleKey: "pages.home.tools.imageUpscale.title",
    descriptionKey: "pages.home.tools.imageUpscale.description",
    gradient: "linear-gradient(135deg, #059669 15%, #10b981 85%)",
    actionCode: "image-upscale"
  },
  {
    id: "tool-image-watermark",
    iconKey: "toolImageCompress",
    titleKey: "pages.home.tools.imageWatermark.title",
    descriptionKey: "pages.home.tools.imageWatermark.description",
    gradient: "linear-gradient(135deg, #ea580c 15%, #f97316 85%)",
    actionCode: "image-watermark"
  }
];

/**
 * 最近使用记录 mock。
 */
export const HOME_RECENT_ITEMS_MOCK: HomeRecentItem[] = [
  {
    id: "recent-1",
    iconKey: "recentImage",
    titleKey: "pages.home.tools.imageCompress.title",
    fileName: "photo_2024.jpg",
    relativeTimeKey: "pages.home.relativeTime.twoMinutesAgo",
    taskId: "task-1001"
  },
  {
    id: "recent-2",
    iconKey: "recentVideo",
    titleKey: "pages.home.tools.videoConvert.shortTitle",
    fileName: "video_demo.mp4",
    relativeTimeKey: "pages.home.relativeTime.fifteenMinutesAgo",
    taskId: "task-1002"
  },
  {
    id: "recent-3",
    iconKey: "recentUpscale",
    titleKey: "pages.home.tools.imageUpscale.shortTitle",
    fileName: "landscape.png",
    relativeTimeKey: "pages.home.relativeTime.oneHourAgo",
    taskId: "task-1003"
  }
];

/**
 * 会员信息 mock。
 */
export const HOME_MEMBERSHIP_MOCK: HomeMembershipInfo = {
  levelLabelKey: "pages.home.membership.currentLevelLabel",
  levelValueKey: "pages.home.membership.currentLevelValue",
  expiryLabelKey: "pages.home.membership.expiryLabel",
  expiryDate: "2024-12-31",
  ctaKey: "pages.home.membership.renewButton"
};

/**
 * 使用统计 mock。
 */
export const HOME_STATS_MOCK: HomeStatItem[] = [
  {
    id: "stats-files",
    labelKey: "pages.home.stats.filesToday",
    value: "28",
    progress: 0.7,
    gradient: "linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)"
  },
  {
    id: "stats-storage",
    labelKey: "pages.home.stats.storage",
    value: "3.2GB/10GB",
    progress: 0.32,
    gradient: "linear-gradient(90deg, #10b981 0%, #059669 100%)"
  }
];

/**
 * 快捷入口 mock。
 */
export const HOME_QUICK_ACTIONS_MOCK: HomeQuickActionItem[] = [
  {
    id: "quick-history",
    iconKey: "quickHistory",
    labelKey: "pages.home.quickActions.history",
    count: 23,
    route: ROUTE_PATHS.tasks
  },
  {
    id: "quick-favorites",
    iconKey: "quickFavorites",
    labelKey: "pages.home.quickActions.favorites",
    count: 5,
    route: ROUTE_PATHS.favorites
  },
  {
    id: "quick-docs",
    iconKey: "quickDocs",
    labelKey: "pages.home.quickActions.documentManager",
    count: 12,
    route: ROUTE_PATHS.tools
  }
];

/**
 * 页脚链接 mock。
 */
export const HOME_FOOTER_LINKS_MOCK: HomeFooterLinkItem[] = [
  // 已按产品要求移除底部“意见反馈/帮助中心”入口。
];
