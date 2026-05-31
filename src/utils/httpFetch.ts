import { isTauri } from "@tauri-apps/api/core";

/**
 * Desktop WebView 源为 https://tauri.localhost，跨域 fetch 会被浏览器 CORS 拦截。
 * Tauri HTTP 插件走 Rust 侧请求，不受 CORS 限制。
 */
export async function httpFetch(input: string, init?: RequestInit): Promise<Response> {
  if (isTauri()) {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    return tauriFetch(input, init);
  }
  return fetch(input, init);
}
