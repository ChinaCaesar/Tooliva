import { computed } from "vue";
import { VIDEO_CONVERT_ASSETS } from "@/pages/video-convert/resources/videoConvertAssets";
import { VIDEO_CONVERT_PAGE_CONFIG } from "@/pages/video-convert/config/video-convert.config";
import {
  VIDEO_FORMAT_OPTIONS_MOCK,
  VIDEO_HISTORY_MOCK,
  VIDEO_QUICK_PRESETS_MOCK
} from "@/pages/video-convert/mock/video-convert.mock";

/**
 * 视频转换页数据装配层，后续可平滑替换为 API 数据源。
 */
export function useVideoConvertPageData() {
  const pageConfig = computed(() => VIDEO_CONVERT_PAGE_CONFIG);
  const assets = computed(() => VIDEO_CONVERT_ASSETS);
  const formatOptions = computed(() => VIDEO_FORMAT_OPTIONS_MOCK);
  const quickPresets = computed(() => VIDEO_QUICK_PRESETS_MOCK);
  const historyItems = computed(() => VIDEO_HISTORY_MOCK);

  return {
    pageConfig,
    assets,
    formatOptions,
    quickPresets,
    historyItems
  };
}
