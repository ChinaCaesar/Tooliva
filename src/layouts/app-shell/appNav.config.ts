import { ROUTE_PATHS } from "@/config/constants";

/**
 * 侧栏次要导航：与首页主推工具列表解耦，仍集中在此配置。
 */
export type AppNavSecondaryKind = "route" | "placeholder";

export interface AppNavSecondaryItem {
  id: string;
  kind: AppNavSecondaryKind;
  labelKey: string;
  /** 展开态下主标签下方的副标题（可选） */
  subtitleKey?: string;
  path?: string;
  placeholderMessageKey?: string;
}

export const APP_NAV_SECONDARY_ITEMS: AppNavSecondaryItem[] = [
  {
    id: "membership",
    kind: "route",
    labelKey: "layout.appShell.nav.membership",
    subtitleKey: "layout.appShell.nav.membershipSubtitle",
    path: ROUTE_PATHS.membership
  },
  { id: "history", kind: "placeholder", labelKey: "layout.appShell.nav.history", placeholderMessageKey: "layout.appShell.placeholders.history" },
  { id: "settings", kind: "route", labelKey: "layout.appShell.nav.settings", path: ROUTE_PATHS.settings }
];
