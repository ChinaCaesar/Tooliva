import { API_BASE_URL } from "@/config/constants";

export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  summary: string;
  url?: string;
}

interface ApiEnvelope<T> {
  code?: number;
  data?: T;
}

type UnknownRecord = Record<string, unknown>;

function getChangelogApiUrl(limit: number, locale?: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = (import.meta.env.VITE_CHANGELOG_API_PATH as string | undefined)?.trim() || "/app-version/changelog";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("app_code", "tooliva");
  url.searchParams.set("channel", "stable");
  if (locale) {
    const normalizedLocale = locale.toLowerCase().startsWith("en") ? "en" : "zh-CN";
    url.searchParams.set("locale", normalizedLocale);
  }
  return url.toString();
}

function unwrapPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const envelope = payload as ApiEnvelope<unknown> & UnknownRecord;
  if (Array.isArray(envelope.data)) return envelope.data;

  const dataRecord = envelope.data && typeof envelope.data === "object" ? (envelope.data as UnknownRecord) : null;
  if (dataRecord) {
    if (Array.isArray(dataRecord.list)) return dataRecord.list;
    if (Array.isArray(dataRecord.items)) return dataRecord.items;
    if (Array.isArray(dataRecord.records)) return dataRecord.records;
  }

  if (Array.isArray(envelope.list)) return envelope.list;
  if (Array.isArray(envelope.items)) return envelope.items;
  if (Array.isArray(envelope.records)) return envelope.records;
  return [];
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

function normalizeEntry(item: unknown, index: number): ChangelogEntry | null {
  if (!item || typeof item !== "object") return null;

  const source = item as UnknownRecord;
  const version = pickString(source, ["version", "tag", "release_version", "releaseVersion"]);
  const items = Array.isArray(source.items) ? source.items : [];
  const firstItem = items.find((entry) => typeof entry === "string" && entry.trim().length > 0);
  const summary = pickString(source, ["summary", "title", "description", "content"]) || (typeof firstItem === "string" ? firstItem.trim() : "");
  const date = pickString(source, ["date", "published_at", "publishedAt", "release_date", "releaseDate", "created_at", "createdAt"]);

  if (!version || !summary) {
    return null;
  }

  return {
    id: pickString(source, ["id", "slug", "version"]) || `changelog-${index}`,
    version: version.startsWith("v") ? version : `v${version}`,
    date,
    summary,
    url: pickString(source, ["url", "link", "href"]) || undefined,
  };
}

function byDateDesc(a: ChangelogEntry, b: ChangelogEntry): number {
  const left = Date.parse(a.date);
  const right = Date.parse(b.date);
  if (Number.isNaN(left) || Number.isNaN(right)) {
    return b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: "base" });
  }
  return right - left;
}

export async function fetchChangelogEntries(limit = 2, locale?: string): Promise<ChangelogEntry[]> {
  const response = await fetch(getChangelogApiUrl(limit, locale), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`changelog_request_failed:${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  return unwrapPayload(payload)
    .map((item, index) => normalizeEntry(item, index))
    .filter((item): item is ChangelogEntry => Boolean(item))
    .sort(byDateDesc)
    .slice(0, limit);
}
