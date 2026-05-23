export type AuthProvider = 'WECHAT' | 'GOOGLE' | 'GITHUB' | 'EMAIL';

export interface AuthUser {
  id: string;
  nickname: string;
  provider: AuthProvider;
  email?: string;
}

export type MembershipTier = 'free' | 'pro' | 'lifetime';

export interface MembershipInfo {
  tier: MembershipTier;
  tierLabel: string;
  isActive: boolean;
  expiresAt: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthSession {
  user: AuthUser;
  membership: MembershipInfo;
  tokens: TokenPair;
  loggedInAt: string;
}

export interface MockAuthCodePayload {
  provider: AuthProvider;
  state: string;
  codeChallenge: string;
  exp: number;
  nonce: string;
}

export interface AuthExchangeResult {
  user: AuthUser;
  membership: MembershipInfo;
  tokens: TokenPair;
}

export interface PendingPkceSession {
  state: string;
  codeVerifier: string;
  loginStartTime: number;
}
