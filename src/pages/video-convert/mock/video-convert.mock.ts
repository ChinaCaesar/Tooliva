import type { ConvertHistoryItem, QuickPresetOption, VideoFormatOption } from "@/pages/video-convert/types/video-convert";

export const VIDEO_FORMAT_OPTIONS_MOCK: VideoFormatOption[] = [
  { id: "mp4", title: "MP4", descriptionKey: "pages.videoConvert.outputFormat.mp4", featured: true },
  { id: "avi", title: "AVI", descriptionKey: "pages.videoConvert.outputFormat.avi" },
  { id: "mov", title: "MOV", descriptionKey: "pages.videoConvert.outputFormat.mov" },
  { id: "mkv", title: "MKV", descriptionKey: "pages.videoConvert.outputFormat.mkv" },
  { id: "wmv", title: "WMV", descriptionKey: "pages.videoConvert.outputFormat.wmv" },
  { id: "flv", title: "FLV", descriptionKey: "pages.videoConvert.outputFormat.flv" }
];

export const VIDEO_QUICK_PRESETS_MOCK: QuickPresetOption[] = [
  { id: "high", iconKey: "qualityHigh", titleKey: "pages.videoConvert.quickPreset.high.title", descriptionKey: "pages.videoConvert.quickPreset.high.desc" },
  { id: "standard", iconKey: "qualityStandard", titleKey: "pages.videoConvert.quickPreset.standard.title", descriptionKey: "pages.videoConvert.quickPreset.standard.desc" },
  { id: "small", iconKey: "qualitySmall", titleKey: "pages.videoConvert.quickPreset.small.title", descriptionKey: "pages.videoConvert.quickPreset.small.desc" }
];

export const VIDEO_HISTORY_MOCK: ConvertHistoryItem[] = [
  { id: "h-1", previewKey: "history1", fileName: "presentation_video.mp4", transformText: "AVI → MP4", relativeTimeKey: "pages.home.relativeTime.twoMinutesAgo" },
  { id: "h-2", previewKey: "history2", fileName: "tutorial_final.mov", transformText: "MOV → MP4", relativeTimeKey: "pages.home.relativeTime.fifteenMinutesAgo" },
  { id: "h-3", previewKey: "history3", fileName: "demo_recording.avi", transformText: "AVI → MKV", relativeTimeKey: "pages.home.relativeTime.oneHourAgo" }
];
