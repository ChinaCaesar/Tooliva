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
