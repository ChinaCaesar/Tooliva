import { API_BASE_URL, AUTH_DESKTOP_CLIENT, AUTH_REDIRECT_URI, WEBSITE_URL } from '@/config/constants';
import { computeCodeChallenge, generateCodeVerifier, generateState } from '@/auth/pkce';
import type {
  AuthExchangeResult,
  AuthProvider,
  AuthSession,
  BackendMembershipSnapshot,
  BackendUserInfo,
  MembershipInfo,
  MembershipTier,
  PendingPkceSession,
} from '@/auth/types';

interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

interface DesktopTokenResponse {
  userInfo: BackendUserInfo;
  membership?: BackendMembershipSnapshot;
  expires_in?: number;
  expires_at?: number;
}

interface IndexResponse {
  userInfo?: BackendUserInfo;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: number,
  ) {
    super(message);
  }
}

function apiBaseUrl(): string {
  return API_BASE_URL.replace(/\/$/, '');
}

function assetUrl(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  const origin = apiBaseUrl().replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!payload) {
    throw new AuthApiError('network_error', response.status, 0);
  }
  if (!response.ok || Number(payload.code) !== 1) {
    throw new AuthApiError(payload.msg || 'request_failed', response.status, Number(payload.code));
  }
  return payload.data;
}

function normalizeProvider(provider?: string): AuthProvider {
  const upper = provider?.toUpperCase();
  if (upper === 'WECHAT' || upper === 'GOOGLE' || upper === 'GITHUB' || upper === 'EMAIL') {
    return upper;
  }
  return 'EMAIL';
}

function normalizeTier(tier?: string): MembershipTier {
  if (tier === 'pro' || tier === 'lifetime') {
    return tier;
  }
  return 'free';
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

function mapMembership(snapshot?: BackendMembershipSnapshot): MembershipInfo {
  const tier = normalizeTier(snapshot?.tier);
  return {
    tier,
    tierLabel: tier === 'lifetime' ? 'Lifetime' : tier === 'pro' ? 'Pro' : 'Free',
    isActive: Boolean(snapshot?.is_active),
    expiresAt: normalizeExpiresAt(snapshot?.expires_at),
  };
}

function mapUser(userInfo: BackendUserInfo): AuthExchangeResult['user'] {
  return {
    id: String(userInfo.id || ''),
    nickname: String(userInfo.nickname || userInfo.username || userInfo.email || 'Tooliva User'),
    provider: normalizeProvider(userInfo.provider),
    email: userInfo.email ? String(userInfo.email) : undefined,
    avatar: assetUrl(userInfo.avatar ? String(userInfo.avatar) : undefined),
  };
}

function tokenExpiresAt(data: DesktopTokenResponse): string {
  if (data.expires_at) {
    return new Date(Number(data.expires_at) * 1000).toISOString();
  }
  return new Date(Date.now() + Number(data.expires_in || 0) * 1000).toISOString();
}

export function isAuthInvalidError(error: unknown): boolean {
  if (!(error instanceof AuthApiError)) {
    return false;
  }
  return error.status === 401 || error.status === 409 || error.code === 303;
}

export class AuthService {
  buildAuthorizeUrl(session: PendingPkceSession, codeChallenge: string): string {
    const url = new URL('/desktop-auth', WEBSITE_URL);
    url.searchParams.set('client', AUTH_DESKTOP_CLIENT);
    url.searchParams.set('redirect_uri', AUTH_REDIRECT_URI);
    url.searchParams.set('state', session.state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async createPendingSession(): Promise<{ session: PendingPkceSession; authorizeUrl: string }> {
    const session: PendingPkceSession = {
      state: generateState(),
      codeVerifier: generateCodeVerifier(),
      loginStartTime: Date.now(),
    };
    const codeChallenge = await computeCodeChallenge(session.codeVerifier);
    const authorizeUrl = this.buildAuthorizeUrl(session, codeChallenge);
    return { session, authorizeUrl };
  }

  async exchangeCodeForToken(code: string, codeVerifier: string, expectedState: string): Promise<AuthExchangeResult> {
    const data = await requestJson<DesktopTokenResponse>('/social/desktopToken', {
      method: 'POST',
      body: JSON.stringify({
        client: AUTH_DESKTOP_CLIENT,
        redirect_uri: AUTH_REDIRECT_URI,
        code,
        state: expectedState,
        code_verifier: codeVerifier,
      }),
    });

    if (!data.userInfo?.token) {
      throw new Error('invalid_token_response');
    }

    return {
      user: mapUser(data.userInfo),
      membership: mapMembership(data.membership),
      tokens: {
        accessToken: String(data.userInfo.token),
        refreshToken: String(data.userInfo.refresh_token || ''),
        expiresAt: tokenExpiresAt(data),
      },
    };
  }

  async validateSession(session: AuthSession): Promise<AuthExchangeResult['user']> {
    const data = await requestJson<IndexResponse>('/index?requiredLogin=1', {
      headers: {
        'ba-user-token': session.tokens.accessToken,
      },
    });
    if (!data.userInfo?.id) {
      throw new AuthApiError('invalid_session', 200, 303);
    }
    return mapUser(data.userInfo);
  }
}

export const authService = new AuthService();
