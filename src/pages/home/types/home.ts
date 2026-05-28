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
  dateKey?: string;
  summaryKey?: string;
  dateText?: string;
  summaryText?: string;
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
 *
 * 与设计稿配套切图一一对应。小型 UI 图标改为内联 SVG，已不在此处登记。
 * 工具图标键命名遵循 `pubTool<ToolKeyPascalCase>`，与 `tools.registry.ts` 中的 `key` 一一对应，
 * 资源文件位于 `public/resources/logo/` 下（文件名规则见 `homeAssets.ts` 注释）。
 */
export type HomeAssetKey =
  | "pubAppLogo"
  | "pubCrown"
  | "pubHeroToolbox"
  | "pubShield"
  | "pubToolImageCompress"
  | "pubToolGifCompress"
  | "pubToolVideoToGif"
  | "pubToolImageUpscale"
  | "pubToolImageWatermark"
  | "pubToolImageWatermarkRemoval"
  | "pubToolVideoWatermarkRemoval"
  | "pubBottomLocal"
  | "pubBottomPrivacy"
  | "pubBottomOffline"
  | "pubBottomSpeed"
  | "pubBottomUpdates"
  | "pubGreetingWave";
