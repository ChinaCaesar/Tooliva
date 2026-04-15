/**
 * 统一本地存储读写，便于后续替换为 Tauri store 或数据库。
 */
export class LocalStorageService {
  public get<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  public set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export const localStorageService = new LocalStorageService();
