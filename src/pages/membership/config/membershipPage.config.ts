/**
 * 会员中心页只读展示配置；价格与说明文案由 i18n 承载，便于后续替换为接口数据。
 */

export type MembershipPlanId = "monthly" | "quarterly" | "annual" | "lifetime";

export type MembershipPlanVariant = "featured" | "default" | "lifetime";

export interface MembershipPlanDef {
  id: MembershipPlanId;
  variant: MembershipPlanVariant;
  badgeKey: string | null;
  nameKey: string;
  subtitleKey: string;
  priceKey: string;
  /** 主价右侧周期文案；永久会员为 null 时不展示周期 */
  cycleKey: string | null;
  /** 主价下方说明；null 时仍保留占位行高以与其它卡片对齐 */
  secondaryKey: string | null;
}

export const MEMBERSHIP_PLAN_DEFS: readonly MembershipPlanDef[] = [
  {
    id: "monthly",
    variant: "featured",
    badgeKey: "pages.membership.plans.badgeRecommended",
    nameKey: "pages.membership.plans.monthly",
    subtitleKey: "pages.membership.plans.monthlySub",
    priceKey: "pages.membership.plans.priceMonthly",
    cycleKey: "pages.membership.plans.cycleMonth",
    secondaryKey: "pages.membership.plans.monthlySecondary"
  },
  {
    id: "quarterly",
    variant: "default",
    badgeKey: "pages.membership.plans.badgeSave16",
    nameKey: "pages.membership.plans.quarterly",
    subtitleKey: "pages.membership.plans.quarterlySub",
    priceKey: "pages.membership.plans.priceQuarterly",
    cycleKey: "pages.membership.plans.cycleQuarter",
    secondaryKey: "pages.membership.plans.quarterlySecondary"
  },
  {
    id: "annual",
    variant: "default",
    badgeKey: "pages.membership.plans.badgeSave46",
    nameKey: "pages.membership.plans.annual",
    subtitleKey: "pages.membership.plans.annualSub",
    priceKey: "pages.membership.plans.priceAnnual",
    cycleKey: "pages.membership.plans.cycleYear",
    secondaryKey: "pages.membership.plans.annualSecondary"
  },
  {
    id: "lifetime",
    variant: "lifetime",
    badgeKey: "pages.membership.plans.badgeValue",
    nameKey: "pages.membership.plans.lifetime",
    subtitleKey: "pages.membership.plans.lifetimeSub",
    priceKey: "pages.membership.plans.priceLifetime",
    cycleKey: null,
    secondaryKey: "pages.membership.plans.lifetimeSecondary"
  }
] as const;

export type CompareCell =
  | { kind: "check" }
  | { kind: "dash" }
  | { kind: "text"; key: string };

export interface MembershipCompareRowDef {
  featureKey: string;
  free: CompareCell;
  member: CompareCell;
  lifetime: CompareCell;
}

export const MEMBERSHIP_COMPARE_ROWS: readonly MembershipCompareRowDef[] = [
  {
    featureKey: "pages.membership.compare.rows.unlimited",
    free: { kind: "text", key: "pages.membership.compare.free.limited" },
    member: { kind: "check" },
    lifetime: { kind: "check" }
  },
  {
    featureKey: "pages.membership.compare.rows.batch",
    free: { kind: "text", key: "pages.membership.compare.free.partial" },
    member: { kind: "check" },
    lifetime: { kind: "check" }
  },
  {
    featureKey: "pages.membership.compare.rows.ads",
    free: { kind: "text", key: "pages.membership.compare.free.withAds" },
    member: { kind: "check" },
    lifetime: { kind: "check" }
  },
  {
    featureKey: "pages.membership.compare.rows.support",
    free: { kind: "text", key: "pages.membership.compare.free.standard" },
    member: { kind: "check" },
    lifetime: { kind: "check" }
  },
  {
    featureKey: "pages.membership.compare.rows.early",
    free: { kind: "dash" },
    member: { kind: "check" },
    lifetime: { kind: "check" }
  },
  {
    featureKey: "pages.membership.compare.rows.exclusive",
    free: { kind: "dash" },
    member: { kind: "text", key: "pages.membership.compare.member.partialExclusive" },
    lifetime: { kind: "check" }
  }
] as const;

export const MEMBERSHIP_FAQ_ORDER = ["q1", "q2", "q3", "q4"] as const;
export type MembershipFaqId = (typeof MEMBERSHIP_FAQ_ORDER)[number];
