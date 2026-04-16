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
  | "toolVideoConvert"
  | "toolImageUpscale"
  | "recentImage"
  | "recentVideo"
  | "recentUpscale"
  | "quickHistory"
  | "quickFavorites"
  | "quickDocs"
  | "footerFeedback"
  | "footerHelp";
