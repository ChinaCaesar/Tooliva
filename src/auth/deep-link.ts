import { AUTH_REDIRECT_URI } from '@/config/constants';

export interface AuthCallbackParams {
  code: string;
  state: string;
}

export function parseAuthCallbackUrl(rawUrl: string): AuthCallbackParams | null {
  try {
    const normalized = rawUrl.includes('://') ? rawUrl : `${AUTH_REDIRECT_URI}?${rawUrl}`;
    const url = new URL(normalized);
    if (!url.protocol.startsWith('tooliva')) {
      return null;
    }
    if (!url.pathname.endsWith('/callback') && url.hostname !== 'auth') {
      // tooliva://auth/callback → hostname auth, pathname /callback
    }
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) {
      return null;
    }
    return { code, state };
  } catch {
    return null;
  }
}
