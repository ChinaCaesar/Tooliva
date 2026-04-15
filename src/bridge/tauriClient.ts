import { invoke } from "@tauri-apps/api/core";

/**
 * 前端与 Tauri 通信统一入口，禁止在页面直接调用 invoke。
 */
export class TauriClient {
  public async call<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
    return invoke<T>(command, payload);
  }
}

export const tauriClient = new TauriClient();
