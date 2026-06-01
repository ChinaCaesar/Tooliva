import { useI18n } from "vue-i18n";
import { openExternalUrl } from "@/utils/openExternalUrl";
import { buildWebsiteUrlWithSource, type AppLocale } from "@/utils/websiteLinks";
import { useExternalNavStore } from "@/stores/externalNav.store";
import { showAppAlert } from "@/utils/appDialog";

/**
 * 桌面端**唯一允许**的"分层 ③/④ 外跳通道"。所有 `src/pages/**`、
 * `src/layouts/**`、`src/components/**` 中的营销/转化/服务/合规类外跳
 * MUST 通过 `useExternalNavigate().navigate(...)` 完成，MUST NOT 直接
 * 调用 `openExternalUrl(buildWebsiteUrl(...))` 拼接 URL。
 *
 * 唯一已知例外：`src/auth/auth.service.ts` 中的 OAuth authorize URL
 * （`/desktop-auth`）属于协议级 URL，可继续直接使用 `openExternalUrl`，
 * 但请在源码注释中标注其例外性质。
 *
 * 详细规范见：
 * - `openspec/specs/desktop-website-bridge/spec.md`
 * - `openspec/specs/app-content-boundary/spec.md`
 */

export interface ExternalNavigateOptions {
  /** 与对照表登记的 entry-id 一致，作为分析参数 `entry=<entryId>` 附加到 URL。 */
  entryId: string;
  /** 官网逻辑路径，如 `/pricing#plan-monthly`、`/changelog`。 */
  logicalPath: string;
}

export function useExternalNavigate() {
  const { t, locale } = useI18n();
  const externalNavStore = useExternalNavStore();

  async function navigate(opts: ExternalNavigateOptions): Promise<void> {
    const url = buildWebsiteUrlWithSource(
      locale.value as AppLocale,
      opts.logicalPath,
      opts.entryId,
    );
    externalNavStore.show(t("layout.appShell.externalNav.opening"));
    try {
      await openExternalUrl(url);
    } catch (error) {
      externalNavStore.hide();
      const title = t("auth.websiteOpenFailedTitle");
      const body = t("auth.websiteOpenFailedMessage");
      await showAppAlert({ title, message: body });
      console.warn(
        `[externalNav] failed to open url=${url} entry=${opts.entryId}`,
        error,
      );
    }
  }

  return { navigate };
}
