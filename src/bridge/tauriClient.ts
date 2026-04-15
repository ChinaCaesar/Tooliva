import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export const WEBM_TO_MP4_PROGRESS_EVENT = "webm-to-mp4-progress";

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
}

export const tauriClient = new TauriClient();
