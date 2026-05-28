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
}

interface ApiEnvelope<T> {
  data?: T;
}

type UnknownRecord = Record<string, unknown>;

function getUpdateCheckUrl(options: CheckUpdateOptions): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = (import.meta.env.VITE_APP_UPDATE_CHECK_PATH as string | undefined)?.trim() || "/desktop/releases/check";
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  url.searchParams.set("currentVersion", options.currentVersion);
  url.searchParams.set("channel", options.channel);
  url.searchParams.set("platform", "desktop");
  if (options.locale) {
    url.searchParams.set("locale", options.locale);
  }
  return url.toString();
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
  const response = await fetch(getUpdateCheckUrl(options), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`update_check_failed:${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const source = unwrapPayload(payload);
  const latestVersion = pickString(source, ["latestVersion", "latest_version", "version", "tag", "release_version"]) || options.currentVersion;
  const explicitAvailable = pickBoolean(source, ["available", "hasUpdate", "has_update", "needUpdate", "need_update"]);

  return {
    available: explicitAvailable ?? isVersionGreater(latestVersion, options.currentVersion),
    currentVersion: options.currentVersion,
    latestVersion,
    notes: pickString(source, ["notes", "summary", "description", "content"]),
    publishedAt: pickString(source, ["publishedAt", "published_at", "releaseDate", "release_date", "date"]),
    downloadUrl: pickString(source, ["downloadUrl", "download_url", "url", "link"]) || undefined,
  };
}
