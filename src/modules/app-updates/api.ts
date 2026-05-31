import { isTauri } from "@tauri-apps/api/core";
import { API_BASE_URL } from "@/config/constants";

export interface AppUpdateCheckResult {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  notes: string;
  publishedAt: string;
  downloadUrl?: string;
}

interface CheckUpdateOptions {
  currentVersion: string;
  channel: string;
  locale?: string;
  buildNum?: number;
}

interface ApiEnvelope<T> {
  data?: T;
}

type UnknownRecord = Record<string, unknown>;

function getUpdateCheckUrl(options: CheckUpdateOptions): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = (import.meta.env.VITE_APP_UPDATE_CHECK_PATH as string | undefined)?.trim() || "/app-version/check";
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  url.searchParams.set("app_code", "tooliva");
  url.searchParams.set("channel", options.channel);
  url.searchParams.set("platform", detectPlatform());
  url.searchParams.set("arch", detectArch());
  url.searchParams.set("build_num", String(Math.max(0, options.buildNum ?? 0)));
  if (options.locale) {
    url.searchParams.set("locale", normalizeLocale(options.locale));
  }
  return url.toString();
}

function normalizeLocale(locale: string): string {
  const normalized = locale.trim().toLowerCase();
  return normalized === "en" || normalized === "en-us" ? "en" : "zh-CN";
}

function detectPlatform(): "windows" | "macos" {
  const platform = `${globalThis.navigator?.platform ?? ""}`.toLowerCase();
  return platform.includes("mac") ? "macos" : "windows";
}

function detectArch(): "x64" | "arm64" {
  const ua = `${globalThis.navigator?.userAgent ?? ""}`.toLowerCase();
  return /\b(arm|aarch64)\b/.test(ua) ? "arm64" : "x64";
}

function unwrapPayload(payload: unknown): UnknownRecord {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  const envelope = payload as ApiEnvelope<unknown> & UnknownRecord;
  if (envelope.data && typeof envelope.data === "object") {
    return envelope.data as UnknownRecord;
  }
  return envelope;
}

function pickString(source: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function pickBoolean(source: UnknownRecord, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes"].includes(normalized)) return true;
      if (["false", "0", "no"].includes(normalized)) return false;
    }
  }
  return null;
}

function pickNestedString(source: UnknownRecord, path: string[]): string {
  let current: unknown = source;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return "";
    }
    current = (current as UnknownRecord)[key];
  }
  return typeof current === "string" && current.trim().length > 0 ? current.trim() : "";
}

function pickStringList(source: UnknownRecord, key: string): string[] {
  const value = source[key];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function normalizeVersion(value: string): number[] {
  return value
    .trim()
    .replace(/^v/i, "")
    .split("-")[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
}

function isVersionGreater(nextVersion: string, currentVersion: string): boolean {
  const left = normalizeVersion(nextVersion);
  const right = normalizeVersion(currentVersion);
  const max = Math.max(left.length, right.length);

  for (let i = 0; i < max; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l > r) return true;
    if (l < r) return false;
  }

  return false;
}

export async function checkDesktopAppUpdate(options: CheckUpdateOptions): Promise<AppUpdateCheckResult> {
  const requestUrl = getUpdateCheckUrl(options);
  const requestInit = {
    headers: {
      Accept: "application/json",
    },
  };
  const response = isTauri()
    ? await (await import("@tauri-apps/plugin-http")).fetch(requestUrl, {
      ...requestInit,
      method: "GET",
      connectTimeout: 12_000,
    })
    : await fetch(requestUrl, requestInit);
  if (!response.ok) {
    throw new Error(`update_check_failed:${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const source = unwrapPayload(payload);
  const latestVersion =
    pickString(source, ["latestVersion", "latest_version", "version", "tag", "release_version"])
    || pickNestedString(source, ["latest", "version"])
    || options.currentVersion;
  const explicitAvailable =
    pickBoolean(source, ["available", "hasUpdate", "has_update", "needUpdate", "need_update"])
    ?? pickNestedBoolean(source, ["latest", "has_update"]);
  const notesList = pickStringList(source, "notes");
  const packageUrl =
    pickString(source, ["downloadUrl", "download_url", "url", "link"])
    || pickNestedString(source, ["package", "package_file"]);

  return {
    available: explicitAvailable ?? isVersionGreater(latestVersion, options.currentVersion),
    currentVersion: options.currentVersion,
    latestVersion,
    notes: notesList.join("\n") || pickString(source, ["notes", "summary", "description", "content"]),
    publishedAt:
      pickString(source, ["publishedAt", "published_at", "releaseDate", "release_date", "date"])
      || pickNestedString(source, ["latest", "release_date"]),
    downloadUrl: packageUrl || undefined,
  };
}

function pickNestedBoolean(source: UnknownRecord, path: string[]): boolean | null {
  let current: unknown = source;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return null;
    }
    current = (current as UnknownRecord)[key];
  }
  if (typeof current === "boolean") return current;
  if (typeof current === "number") return current > 0;
  if (typeof current === "string") {
    const normalized = current.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return null;
}
