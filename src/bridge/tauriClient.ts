import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { UserSettings } from "@/types/settings";

export const WEBM_TO_MP4_PROGRESS_EVENT = "webm-to-mp4-progress";
export const IMAGE_UPSCALE_PROGRESS_EVENT = "image-upscale-progress";

export type WebmToMp4OutputMode = "sameAsInput" | "globalDirectory" | "customFilePath";

export interface StartWebmToMp4Payload {
  taskId: string;
  inputPath: string;
  outputMode: WebmToMp4OutputMode;
  outputPath?: string;
}

export interface StartWebmToMp4Result {
  taskId: string;
  outputPath: string;
  success: boolean;
  cancelled: boolean;
  error?: string;
}

export interface SaveAsConvertedFilePayload {
  sourcePath: string;
  targetPath: string;
}

export interface WebmToMp4ProgressPayload {
  taskId: string;
  progress: number;
  outTimeMs: number;
  speed?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  message?: string;
}

export interface RecordToolUsagePayload {
  toolKey: string;
  fileName: string;
  savedSeconds: number;
}

export interface HomeStatsPayload {
  totalUsageCount: number;
  todayUsageCount: number;
  totalSavedMinutes: number;
  todaySavedMinutes: number;
}

export interface HomeRecentUsagePayload {
  id: number;
  toolKey: string;
  fileName: string;
  usedAtTs: number;
}

export interface HomeDashboardPayload {
  stats: HomeStatsPayload;
  recentItems: HomeRecentUsagePayload[];
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

export interface StartImageUpscalePayload {
  taskId: string;
  inputPath: string;
  scaleFactor: 2 | 4 | 8;
  outputDirectory?: string;
  qualityMode?: "fast" | "balanced" | "quality";
  backendPreference?: "auto" | "gpu" | "cpu" | "ai";
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
   * 发起单个 WebM 到 MP4 的转换任务。
   */
  public async startWebmToMp4(payload: StartWebmToMp4Payload): Promise<StartWebmToMp4Result> {
    return this.call<StartWebmToMp4Result>("start_webm_to_mp4", { payload });
  }

  /**
   * 取消一个正在转换的任务。
   */
  public async cancelWebmToMp4(taskId: string): Promise<void> {
    await this.call<void>("cancel_webm_to_mp4", { payload: { taskId } });
  }

  /**
   * 复制已转换好的文件到用户指定路径。
   */
  public async saveAsConvertedFile(payload: SaveAsConvertedFilePayload): Promise<string> {
    return this.call<string>("save_as_converted_file", { payload });
  }

  /**
   * 监听 Rust 侧推送的转换进度事件。
   */
  public async onWebmToMp4Progress(handler: (payload: WebmToMp4ProgressPayload) => void): Promise<UnlistenFn> {
    return listen<WebmToMp4ProgressPayload>(WEBM_TO_MP4_PROGRESS_EVENT, (event) => {
      handler(event.payload);
    });
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
   * 记录工具使用事件，用于首页统计与最近使用列表。
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

  /**
   * 递归扫描目录并返回可处理图片路径。
   */
  public async listImagesFromDirectory(payload: ListImagesFromDirectoryPayload): Promise<ListImagesFromDirectoryResult> {
    return this.call<ListImagesFromDirectoryResult>("list_images_from_directory", { payload });
  }

  /**
   * 执行单张图片高清放大。
   */
  public async startImageUpscale(payload: StartImageUpscalePayload): Promise<StartImageUpscaleResult> {
    return this.call<StartImageUpscaleResult>("start_image_upscale", { payload });
  }

  /**
   * 监听 Rust 侧推送的图片放大进度事件。
   */
  public async onImageUpscaleProgress(handler: (payload: ImageUpscaleProgressPayload) => void): Promise<UnlistenFn> {
    return listen<ImageUpscaleProgressPayload>(IMAGE_UPSCALE_PROGRESS_EVENT, (event) => {
      handler(event.payload);
    });
  }
}

export const tauriClient = new TauriClient();
