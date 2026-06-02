import type { BackendMembershipSnapshot, MembershipInfo, MembershipTier } from '@/auth/types';

export function normalizeMembershipTier(tier?: string): MembershipTier {
  const normalized = tier?.toLowerCase().trim() ?? '';
  if (normalized === 'lifetime') {
    return 'lifetime';
  }
  if (normalized === 'yearly') {
    return 'yearly';
  }
  if (normalized === 'monthly' || normalized === 'vip' || normalized === 'pro') {
    return 'monthly';
  }
  return 'none';
}

function normalizeExpiresAt(value: BackendMembershipSnapshot['expires_at']): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'number') {
    return value > 0 ? new Date(value * 1000).toISOString() : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function mapMembershipSnapshot(snapshot?: Partial<BackendMembershipSnapshot>): MembershipInfo {
  const tier = normalizeMembershipTier(snapshot?.tier);
  const isActive = Boolean(snapshot?.is_active) && tier !== 'none';

  return {
    tier: isActive ? tier : 'none',
    isActive,
    expiresAt: normalizeExpiresAt(snapshot?.expires_at),
  };
}

export function resolveMembershipTierLabel(
  membership: MembershipInfo | null | undefined,
  t: (key: string) => string,
): string {
  if (!membership?.isActive) {
    return t('pages.membershipDesktop.status.free');
  }

  const key = `pages.membershipDesktop.planNames.${membership.tier}`;
  const translated = t(key);
  return translated === key ? t('pages.membershipDesktop.status.paid') : translated;
}

export function resolveMembershipSummaryTitle(
  membership: MembershipInfo | null | undefined,
  isLoggedIn: boolean,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (!isLoggedIn) {
    return t('pages.membershipDesktop.summary.guestTitle');
  }
  if (!membership?.isActive) {
    return t('pages.membershipDesktop.summary.freeTitle');
  }
  if (membership.tier === 'lifetime') {
    return t('pages.membershipDesktop.summary.lifetimeTitle');
  }

  const planKey = `pages.membershipDesktop.planNames.${membership.tier}`;
  const planName = t(planKey);
  if (planName !== planKey) {
    return t('pages.membershipDesktop.summary.activeTitle', { plan: planName });
  }

  return t('pages.membershipDesktop.summary.paidTitle');
}
