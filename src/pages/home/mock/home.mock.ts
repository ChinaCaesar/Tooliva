import { ROUTE_PATHS } from "@/config/constants";
import type {
  HomeChangelogEntryDef,
  HomeFeaturedToolCardDef,
  HomeFooterLinkItem,
  HomeMembershipInfo,
  HomeQuickActionItem,
  HomeRecentItem,
  HomeSidebarBulletDef,
  HomeStatItem,
  HomeToolCardItem,
  HomeValuePropDef
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

/** 横向主推工具卡（含占位），与顶栏搜索共用 actionCode 约定。 */
export const HOME_FEATURED_TOOLS_MOCK: HomeFeaturedToolCardDef[] = [
  {
    id: "feat-image-compress",
    cardType: "tool",
    iconKey: "pubIconCompress",
    titleKey: "pages.home.tools.imageCompress.title",
    descriptionKey: "pages.home.tools.imageCompress.description",
    gradient: "linear-gradient(135deg, #1e40af 15%, #3b82f6 85%)",
    actionCode: "image-compress"
  },
  {
    id: "feat-video-convert",
    cardType: "tool",
    iconKey: "pubIconVideo",
    titleKey: "pages.home.tools.videoConvert.title",
    descriptionKey: "pages.home.tools.videoConvert.description",
    gradient: "linear-gradient(135deg, #7c3aed 15%, #a855f7 85%)",
    actionCode: "video-convert"
  },
  {
    id: "feat-screen-record",
    cardType: "placeholder",
    iconKey: "pubIconScreenRecord",
    titleKey: "pages.home.tools.screenRecord.title",
    descriptionKey: "pages.home.tools.screenRecord.description",
    gradient: "linear-gradient(135deg, #059669 15%, #10b981 85%)",
    placeholderMessageKey: "pages.home.placeholders.screenRecord"
  },
  {
    id: "feat-image-watermark",
    cardType: "tool",
    iconKey: "pubIconWatermark",
    titleKey: "pages.home.tools.imageWatermark.title",
    descriptionKey: "pages.home.tools.imageWatermark.description",
    gradient: "linear-gradient(135deg, #ea580c 15%, #f97316 85%)",
    actionCode: "image-watermark"
  },
  {
    id: "feat-more",
    cardType: "placeholder",
    iconKey: "pubIconPlusMore",
    titleKey: "pages.home.tools.moreTools.exploreTitle",
    descriptionKey: "pages.home.tools.moreTools.exploreSubtitle",
    gradient: "transparent",
    placeholderMessageKey: "pages.home.placeholders.moreTools"
  }
];

export const HOME_VALUE_PROPS_MOCK: HomeValuePropDef[] = [
  {
    id: "vp-local",
    iconKey: "pubBottomLocal",
    titleKey: "pages.home.valueProps.local.title",
    descriptionKey: "pages.home.valueProps.local.description"
  },
  {
    id: "vp-privacy",
    iconKey: "pubBottomPrivacy",
    titleKey: "pages.home.valueProps.privacy.title",
    descriptionKey: "pages.home.valueProps.privacy.description"
  },
  {
    id: "vp-offline",
    iconKey: "pubBottomOffline",
    titleKey: "pages.home.valueProps.offline.title",
    descriptionKey: "pages.home.valueProps.offline.description"
  },
  {
    id: "vp-speed",
    iconKey: "pubBottomSpeed",
    titleKey: "pages.home.valueProps.speed.title",
    descriptionKey: "pages.home.valueProps.speed.description"
  },
  {
    id: "vp-updates",
    iconKey: "pubBottomUpdates",
    titleKey: "pages.home.valueProps.updates.title",
    descriptionKey: "pages.home.valueProps.updates.description"
  }
];

export const HOME_SECURITY_BULLETS_MOCK: HomeSidebarBulletDef[] = [
  { id: "sec-1", labelKey: "pages.home.sections.sidebar.security.points.local", checkStyle: "green" },
  { id: "sec-2", labelKey: "pages.home.sections.sidebar.security.points.files", checkStyle: "green" },
  { id: "sec-3", labelKey: "pages.home.sections.sidebar.security.points.offline", checkStyle: "green" },
  { id: "sec-4", labelKey: "pages.home.sections.sidebar.security.points.encryption", checkStyle: "green" }
];

export const HOME_MEMBERSHIP_BULLETS_MOCK: HomeSidebarBulletDef[] = [
  { id: "mem-1", labelKey: "pages.home.sections.sidebar.membership.points.priority", checkStyle: "orange" },
  { id: "mem-2", labelKey: "pages.home.sections.sidebar.membership.points.templates", checkStyle: "orange" },
  { id: "mem-3", labelKey: "pages.home.sections.sidebar.membership.points.batch", checkStyle: "orange" },
  { id: "mem-4", labelKey: "pages.home.sections.sidebar.membership.points.support", checkStyle: "orange" }
];

export const HOME_CHANGELOG_MOCK: HomeChangelogEntryDef[] = [
  {
    id: "cl-1",
    version: "v1.0.0",
    dateKey: "pages.home.sections.sidebar.changelog.v100.date",
    summaryKey: "pages.home.sections.sidebar.changelog.v100.summary"
  },
  {
    id: "cl-2",
    version: "v0.9.0",
    dateKey: "pages.home.sections.sidebar.changelog.v090.date",
    summaryKey: "pages.home.sections.sidebar.changelog.v090.summary"
  }
];

/**
 * 最近使用记录 mock。
 */
export const HOME_RECENT_ITEMS_MOCK: HomeRecentItem[] = [
  {
    id: "recent-1",
    iconKey: "pubIconCompress",
    titleKey: "pages.home.tools.imageCompress.title",
    fileName: "photo_2024.jpg",
    relativeTimeKey: "pages.home.recent.usedJustNow",
    taskId: "task-1001",
    toolKey: "image-compress"
  },
  {
    id: "recent-2",
    iconKey: "pubIconVideo",
    titleKey: "pages.home.tools.videoConvert.shortTitle",
    fileName: "video_demo.mp4",
    relativeTimeKey: "pages.home.relativeTime.oneHourAgo",
    taskId: "task-1002",
    toolKey: "video-convert"
  },
  {
    id: "recent-3",
    iconKey: "pubIconWatermark",
    titleKey: "pages.home.tools.imageWatermark.shortTitle",
    fileName: "landscape.png",
    relativeTimeKey: "pages.home.recent.usedYesterday",
    taskId: "task-1003",
    toolKey: "image-watermark"
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

/** 顶栏搜索候选（与路由工具集合一致，可含首页横向条未展示的工具）。 */
export const HOME_SEARCH_TOOL_ENTRIES_MOCK: { id: string; titleKey: string; actionCode: string }[] = [
  { id: "search-compress", titleKey: "pages.home.tools.imageCompress.title", actionCode: "image-compress" },
  { id: "search-video", titleKey: "pages.home.tools.videoConvert.title", actionCode: "video-convert" },
  { id: "search-upscale", titleKey: "pages.home.tools.imageUpscale.title", actionCode: "image-upscale" },
  { id: "search-watermark", titleKey: "pages.home.tools.imageWatermark.title", actionCode: "image-watermark" }
];
