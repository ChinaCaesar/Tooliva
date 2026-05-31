import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { UserSettings } from "@/types/settings";

export const IMAGE_COMPRESS_PROGRESS_EVENT = "image-compress-progress";
export const IMAGE_WATERMARK_PROGRESS_EVENT = "image-watermark-progress";
export const IMAGE_UPSCALE_PROGRESS_EVENT = "image-upscale-progress";
export const VIDEO_TO_GIF_PROGRESS_EVENT = "video-to-gif-progress";
export const AI_MODEL_PROGRESS_EVENT = "ai-model-progress";
export const AI_RUNTIME_PROGRESS_EVENT = "ai-runtime-progress";

export interface RecordToolUsagePayload {
  toolKey: string;
  fileName: string;
  /** 已废弃：后端不再持久化，可省略。 */
  savedSeconds?: number;
}

export interface HomeStatsPayload {
  totalUsageCount: number;
  todayUsageCount: number;
  totalSavedMinutes: number;
  todaySavedMinutes: number;
}

/** `getHomeDashboard().recentItems`：每项代表一个工具最近一次使用，`toolKey` 在数组内不重复，按时间从新到旧。 */
export interface HomeRecentUsagePayload {
  id: number;
  toolKey: string;
  fileName: string;
  usedAtTs: number;
}

export interface HomeDashboardPayload {
  /** 已废弃语义：恒为零，不再聚合本地使用统计。 */
  stats: HomeStatsPayload;
  recentItems: HomeRecentUsagePayload[];
  /** 已废弃：恒为空数组，不再返回高频工具。 */
  topTools: HomeTopToolPayload[];
}

export interface HomeTopToolPayload {
  toolKey: string;
  usageCount: number;
}

export interface ListImagesFromDirectoryPayload {
  directoryPath: string;
}

export interface ListImagesFromDirectoryResult {
  images: string[];
}

export interface ListVideosFromDirectoryPayload {
  directoryPath: string;
}

export interface ListVideosFromDirectoryResult {
  videos: string[];
}

export interface GetImagePreviewPayload {
  filePath: string;
}

export interface GetImagePreviewResult {
  dataUrl: string;
  mimeType: string;
}

export interface OpenDirectoryPayload {
  directoryPath: string;
}

export interface AiModelStatusPayload {
  modelId: string;
  displayName: string;
  downloaded: boolean;
  sizeBytes: number;
  expectedSizeBytes: number;
  modelPath: string;
  modelsRoot: string;
  runtimeReady: boolean;
  runtimeDevice: string | null;
  torchVersion: string | null;
}

export interface AiModelImportResultPayload {
  modelId: string;
  modelPath: string;
  sizeBytes: number;
}

export interface AiModelProgressPayload {
  modelId: string;
  stage: string;
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  message?: string;
}

export type AiRuntimeStatus =
  | "DISABLED"
  | "NOT_INSTALLED"
  | "CHECKING"
  | "ENV_NOT_SUPPORTED"
  | "READY_TO_INSTALL"
  | "DOWNLOADING"
  | "VERIFYING"
  | "INSTALLING"
  | "INSTALLED"
  | "UPDATE_AVAILABLE"
  | "FAILED";

export interface AiRuntimeEnvironmentPayload {
  allowed: boolean;
  osVersion: string;
  is64Bit: boolean;
  availableMemoryGb: number;
  availableDiskGb: number;
  cpuArch: string;
  avx: string;
  avx2: string;
  reasons: string[];
}

export interface AiRuntimeLocalStatusPayload {
  installed: boolean;
  available: boolean;
  currentVersion: string | null;
  installPath: string;
  currentPath: string;
  versionsPath: string;
  downloadsPath: string;
  manifestPath: string;
  missingReason: string | null;
  packageChannel: string | null;
}

export interface LocalAiRuntimePathsPayload {
  runtimeRoot: string;
  modelsRoot: string;
  currentRuntimePath: string;
  versionsPath: string;
  downloadsPath: string;
  manifestPath: string;
  lamaModelPath: string;
}

export interface AiRuntimeProgressPayload {
  stage: string;
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  bytesPerSecond: number;
  message?: string;
}

export interface RuntimeInstallResultPayload {
  version: string;
  installPath: string;
  currentPath: string;
  manifestPath: string;
}

export type ImageUpscaleQualityMode = "fast" | "standard" | "balanced" | "quality" | "high";
export type ImageUpscaleOutputFormat = "original" | "png" | "jpg" | "webp";
export type ImageUpscaleAdjustmentLevel = "off" | "low" | "medium" | "high";

export interface StartImageUpscalePayload {
  taskId: string;
  inputPath: string;
  scaleFactor: 2 | 3 | 4;
  outputDirectory?: string;
  outputMode?: "directory" | "overwrite";
  qualityMode?: ImageUpscaleQualityMode;
  backendPreference?: "auto" | "cpu" | "gpu" | "ai";
  outputFormat?: ImageUpscaleOutputFormat;
  denoiseLevel?: ImageUpscaleAdjustmentLevel;
  sharpenLevel?: ImageUpscaleAdjustmentLevel;
  preserveTransparentBackground?: boolean;
  maxOutputPixels?: number;
  maxMemoryMb?: number;
  tileSize?: number;
  tileOverlap?: number;
}

export interface StartImageUpscaleResult {
  taskId: string;
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: string;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  backendUsed: string;
}

export interface ImageUpscaleProgressPayload {
  taskId: string;
  progress: number;
  stage: string;
  backend?: string;
  message?: string;
}

export interface StartImageCompressPayload {
  taskId: string;
  inputPath: string;
  quality: number;
  outputDirectory?: string;
  outputMode?: "directory" | "overwrite";
  targetFormat?: "jpg" | "jpeg" | "png" | "webp";
  maxOutputPixels?: number;
  maxMemoryMb?: number;
  tileSize?: number;
  tileOverlap?: number;
}

export interface StartImageCompressResult {
  taskId: string;
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: string;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  backendUsed: string;
  inputBytes: number;
  outputBytes: number;
  compressionRatio: number;
}

export interface ImageCompressProgressPayload {
  taskId: string;
  progress: number;
  stage: string;
  backend: string;
  message?: string;
}

export type VideoGifSizePreset = "original" | "p720" | "p480" | "p360" | "custom";
export type VideoGifQualityPreset = "low" | "medium" | "high";

export interface VideoToGifCropRectPayload {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 与 Rust `VideoToGifOptions` / serde camelCase 对齐 */
export interface VideoToGifOptionsPayload {
  startTimeSec?: number | null;
  endTimeSec?: number | null;
  sizePreset: VideoGifSizePreset;
  customWidth?: number | null;
  customHeight?: number | null;
  fps: number;
  quality: VideoGifQualityPreset;
  loopPlayback: boolean;
  maxFrames?: number | null;
  playbackSpeed?: number | null;
  paletteStatsMode?: string | null;
  paletteMaxColors?: number | null;
  dither?: string | null;
  bayerScale?: number | null;
  crop?: VideoToGifCropRectPayload | null;
  /** 预留：输出体积上限（后端暂不强制） */
  outputSizeLimitBytes?: number | null;
}

export interface StartVideoToGifPayload {
  taskId: string;
  inputPath: string;
  outputDirectory?: string;
  options: VideoToGifOptionsPayload;
}

export interface StartVideoToGifResult {
  taskId: string;
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: string;
}

export interface VideoToGifProgressPayload {
  taskId: string;
  progress: number;
  stage: string;
  message?: string;
}

export type WatermarkMode = "text" | "image";
export type WatermarkPosition =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "middleLeft"
  | "center"
  | "middleRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight"
  | "custom";

export interface StartImageWatermarkPayload {
  taskId: string;
  inputPath: string;
  outputDirectory?: string;
  outputMode?: "directory" | "overwrite";
  mode: WatermarkMode;
  position: WatermarkPosition;
  opacity: number;
  margin: number;
  rotation: number;
  offsetXRatio?: number;
  offsetYRatio?: number;
  offsetXPxOnOriginal?: number;
  offsetYPxOnOriginal?: number;
  text?: string;
  fontSize?: number;
  textColor?: string;
  imagePath?: string;
  imageScalePercent?: number;
}

export interface GetImageWatermarkPreviewGeometryPayload {
  inputPath: string;
  mode: WatermarkMode;
  position: WatermarkPosition;
  opacity: number;
  margin: number;
  rotation: number;
  offsetXRatio?: number;
  offsetYRatio?: number;
  offsetXPxOnOriginal?: number;
  offsetYPxOnOriginal?: number;
  text?: string;
  fontSize?: number;
  textColor?: string;
  imagePath?: string;
  imageScalePercent?: number;
}

export interface GetImageWatermarkPreviewGeometryResult {
  baseWidthPx: number;
  baseHeightPx: number;
  overlayWidthPx: number;
  overlayHeightPx: number;
}

export interface GetImageWatermarkOverlayPreviewPayload {
  inputPath: string;
  mode: WatermarkMode;
  position: WatermarkPosition;
  opacity: number;
  margin: number;
  rotation: number;
  offsetXRatio?: number;
  offsetYRatio?: number;
  offsetXPxOnOriginal?: number;
  offsetYPxOnOriginal?: number;
  text?: string;
  fontSize?: number;
  textColor?: string;
  imagePath?: string;
  imageScalePercent?: number;
}

export interface StartImageWatermarkResult {
  taskId: string;
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: string;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  backendUsed: string;
}

export interface ImageWatermarkProgressPayload {
  taskId: string;
  progress: number;
  stage: string;
  backend: string;
  message?: string;
}

/**
 * 前端与 Tauri 通信统一入口，禁止在页面直接调用 invoke。
 */
export class TauriClient {
  public async call<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
    return invoke<T>(command, payload);
  }

  /**
   * 读取本地 SQLite 中的用户设置。
   */
  public async getAppSettings(): Promise<UserSettings> {
    return this.call<UserSettings>("get_app_settings");
  }

  /**
   * 将用户设置写入本地 SQLite。
   */
  public async saveAppSettings(payload: UserSettings): Promise<void> {
    await this.call<void>("save_app_settings", { payload });
  }

  /**
   * 更新某工具的「最近使用」展示信息（每工具仅保留一条；不记录累计次数或节省时间）。
   */
  public async recordToolUsage(payload: RecordToolUsagePayload): Promise<void> {
    await this.call<void>("record_tool_usage", { payload });
  }

  /**
   * 获取首页统计和最近使用数据。
   */
  public async getHomeDashboard(): Promise<HomeDashboardPayload> {
    return this.call<HomeDashboardPayload>("get_home_dashboard");
  }

  /** 清除 SQLite 中的使用记录与设置行；调用后需由前端重新写入默认设置。 */
  public async clearLocalUserData(): Promise<void> {
    await this.call<void>("clear_local_user_data");
  }

  /**
   * 递归扫描目录并返回可处理图片路径。
   */
  public async listImagesFromDirectory(payload: ListImagesFromDirectoryPayload): Promise<ListImagesFromDirectoryResult> {
    return this.call<ListImagesFromDirectoryResult>("list_images_from_directory", { payload });
  }

  /** 递归列出目录下的常见视频文件（与后端支持的容器扩展一致）。 */
  public async listVideosFromDirectory(payload: ListVideosFromDirectoryPayload): Promise<ListVideosFromDirectoryResult> {
    return this.call<ListVideosFromDirectoryResult>("list_videos_from_directory", { payload });
  }

  /**
   * 读取本地图片并转换为可直接预览的 data URL。
   */
  public async getImagePreviewDataUrl(payload: GetImagePreviewPayload): Promise<GetImagePreviewResult> {
    return this.call<GetImagePreviewResult>("get_image_preview_data_url", { payload });
  }

  /**
   * 获取与后端导出同源的水印几何信息，确保预览尺寸一致。
   */
  public async getImageWatermarkPreviewGeometry(
    payload: GetImageWatermarkPreviewGeometryPayload
  ): Promise<GetImageWatermarkPreviewGeometryResult> {
    return this.call<GetImageWatermarkPreviewGeometryResult>("get_image_watermark_preview_geometry", { payload });
  }

  /**
   * 获取与后端导出同源的水印图层预览 data URL，确保样式与像素一致。
   */
  public async getImageWatermarkOverlayPreviewDataUrl(
    payload: GetImageWatermarkOverlayPreviewPayload
  ): Promise<GetImagePreviewResult> {
    return this.call<GetImagePreviewResult>("get_image_watermark_overlay_preview_data_url", { payload });
  }

  /**
   * 在系统文件管理器中打开指定目录。
   */
  public async openDirectoryInFileManager(payload: OpenDirectoryPayload): Promise<void> {
    await this.call<void>("open_directory_in_file_manager", { payload });
  }

  public async getAiModelStatus(): Promise<AiModelStatusPayload> {
    return this.call<AiModelStatusPayload>("get_ai_model_status");
  }

  public async importAiModel(filePath: string): Promise<AiModelImportResultPayload> {
    return this.call<AiModelImportResultPayload>("import_ai_model", { payload: { filePath } });
  }

  public async removeAiModel(): Promise<void> {
    await this.call("remove_ai_model");
  }

  public async checkAiRuntimeStatus(): Promise<AiRuntimeLocalStatusPayload> {
    return this.call<AiRuntimeLocalStatusPayload>("check_ai_runtime_status");
  }

  public async checkAiEnvironment(requiredFreeDiskGb: number): Promise<AiRuntimeEnvironmentPayload> {
    return this.call<AiRuntimeEnvironmentPayload>("check_ai_environment", { payload: { requiredFreeDiskGb } });
  }

  public async getLocalAiRuntimePaths(): Promise<LocalAiRuntimePathsPayload> {
    return this.call<LocalAiRuntimePathsPayload>("get_local_ai_runtime_paths");
  }

  public async openLocalAiRuntimeDirectory(target: "runtime" | "models" | "downloads"): Promise<void> {
    await this.call("open_local_ai_runtime_directory", { payload: { target } });
  }

  public async installLocalAiRuntimePackage(packagePath: string): Promise<RuntimeInstallResultPayload> {
    return this.call<RuntimeInstallResultPayload>("install_local_ai_runtime_package", { payload: { packagePath } });
  }

  public async removeAiRuntime(): Promise<void> {
    await this.call("remove_ai_runtime");
  }

  public async onAiRuntimeProgress(handler: (payload: AiRuntimeProgressPayload) => void): Promise<UnlistenFn> {
    return listen<AiRuntimeProgressPayload>(AI_RUNTIME_PROGRESS_EVENT, (event) => {
      handler(event.payload);
    });
  }

  public async warmAiInpaintWorker(): Promise<void> {
    await this.call("warm_ai_inpaint_worker");
  }

  public async onAiModelProgress(handler: (payload: AiModelProgressPayload) => void): Promise<UnlistenFn> {
    return listen<AiModelProgressPayload>(AI_MODEL_PROGRESS_EVENT, (event) => {
      handler(event.payload);
    });
  }

  /**
   * 执行单张图片高清放大。
   */
  public async startImageUpscale(payload: StartImageUpscalePayload): Promise<StartImageUpscaleResult> {
    return this.call<StartImageUpscaleResult>("start_image_upscale", { payload });
  }

  /**
   * 监听 Rust 侧推送的图片高清放大进度事件。
   */
  public async onImageUpscaleProgress(handler: (payload: ImageUpscaleProgressPayload) => void): Promise<UnlistenFn> {
    return listen<ImageUpscaleProgressPayload>(IMAGE_UPSCALE_PROGRESS_EVENT, (event) => {
      handler(event.payload);
    });
  }

  /**
   * 执行单张图片压缩。
   */
  public async startImageCompress(payload: StartImageCompressPayload): Promise<StartImageCompressResult> {
    return this.call<StartImageCompressResult>("start_image_compress", { payload });
  }

  /**
   * 监听 Rust 侧推送的图片压缩进度事件。
   */
  public async onImageCompressProgress(handler: (payload: ImageCompressProgressPayload) => void): Promise<UnlistenFn> {
    return listen<ImageCompressProgressPayload>(IMAGE_COMPRESS_PROGRESS_EVENT, (event) => {
      handler(event.payload);
    });
  }

  /**
   * 执行单张图片加水印。
   */
  public async startImageWatermark(payload: StartImageWatermarkPayload): Promise<StartImageWatermarkResult> {
    return this.call<StartImageWatermarkResult>("start_image_watermark", { payload });
  }

  /**
   * 监听 Rust 侧推送的图片加水印进度事件。
   */
  public async onImageWatermarkProgress(handler: (payload: ImageWatermarkProgressPayload) => void): Promise<UnlistenFn> {
    return listen<ImageWatermarkProgressPayload>(IMAGE_WATERMARK_PROGRESS_EVENT, (event) => {
      handler(event.payload);
    });
  }

  /** 视频转 GIF（FFmpeg palettegen/paletteuse）。 */
  public async startVideoToGif(payload: StartVideoToGifPayload): Promise<StartVideoToGifResult> {
    return this.call<StartVideoToGifResult>("start_video_to_gif", { payload });
  }

  public async onVideoToGifProgress(handler: (payload: VideoToGifProgressPayload) => void): Promise<UnlistenFn> {
    return listen<VideoToGifProgressPayload>(VIDEO_TO_GIF_PROGRESS_EVENT, (event) => {
      handler(event.payload);
    });
  }
}

export const tauriClient = new TauriClient();
