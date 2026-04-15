import { tauriClient } from "@/bridge/tauriClient";

interface PingResponse {
  message: string;
}

/**
 * 示例系统桥接模块，页面层只依赖 bridge 方法。
 */
export async function pingDesktopHost(name: string): Promise<PingResponse> {
  return tauriClient.call<PingResponse>("ping_host", { name });
}
