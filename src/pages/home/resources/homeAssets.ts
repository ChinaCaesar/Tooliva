import logo from "../../../../resources/home/logo.svg";
import search from "../../../../resources/home/search.svg";
import avatar from "../../../../resources/home/avatar.svg";
import settings from "../../../../resources/home/settings.svg";
import toolImageCompress from "../../../../resources/home/tool-image-compress.svg";
import toolVideoConvert from "../../../../resources/home/tool-video-convert.svg";
import toolImageUpscale from "../../../../resources/home/tool-image-upscale.svg";
import recentImage from "../../../../resources/home/recent-image.svg";
import recentVideo from "../../../../resources/home/recent-video.svg";
import recentUpscale from "../../../../resources/home/recent-upscale.svg";
import quickHistory from "../../../../resources/home/quick-history.svg";
import quickFavorites from "../../../../resources/home/quick-favorites.svg";
import quickDocs from "../../../../resources/home/quick-docs.svg";
import footerFeedback from "../../../../resources/home/footer-feedback.svg";
import footerHelp from "../../../../resources/home/footer-help.svg";
import type { HomeAssetKey } from "@/pages/home/types/home";

/**
 * 首页静态资源索引，统一资产入口，便于后续 CDN 切换。
 */
export const HOME_ASSETS: Record<HomeAssetKey, string> = {
  logo,
  search,
  avatar,
  settings,
  toolImageCompress,
  toolVideoConvert,
  toolImageUpscale,
  recentImage,
  recentVideo,
  recentUpscale,
  quickHistory,
  quickFavorites,
  quickDocs,
  footerFeedback,
  footerHelp
};
