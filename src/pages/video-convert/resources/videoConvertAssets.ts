import logo from "../../../../resources/video-convert/logo.svg";
import search from "../../../../resources/video-convert/search.svg";
import avatar from "../../../../resources/video-convert/avatar.svg";
import settings from "../../../../resources/video-convert/settings.svg";
import upload from "../../../../resources/video-convert/upload.svg";
import qualityHigh from "../../../../resources/video-convert/quality-high.svg";
import qualityStandard from "../../../../resources/video-convert/quality-standard.svg";
import qualitySmall from "../../../../resources/video-convert/quality-small.svg";
import radioActive from "../../../../resources/video-convert/radio-active.svg";
import progressIcon from "../../../../resources/video-convert/progress-icon.svg";
import tip from "../../../../resources/video-convert/tip.svg";
import time from "../../../../resources/video-convert/time.svg";
import footerFormat from "../../../../resources/video-convert/footer-format.svg";
import footerAdvanced from "../../../../resources/video-convert/footer-advanced.svg";
import history1 from "../../../../resources/video-convert/history-1.jpeg";
import history2 from "../../../../resources/video-convert/history-2.jpeg";
import history3 from "../../../../resources/video-convert/history-3.jpeg";
import type { VideoConvertAssetKey } from "@/pages/video-convert/types/video-convert";

/**
 * 视频转换页面资源索引，避免在组件中散落静态路径。
 */
export const VIDEO_CONVERT_ASSETS: Record<VideoConvertAssetKey, string> = {
  logo,
  search,
  avatar,
  settings,
  upload,
  qualityHigh,
  qualityStandard,
  qualitySmall,
  radioActive,
  progressIcon,
  tip,
  time,
  footerFormat,
  footerAdvanced,
  history1,
  history2,
  history3
};
