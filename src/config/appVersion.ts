/** 桌面应用 semver，构建期由 `.env.*` 的 `APP_VERSION` 注入。 */
export const APP_VERSION = __APP_VERSION__;

/** 展示用版本标签，例如 `v0.1.0`。 */
export function formatAppVersionLabel(version: string = APP_VERSION): string {
  return `v${version.replace(/^v/i, "")}`;
}

export const APP_VERSION_LABEL = formatAppVersionLabel();
