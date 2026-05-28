import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { fetchDesktopMembershipSnapshot, fetchDesktopPricingPlans, type DesktopMembershipSnapshot, type DesktopPricingPlan } from "@/modules/membership/api";
import { useAuthStore } from "@/stores/auth.store";

interface MembershipPlanViewModel {
  planCode: string;
  title: string;
  subtitle: string;
  price: string;
  cycle: string;
  badge: string;
  features: string[];
  isCurrent: boolean;
  canPurchase: boolean;
  buttonEntryId: string;
  reason: string;
}

function isZh(locale: string): boolean {
  return locale === "zh-CN";
}

function mapCurrentPlanCode(snapshot: DesktopMembershipSnapshot | null): string | null {
  if (!snapshot?.is_active) return null;
  if (snapshot.tier === "monthly") return "monthly";
  if (snapshot.tier === "yearly") return "yearly";
  if (snapshot.tier === "lifetime") return "lifetime";
  return null;
}

function mapPlanEntryId(planCode: string): string {
  switch (planCode) {
    case "trial_monthly":
      return "membership-plan-trial-cta";
    case "monthly":
      return "membership-plan-monthly-cta";
    case "yearly":
      return "membership-plan-annual-cta";
    case "lifetime":
      return "membership-plan-lifetime-cta";
    default:
      return "desktop-membership-plan-buy";
  }
}

function resolvePlanTitle(planCode: string, fallback: string, t: (key: string) => string): string {
  const key = `pages.membershipDesktop.planNames.${planCode}`;
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function resolvePlanSubtitle(planCode: string, fallback: string, t: (key: string) => string): string {
  const key = `pages.membershipDesktop.planSubtitles.${planCode}`;
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function resolvePlanFeatures(planCode: string, fallback: string[], t: (key: string) => string): string[] {
  const featureKeys = [
    `pages.membershipDesktop.planFeatures.${planCode}.feature1`,
    `pages.membershipDesktop.planFeatures.${planCode}.feature2`,
    `pages.membershipDesktop.planFeatures.${planCode}.feature3`,
  ];
  const translated = featureKeys
    .map((key) => t(key))
    .filter((value, index) => value !== featureKeys[index]);

  if (translated.length > 0) {
    return translated;
  }

  return fallback.slice(0, 3);
}

function formatExpiry(expiresAt: number, locale: string, isLifetime: boolean, t: (key: string, params?: Record<string, unknown>) => string): string {
  if (isLifetime) return t("auth.membership.noExpiry");
  if (!expiresAt) return "-";
  return new Date(expiresAt * 1000).toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US");
}

export function useMembershipPageData() {
  const { t, locale } = useI18n();
  const authStore = useAuthStore();

  const loading = ref(false);
  const errorMessage = ref("");
  const plans = ref<DesktopPricingPlan[]>([]);
  const snapshot = ref<DesktopMembershipSnapshot | null>(null);

  const currentPlanCode = computed(() => mapCurrentPlanCode(snapshot.value));

  const summaryTitle = computed(() => {
    if (!authStore.isLoggedIn) {
      return t("pages.membershipDesktop.summary.guestTitle");
    }
    if (!snapshot.value?.is_active) {
      return t("pages.membershipDesktop.summary.freeTitle");
    }
    if (snapshot.value.tier === "lifetime") {
      return t("pages.membershipDesktop.summary.lifetimeTitle");
    }
    return t("pages.membershipDesktop.summary.paidTitle");
  });

  const summaryDescription = computed(() => {
    if (!authStore.isLoggedIn) {
      return t("pages.membershipDesktop.summary.guestDescription");
    }
    if (!snapshot.value?.is_active) {
      return t("pages.membershipDesktop.summary.freeDescription");
    }
    if (snapshot.value.tier === "lifetime") {
      return t("pages.membershipDesktop.summary.lifetimeDescription");
    }
    return t("pages.membershipDesktop.summary.paidDescription");
  });

  const membershipStatusLabel = computed(() => {
    if (!authStore.isLoggedIn) return t("pages.membershipDesktop.status.guest");
    if (!snapshot.value?.is_active) return t("pages.membershipDesktop.status.free");
    if (snapshot.value.tier === "lifetime") return t("pages.membershipDesktop.status.lifetime");
    return t("pages.membershipDesktop.status.paid");
  });

  const membershipExpiryLabel = computed(() => {
    if (!authStore.isLoggedIn || !snapshot.value?.is_active) return "-";
    return formatExpiry(
      snapshot.value.expires_at,
      locale.value,
      snapshot.value.tier === "lifetime",
      t,
    );
  });

  const memberBenefits = computed(() => {
    if (isZh(locale.value)) {
      return [
        "免费会员可使用核心功能，但每天有使用限额，适合轻度体验。",
        "付费会员可不限次使用核心工具，适合高频处理与长期工作流。",
        "月付、年付与终身会员的核心权益一致，主要区别是购买周期。",
      ];
    }
    return [
      "Free members can access core tools with daily limits.",
      "Paid members unlock unlimited core usage for frequent workflows.",
      "Monthly, yearly, and lifetime packages share the same core paid rights.",
    ];
  });

  const planCards = computed<MembershipPlanViewModel[]>(() =>
    plans.value.map((plan) => {
      const isCurrent = currentPlanCode.value === plan.plan_code && Boolean(snapshot.value?.is_active);
      const purchaseState = snapshot.value?.purchasable?.[plan.plan_code];
      const canPurchase = purchaseState ? purchaseState.ok : true;
      const title = resolvePlanTitle(plan.plan_code, plan.title, t);
      const subtitle = resolvePlanSubtitle(plan.plan_code, plan.subtitle, t);
      const reason = isCurrent
        ? t("pages.membershipDesktop.plans.currentPlan")
        : purchaseState?.reason
          ? t(`pages.membershipDesktop.purchaseReasons.${purchaseState.reason}`)
          : subtitle;
      const cycle = t(`pages.membershipDesktop.period.${plan.billing_period}`, plan.billing_period);
      return {
        planCode: plan.plan_code,
        title,
        subtitle,
        price: `${plan.currency} ${plan.amount}`,
        cycle,
        badge: plan.badge,
        features: resolvePlanFeatures(plan.plan_code, Array.isArray(plan.features) ? plan.features : [], t),
        isCurrent,
        canPurchase,
        buttonEntryId: mapPlanEntryId(plan.plan_code),
        reason,
      };
    }),
  );

  async function load(): Promise<void> {
    loading.value = true;
    errorMessage.value = "";
    try {
      const planResult = await fetchDesktopPricingPlans();
      const visiblePlanCodes = ["trial_monthly", "monthly", "yearly", "lifetime"];
      plans.value = planResult
        .filter((plan) => visiblePlanCodes.includes(plan.plan_code))
        .sort((a, b) => visiblePlanCodes.indexOf(a.plan_code) - visiblePlanCodes.indexOf(b.plan_code));

      if (authStore.isLoggedIn) {
        try {
          snapshot.value = await fetchDesktopMembershipSnapshot();
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          errorMessage.value = message || t("pages.membershipDesktop.errors.membershipFetchFailed");
          snapshot.value = null;
        }
      } else {
        snapshot.value = null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      errorMessage.value = message || t("pages.membershipDesktop.errors.planFetchFailed");
      plans.value = [];
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    void load();
  });

  watch(() => authStore.isLoggedIn, () => {
    void load();
  });

  return {
    loading,
    errorMessage,
    summaryTitle,
    summaryDescription,
    membershipStatusLabel,
    membershipExpiryLabel,
    memberBenefits,
    planCards,
    load,
  };
}
