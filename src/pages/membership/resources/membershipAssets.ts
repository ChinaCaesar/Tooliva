/**
 * `public/resources/icons/` 等静态资源 URL（兼容 Vite `base`）。
 */
export function membershipPublicResourceUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return `${withSlash}resources/icons/${fileName}`;
}

export const MEMBERSHIP_ASSETS = {
  heroIllustration: membershipPublicResourceUrl("membership_hero.png")
} as const;
