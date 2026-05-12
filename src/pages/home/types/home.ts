/**
 * 首页工具卡片数据结构，支持静态配置与 API 返回。
 */
export interface HomeToolCardItem {
  id: string;
  iconKey: HomeAssetKey;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  actionCode: string;
}

/** 主推工具卡：可跳转工具或占位（更多等）。 */
export type HomeFeaturedToolCardType = "tool" | "placeholder";

export interface HomeFeaturedToolCardDef {
  id: string;
  cardType: HomeFeaturedToolCardType;
  iconKey: HomeAssetKey;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  /** 工具路由映射键，与 SQLite / 搜索一致 */
  actionCode?: string;
  /** 占位说明 i18n，用于弹窗或提示 */
  placeholderMessageKey?: string;
}

/** 底部价值卖点横条单项。 */
export interface HomeValuePropDef {
  id: string;
  iconKey: HomeAssetKey;
  titleKey: string;
  descriptionKey: string;
}

/** 侧栏列表项（安全/会员权益等）。 */
export interface HomeSidebarBulletDef {
  id: string;
  labelKey: string;
  checkStyle: "green" | "orange";
}

/** 更新日志一条。 */
export interface HomeChangelogEntryDef {
  id: string;
  version: string;
  dateKey: string;
  summaryKey: string;
}

/**
 * 最近使用列表项，预留可追溯任务能力。
 */
export interface HomeRecentItem {
  id: string;
  iconKey: HomeAssetKey;
  titleKey: string;
  fileName: string;
  relativeTimeKey: string;
  taskId?: string;
  /** 用于图标底色，与主推工具 actionCode 一致 */
  toolKey?: string;
}

/**
 * 快捷操作项，支持统计数字与后续权限控制。
 */
export interface HomeQuickActionItem {
  id: string;
  iconKey: HomeAssetKey;
  labelKey: string;
  count: number;
  route: string;
  permissionCode?: string;
}

/**
 * 统计模块单条配置，支持进度条展示。
 */
export interface HomeStatItem {
  id: string;
  labelKey: string;
  value: string;
  progress: number;
  gradient: string;
}

/**
 * 首页页脚链接配置。
 */
export interface HomeFooterLinkItem {
  id: string;
  iconKey: HomeAssetKey;
  labelKey: string;
  route: string;
}

/**
 * 会员信息配置。
 */
export interface HomeMembershipInfo {
  levelLabelKey: string;
  levelValueKey: string;
  expiryLabelKey: string;
  expiryDate: string;
  ctaKey: string;
}

/**
 * 首页资源键，统一由资源索引文件提供真实地址。
 */
export type HomeAssetKey =
  | "logo"
  | "search"
  | "avatar"
  | "settings"
  | "toolImageCompress"
  | "toolImageUpscale"
  | "recentImage"
  | "recentUpscale"
  | "quickHistory"
  | "quickFavorites"
  | "quickDocs"
  | "footerFeedback"
  | "footerHelp"
  | "pubAppLogo"
  | "pubSearch"
  | "pubSettings"
  | "pubCrown"
  | "pubIconCompress"
  | "pubIconWatermark"
  | "pubIconPlusMore"
  | "pubShield"
  | "pubGreenCheck"
  | "pubOrangeCheck"
  | "pubBottomLocal"
  | "pubBottomPrivacy"
  | "pubBottomOffline"
  | "pubBottomSpeed"
  | "pubBottomUpdates"
  | "pubHeartFooter"
  | "pubMinimize"
  | "pubMaximize"
  | "pubClose";
