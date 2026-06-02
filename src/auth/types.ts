export type AuthProvider = 'WECHAT' | 'GOOGLE' | 'GITHUB' | 'EMAIL';

export interface AuthUser {
  id: string;
  nickname: string;
  provider: AuthProvider;
  email?: string;
  avatar?: string;
}

export type MembershipTier = 'none' | 'monthly' | 'yearly' | 'lifetime';

export interface MembershipInfo {
  tier: MembershipTier;
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

export interface BackendUserInfo {
  id?: number | string;
  username?: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  token?: string;
  refresh_token?: string;
  provider?: string;
}

export interface BackendMembershipSnapshot {
  tier?: string;
  is_active?: boolean;
  expires_at?: number | string | null;
}

export interface PendingPkceSession {
  state: string;
  codeVerifier: string;
  loginStartTime: number;
}
