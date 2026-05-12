import logo from "../../../../resources/home/logo.svg";
import search from "../../../../resources/home/search.svg";
import avatar from "../../../../resources/home/avatar.svg";
import settings from "../../../../resources/home/settings.svg";
import toolImageCompress from "../../../../resources/home/tool-image-compress.svg";
import toolImageUpscale from "../../../../resources/home/tool-image-upscale.svg";
import recentImage from "../../../../resources/home/recent-image.svg";
import recentUpscale from "../../../../resources/home/recent-upscale.svg";
import quickHistory from "../../../../resources/home/quick-history.svg";
import quickFavorites from "../../../../resources/home/quick-favorites.svg";
import quickDocs from "../../../../resources/home/quick-docs.svg";
import footerFeedback from "../../../../resources/home/footer-feedback.svg";
import footerHelp from "../../../../resources/home/footer-help.svg";
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
 */
export const HOME_ASSETS: Record<HomeAssetKey, string> = {
  logo,
  search,
  avatar,
  settings,
  toolImageCompress,
  toolImageUpscale,
  recentImage,
  recentUpscale,
  quickHistory,
  quickFavorites,
  quickDocs,
  footerFeedback,
  footerHelp,
  /** 首页仪表盘用 PNG（位于 `public/resources/home`） */
  pubAppLogo: homePublicResourceUrl("app_logo.png"),
  pubSearch: homePublicResourceUrl("search.png"),
  pubSettings: homePublicResourceUrl("settings.png"),
  pubCrown: homePublicResourceUrl("crown_top.png"),
  pubIconCompress: homePublicResourceUrl("icon_image_compress.png"),
  pubIconWatermark: homePublicResourceUrl("icon_image_watermark.png"),
  pubIconPlusMore: homePublicResourceUrl("icon_plus_more.png"),
  pubShield: homePublicResourceUrl("shield.png"),
  pubGreenCheck: homePublicResourceUrl("green_check.png"),
  pubOrangeCheck: homePublicResourceUrl("orange_check.png"),
  pubBottomLocal: homePublicResourceUrl("bottom_local.png"),
  pubBottomPrivacy: homePublicResourceUrl("bottom_privacy.png"),
  pubBottomOffline: homePublicResourceUrl("bottom_offline.png"),
  pubBottomSpeed: homePublicResourceUrl("bottom_speed.png"),
  pubBottomUpdates: homePublicResourceUrl("bottom_updates.png"),
  pubHeartFooter: homePublicResourceUrl("heart_footer.png"),
  pubMinimize: homePublicResourceUrl("minimize.png"),
  pubMaximize: homePublicResourceUrl("maximize.png"),
  pubClose: homePublicResourceUrl("close.png")
};
