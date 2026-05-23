import type { AuthExchangeResult, AuthProvider, AuthUser, MembershipInfo, TokenPair } from './types';

const MOCK_USERS: Record<AuthProvider, Omit<AuthUser, 'id'>> = {
  WECHAT: { nickname: '微信用户', provider: 'WECHAT' },
  GOOGLE: { nickname: 'Google User', provider: 'GOOGLE', email: 'google_user@example.com' },
  GITHUB: { nickname: 'Github Dev', provider: 'GITHUB', email: 'github_user@example.com' },
  EMAIL: { nickname: '邮箱用户', provider: 'EMAIL', email: 'demo@example.com' },
};

const MOCK_MEMBERSHIP: Record<AuthProvider, MembershipInfo> = {
  WECHAT: {
    tier: 'pro',
    tierLabel: '专业版',
    isActive: true,
    expiresAt: '2027-05-23T00:00:00.000Z',
  },
  GOOGLE: {
    tier: 'pro',
    tierLabel: '专业版',
    isActive: true,
    expiresAt: '2027-03-15T00:00:00.000Z',
  },
  GITHUB: {
    tier: 'lifetime',
    tierLabel: '终身会员',
    isActive: true,
    expiresAt: null,
  },
  EMAIL: {
    tier: 'pro',
    tierLabel: '专业版',
    isActive: true,
    expiresAt: '2026-12-31T00:00:00.000Z',
  },
};

function buildTokens(provider: AuthProvider): TokenPair {
  const now = Date.now();
  return {
    accessToken: `mock_access_${provider.toLowerCase()}_${now}`,
    refreshToken: `mock_refresh_${provider.toLowerCase()}_${now}`,
    expiresAt: new Date(now + 3600_000).toISOString(),
  };
}

export function createMockExchangeResult(provider: AuthProvider): AuthExchangeResult {
  const profile = MOCK_USERS[provider];
  return {
    user: {
      id: `mock_${provider.toLowerCase()}`,
      ...profile,
    },
    membership: MOCK_MEMBERSHIP[provider],
    tokens: buildTokens(provider),
  };
}
