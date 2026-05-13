import { ROUTE_PATHS } from "@/config/constants";

/**
 * 将首页工具 actionCode 映射到 Vue Router 路径；未实现功能返回 undefined。
 */
export function resolveHomeToolRoute(actionCode: string): string | undefined {
  if (actionCode === "image-compress") return ROUTE_PATHS.imageCompress;
  if (actionCode === "video-to-gif") return ROUTE_PATHS.videoToGif;
  if (actionCode === "image-upscale") return ROUTE_PATHS.imageUpscale;
  if (actionCode === "image-watermark") return ROUTE_PATHS.imageWatermark;
  if (actionCode === "image-watermark-removal") return ROUTE_PATHS.imageWatermarkRemoval;
  if (actionCode === "video-watermark-removal") return ROUTE_PATHS.videoWatermarkRemoval;
  if (actionCode === "gif-compress") return ROUTE_PATHS.gifCompress;
  return undefined;
}
