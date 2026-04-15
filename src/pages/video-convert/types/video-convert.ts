export type VideoConvertAssetKey =
  | "logo"
  | "search"
  | "avatar"
  | "settings"
  | "upload"
  | "qualityHigh"
  | "qualityStandard"
  | "qualitySmall"
  | "radioActive"
  | "progressIcon"
  | "tip"
  | "time"
  | "footerFormat"
  | "footerAdvanced"
  | "history1"
  | "history2"
  | "history3";

export interface VideoFormatOption {
  id: string;
  title: string;
  descriptionKey: string;
  featured?: boolean;
}

export interface QuickPresetOption {
  id: string;
  iconKey: VideoConvertAssetKey;
  titleKey: string;
  descriptionKey: string;
}

export interface ConvertHistoryItem {
  id: string;
  previewKey: VideoConvertAssetKey;
  fileName: string;
  transformText: string;
  relativeTimeKey: string;
}
