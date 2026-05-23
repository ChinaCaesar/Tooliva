import { AUTH_DESKTOP_CLIENT, AUTH_REDIRECT_URI, WEBSITE_URL } from '@/config/constants';
import { createMockExchangeResult } from '@/auth/mock-auth';
import { computeCodeChallenge, decodeMockAuthorizationCode, generateCodeVerifier, generateState } from '@/auth/pkce';
import type { AuthExchangeResult, PendingPkceSession } from '@/auth/types';

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
    const payload = decodeMockAuthorizationCode(code);
    if (!payload) {
      throw new Error('invalid_code');
    }
    if (payload.exp < Date.now()) {
      throw new Error('code_expired');
    }
    if (payload.state !== expectedState) {
      throw new Error('state_mismatch');
    }

    const challenge = await computeCodeChallenge(codeVerifier);
    if (challenge !== payload.codeChallenge) {
      throw new Error('pkce_mismatch');
    }

    return createMockExchangeResult(payload.provider);
  }
}

export const authService = new AuthService();
