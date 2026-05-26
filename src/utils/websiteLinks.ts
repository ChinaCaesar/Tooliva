import { WEBSITE_URL } from '@/config/constants';

export type AppLocale = 'zh-CN' | 'en-US';
type WebsiteLocale = 'en' | 'zh-CN';

function toWebsiteLocale(appLocale: AppLocale): WebsiteLocale {
  return appLocale === 'zh-CN' ? 'zh-CN' : 'en';
}

function normalizeLogicalPath(logicalPath: string): string {
  const withSlash = logicalPath.startsWith('/') ? logicalPath : `/${logicalPath}`;
  const [pathPart, hashPart] = withSlash.split('#');
  const normalizedPath = pathPart === '/' ? '' : pathPart;
  return hashPart ? `${normalizedPath}#${hashPart}` : normalizedPath;
}

/** Build a locale-aware absolute URL on the marketing website. */
export function buildWebsiteUrl(appLocale: AppLocale, logicalPath: string): string {
  const websiteLocale = toWebsiteLocale(appLocale);
  const normalized = normalizeLogicalPath(logicalPath);
  const [pathPart, hashPart] = normalized.split('#');
  const prefix = websiteLocale === 'zh-CN' ? '/zh-CN' : '';
  const localizedPath = `${prefix}${pathPart || ''}` || '/';
  const withHash = hashPart ? `${localizedPath}#${hashPart}` : localizedPath;
  const base = WEBSITE_URL.replace(/\/$/, '');
  return `${base}${withHash}`;
}

/**
 * 在 `buildWebsiteUrl` 输出上叠加分析参数：`source=desktop&v=<APP_VERSION>&locale=<locale>[&entry=<entryId>]`。
 * 正确处理已有 query 与 hash 的拼接顺序：query 段始终位于 hash 之前。
 *
 * 示例：
 * - `('/pricing')`        → `<base>/<prefix>/pricing?source=desktop&v=0.1.0&locale=<locale>`
 * - `('/pricing#faq')`    → `<base>/<prefix>/pricing?source=desktop&v=0.1.0&locale=<locale>#faq`
 * - `('/pricing?x=1')`    → `<base>/<prefix>/pricing?x=1&source=desktop&v=0.1.0&locale=<locale>`
 * - `('/p?x=1#f', 'eid')` → `<base>/<prefix>/p?x=1&source=desktop&v=0.1.0&locale=<locale>&entry=eid#f`
 */
export function buildWebsiteUrlWithSource(
  appLocale: AppLocale,
  logicalPath: string,
  entryId?: string,
): string {
  const baseUrl = buildWebsiteUrl(appLocale, logicalPath);
  const hashIdx = baseUrl.indexOf('#');
  const baseWithoutHash = hashIdx >= 0 ? baseUrl.slice(0, hashIdx) : baseUrl;
  const hashPart = hashIdx >= 0 ? baseUrl.slice(hashIdx) : '';
  const sep = baseWithoutHash.includes('?') ? '&' : '?';
  const params = new URLSearchParams();
  params.set('source', 'desktop');
  params.set('v', __APP_VERSION__);
  params.set('locale', appLocale);
  if (entryId) params.set('entry', entryId);
  return `${baseWithoutHash}${sep}${params.toString()}${hashPart}`;
}
