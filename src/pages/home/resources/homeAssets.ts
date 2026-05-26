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
 * 将 `public/resources` 根目录下的静态文件名解析为可加载 URL（兼容 Vite `base`）。
 * 用于跨页面共享的全局资源（例如桌面应用主 logo）。
 */
function rootPublicResourceUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return `${withSlash}resources/${fileName}`;
}

/**
 * 将 `public/resources/logo/` 下的工具图标文件名解析为可加载 URL（兼容 Vite `base`）。
 *
 * 该目录是各工具图标的单一来源，文件命名与 `tools.registry.ts` 的工具 `key`/`actionCode`
 * 直接对应（详见下方 HOME_ASSETS 中每项注释），新增工具时优先把切图放入该目录。
 */
function logoPublicResourceUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return `${withSlash}resources/logo/${fileName}`;
}

/**
 * 首页静态资源索引，统一资产入口，便于后续 CDN 切换。
 *
 * 设计稿配套图片均位于 `public/resources/home/`，新增的 `Image-4_xx.png` 命名沿用 UI 切图。
 * 工具图标则统一放在 `public/resources/logo/`，文件名按 camelCase 直接表达工具语义
 * （与 `tools.registry.ts` 的 `key` 一一对应；当前文件名沿用切图原始命名，如 `imageCampress.png`）。
 * 小型 UI 图标（search/settings/check/heart/window-ctrl 等）采用内联 SVG，便于换色与适配。
 */
export const HOME_ASSETS: Record<HomeAssetKey, string> = {
  /** 桌面应用主 logo（顶栏品牌 / 关于卡片共用，位于 public/resources/logo.png） */
  pubAppLogo: rootPublicResourceUrl("logo.png"),
  /** 顶栏「开通会员」按钮前的皇冠小图标 */
  pubCrown: homePublicResourceUrl("Image-4_06.png"),
  /** Greeting 区右侧 3D 工具箱插画 */
  pubHeroToolbox: homePublicResourceUrl("Image-4_11.png"),
  /** 侧栏「本地处理，安全高效」卡片右上角的盾牌装饰 */
  pubShield: homePublicResourceUrl("Image-4_14.png"),

  /** 工具图标：图片压缩（image-compress；文件沿用切图原始拼写 imageCampress） */
  pubToolImageCompress: logoPublicResourceUrl("imageCampress.png"),
  /** 工具图标：GIF 压缩（gif-compress） */
  pubToolGifCompress: logoPublicResourceUrl("gifCompress.png"),
  /** 工具图标：视频转 GIF（video-to-gif） */
  pubToolVideoToGif: logoPublicResourceUrl("videoToGif.png"),
  /** 工具图标：图片高清放大（image-upscale；文件名 imageScale） */
  pubToolImageUpscale: logoPublicResourceUrl("imageScale.png"),
  /** 工具图标：图片加水印（image-watermark；文件名 imageAddWaterMarker） */
  pubToolImageWatermark: logoPublicResourceUrl("imageAddWaterMarker.png"),
  /** 工具图标：图片去水印（image-watermark-removal） */
  pubToolImageWatermarkRemoval: logoPublicResourceUrl("imageRemoveWaterMarker.png"),
  /** 工具图标：视频去水印（video-watermark-removal） */
  pubToolVideoWatermarkRemoval: logoPublicResourceUrl("videoRemoveWaterMarker.png"),

  /** 底部「全本地处理，安全高效」5 个特性图标 */
  pubBottomLocal: homePublicResourceUrl("Image-4_44.png"),
  pubBottomPrivacy: homePublicResourceUrl("Image-4_46.png"),
  pubBottomOffline: homePublicResourceUrl("Image-4_48.png"),
  pubBottomSpeed: homePublicResourceUrl("Image-4_50.png"),
  pubBottomUpdates: homePublicResourceUrl("Image-4_52.png"),

  /** Greeting 标题旁的挥手 emoji 图（保证跨平台显示一致） */
  pubGreetingWave: homePublicResourceUrl("Image-4_26.png")
};
