import { resolveHomeToolRoute } from "@/pages/home/config/homeToolRoutes";
import type { HomeAssetKey } from "@/pages/home/types/home";

/**
 * 应用内工具目录项：单一数据源，供首页、侧栏、搜索与最近使用元数据解析。
 */
export interface AppToolDef {
  /** 业务主键，与 SQLite `tool_key` / 埋点一致 */
  key: string;
  iconKey: HomeAssetKey;
  titleKey: string;
  shortTitleKey: string;
  descriptionKey: string;
  gradient: string;
  /** 与 `resolveHomeToolRoute` 一致 */
  actionCode: string;
  /** 为真时参与首页主推横向区 */
  recommended: boolean; 
  /** 同场景内升序 */
  sortOrder: number;
}

const TOOLS_REGISTRY_RAW: AppToolDef[] = [
  {
    key: "image-compress",
    iconKey: "pubIconImageCompress",
    titleKey: "pages.home.tools.imageCompress.title",
    shortTitleKey: "pages.home.tools.imageCompress.shortTitle",
    descriptionKey: "pages.home.tools.imageCompress.description",
    gradient: "linear-gradient(135deg, #4286ff 0%, #2d6ff5 100%)",
    actionCode: "image-compress",
    recommended: true,
    sortOrder: 10
  },
  {
    key: "gif-compress",
    iconKey: "pubIconVideoConvert",
    titleKey: "pages.home.tools.gifCompress.title",
    shortTitleKey: "pages.home.tools.gifCompress.shortTitle",
    descriptionKey: "pages.home.tools.gifCompress.description",
    gradient: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
    actionCode: "gif-compress",
    recommended: true,
    sortOrder: 15
  },
  {
    key: "video-to-gif",
    iconKey: "pubIconVideoConvert",
    titleKey: "pages.home.tools.videoToGif.title",
    shortTitleKey: "pages.home.tools.videoToGif.shortTitle",
    descriptionKey: "pages.home.tools.videoToGif.description",
    gradient: "linear-gradient(135deg, #a37cff 0%, #7c4dff 100%)",
    actionCode: "video-to-gif",
    recommended: true,
    sortOrder: 21
  },
  {
    key: "image-upscale",
    iconKey: "pubIconScreenRecord",
    titleKey: "pages.home.tools.imageUpscale.title",
    shortTitleKey: "pages.home.tools.imageUpscale.shortTitle",
    descriptionKey: "pages.home.tools.imageUpscale.description",
    gradient: "linear-gradient(135deg, #2ec591 0%, #19a374 100%)",
    actionCode: "image-upscale",
    recommended: true,
    sortOrder: 30
  },
  {
    key: "image-watermark",
    iconKey: "pubIconImageWatermark",
    titleKey: "pages.home.tools.imageWatermark.title",
    shortTitleKey: "pages.home.tools.imageWatermark.shortTitle",
    descriptionKey: "pages.home.tools.imageWatermark.description",
    gradient: "linear-gradient(135deg, #ff8a48 0%, #f76b1c 100%)",
    actionCode: "image-watermark",
    recommended: true,
    sortOrder: 40
  },
  {
    key: "image-watermark-removal",
    iconKey: "pubIconImageWatermark",
    titleKey: "pages.home.tools.imageWatermarkRemoval.title",
    shortTitleKey: "pages.home.tools.imageWatermarkRemoval.shortTitle",
    descriptionKey: "pages.home.tools.imageWatermarkRemoval.description",
    gradient: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
    actionCode: "image-watermark-removal",
    recommended: false,
    sortOrder: 50
  }
];

const keys = TOOLS_REGISTRY_RAW.map((t) => t.key);
if (new Set(keys).size !== keys.length) {
  throw new Error("tools.registry: duplicate tool key");
}

export const TOOLS_REGISTRY: readonly AppToolDef[] = TOOLS_REGISTRY_RAW;

export function sortToolsByOrder(list: readonly AppToolDef[]): AppToolDef[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
}

/** 已发布且可解析路由的工具（侧栏、搜索） */
export function getAllToolsSorted(): AppToolDef[] {
  return sortToolsByOrder(TOOLS_REGISTRY).filter((t) => resolveHomeToolRoute(t.actionCode) != null);
}

/** 首页主推横向区 */
export function getHomeFeaturedToolsSorted(): AppToolDef[] {
  return getAllToolsSorted().filter((t) => t.recommended);
}

export function getSearchToolEntriesSorted(): { id: string; titleKey: string; actionCode: string }[] {
  return getAllToolsSorted().map((t) => ({ id: t.key, titleKey: t.titleKey, actionCode: t.actionCode }));
}

/** 按 actionCode（经 normalize）解析注册项，供最近使用等待 */
export function getToolByActionCode(actionCode: string): AppToolDef | undefined {
  const normalized = normalizeRegistryActionCode(actionCode);
  return getAllToolsSorted().find((t) => normalizeRegistryActionCode(t.actionCode) === normalized);
}

/** 与 `useHomePageData` 中历史 `tool_key` 对齐 */
export function normalizeRegistryActionCode(actionCode: string): string {
  if (actionCode === "video-convert") return "video-to-gif";
  if (actionCode === "screen-record") return "image-upscale";
  return actionCode;
}
