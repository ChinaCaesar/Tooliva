import type { HomeAssetKey } from "@/pages/home/types/home";

/**
 * 将 `public/resources/home` 下的静态文件名解析为可加载 URL（兼容 Vite `base`）。
 */
export function homePublicResourceUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return `${withSlash}resources/home/${fileName}`;
}

/**
 * 首页静态资源索引，统一资产入口，便于后续 CDN 切换。
 *
 * 设计稿配套图片均位于 `public/resources/home/`，新增的 `Image-4_xx.png` 命名沿用 UI 切图。
 * 小型 UI 图标（search/settings/check/heart/window-ctrl 等）采用内联 SVG，便于换色与适配。
 */
export const HOME_ASSETS: Record<HomeAssetKey, string> = {
  /** 顶栏品牌 logo（蓝色工具箱） */
  pubAppLogo: homePublicResourceUrl("app_logo.png"),
  /** 顶栏「开通会员」按钮前的皇冠小图标 */
  pubCrown: homePublicResourceUrl("Image-4_06.png"),
  /** Greeting 区右侧 3D 工具箱插画 */
  pubHeroToolbox: homePublicResourceUrl("Image-4_11.png"),
  /** 侧栏「本地处理，安全高效」卡片右上角的盾牌装饰 */
  pubShield: homePublicResourceUrl("Image-4_14.png"),

  /** 主推工具卡 / 最近使用：图片压缩（蓝） */
  pubIconImageCompress: homePublicResourceUrl("Image-4_35.png"),
  /** 主推工具卡 / 最近使用：视频格式转换（紫） */
  pubIconVideoConvert: homePublicResourceUrl("icon_video_convert.png"),
  /** 主推工具卡 / 最近使用：录屏工具（绿） */
  pubIconScreenRecord: homePublicResourceUrl("Image-4_21.png"),
  /** 主推工具卡 / 最近使用：图片加水印（橙） */
  pubIconImageWatermark: homePublicResourceUrl("Image-4_23.png"),

  /** 底部「全本地处理，安全高效」5 个特性图标 */
  pubBottomLocal: homePublicResourceUrl("Image-4_44.png"),
  pubBottomPrivacy: homePublicResourceUrl("Image-4_46.png"),
  pubBottomOffline: homePublicResourceUrl("Image-4_48.png"),
  pubBottomSpeed: homePublicResourceUrl("Image-4_50.png"),
  pubBottomUpdates: homePublicResourceUrl("Image-4_52.png"),

  /** Greeting 标题旁的挥手 emoji 图（保证跨平台显示一致） */
  pubGreetingWave: homePublicResourceUrl("Image-4_26.png")
};
