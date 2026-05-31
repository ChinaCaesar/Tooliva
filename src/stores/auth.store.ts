import { defineStore } from 'pinia';
import { AuthApiError, authService, isAuthInvalidError } from '@/auth/auth.service';
import { parseAuthCallbackUrl } from '@/auth/deep-link';
import type { AuthSession, AuthUser, MembershipInfo, PendingPkceSession, TokenPair } from '@/auth/types';
import {
  AUTH_LOGIN_TIMEOUT_MS,
  AUTH_PKCE_STORAGE_KEY,
  AUTH_SESSION_STORAGE_KEY,
} from '@/config/constants';
import { openExternalUrl } from '@/utils/openExternalUrl';
import { focusMainWindow } from '@/utils/windowControl';
import { useNotificationStore } from '@/stores/notification.store';

const AUTH_CALLBACK_DEDUPE_MS = 60_000;
const handledAuthCallbacks = new Map<string, number>();

function authCallbackId(state: string, code: string): string {
  return `${state}:${code}`;
}

function wasAuthCallbackHandled(id: string): boolean {
  const handledAt = handledAuthCallbacks.get(id);
  return handledAt !== undefined && Date.now() - handledAt < AUTH_CALLBACK_DEDUPE_MS;
}

function markAuthCallbackHandled(id: string): void {
  handledAuthCallbacks.set(id, Date.now());
}

interface AuthState {
  user: AuthUser | null;
  membership: MembershipInfo | null;
  tokens: TokenPair | null;
  loggedInAt: string | null;
  pendingPkce: PendingPkceSession | null;
  hydrated: boolean;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function removeKey(key: string): void {
  localStorage.removeItem(key);
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    membership: null,
    tokens: null,
    loggedInAt: null,
    pendingPkce: null,
    hydrated: false,
  }),

  getters: {
    isLoggedIn: (state) => state.user !== null,
  },

  actions: {
    hydrate(): void {
      const session = readJson<AuthSession>(AUTH_SESSION_STORAGE_KEY);
      if (session?.user) {
        this.user = session.user;
        this.membership = session.membership;
        this.tokens = session.tokens;
        this.loggedInAt = session.loggedInAt;
      }
      this.pendingPkce = readJson<PendingPkceSession>(AUTH_PKCE_STORAGE_KEY);
      this.hydrated = true;
    },

    async validateStoredSession(): Promise<void> {
      if (!this.user || !this.tokens || !this.loggedInAt) {
        return;
      }

      if (this.tokens.expiresAt && new Date(this.tokens.expiresAt).getTime() <= Date.now()) {
        this.logout();
        return;
      }

      const session: AuthSession = {
        user: this.user,
        membership: this.membership ?? {
          tier: 'free',
          tierLabel: 'Free',
          isActive: false,
          expiresAt: null,
        },
        tokens: this.tokens,
        loggedInAt: this.loggedInAt,
      };

      try {
        this.user = await authService.validateSession(session);
        this.persistSession();
      } catch (error) {
        if (isAuthInvalidError(error)) {
          this.logout();
        }
      }
    },

    persistSession(): void {
      if (!this.user || !this.membership || !this.tokens || !this.loggedInAt) {
        removeKey(AUTH_SESSION_STORAGE_KEY);
        return;
      }
      const session: AuthSession = {
        user: this.user,
        membership: this.membership,
        tokens: this.tokens,
        loggedInAt: this.loggedInAt,
      };
      writeJson(AUTH_SESSION_STORAGE_KEY, session);
    },

    persistPendingPkce(): void {
      if (!this.pendingPkce) {
        removeKey(AUTH_PKCE_STORAGE_KEY);
        return;
      }
      writeJson(AUTH_PKCE_STORAGE_KEY, this.pendingPkce);
    },

    clearPendingPkce(): void {
      this.pendingPkce = null;
      removeKey(AUTH_PKCE_STORAGE_KEY);
    },

    async startDesktopLogin(): Promise<void> {
      const { session, authorizeUrl } = await authService.createPendingSession();
      this.pendingPkce = session;
      this.persistPendingPkce();

      // OAuth 协议级 URL 例外：authorizeUrl 由 auth.service 按 OAuth/PKCE 协议构造，
      // 已包含 client_id/redirect_uri/PKCE challenge 等参数，不经 useExternalNavigate
      // 走"分析参数 + Toast"通道，避免污染 OAuth 请求 query。
      // 见 openspec/specs/desktop-website-bridge/spec.md「统一外跳 composable 与过渡 Toast 契约」。
      await openExternalUrl(authorizeUrl);
    },

    async handleAuthCallback(rawUrl: string): Promise<boolean> {
      const notificationStore = useNotificationStore();
      const parsed = parseAuthCallbackUrl(rawUrl);
      if (!parsed) {
        return false;
      }

      const callbackId = authCallbackId(parsed.state, parsed.code);

      if (wasAuthCallbackHandled(callbackId)) {
        await focusMainWindow();
        return true;
      }

      const pending = this.pendingPkce ?? readJson<PendingPkceSession>(AUTH_PKCE_STORAGE_KEY);
      if (!pending) {
        if (this.isLoggedIn) {
          markAuthCallbackHandled(callbackId);
          await focusMainWindow();
          return true;
        }
        return false;
      }

      if (Date.now() - pending.loginStartTime > AUTH_LOGIN_TIMEOUT_MS) {
        this.clearPendingPkce();
        notificationStore.showNotification({
          title: '登录失败',
          message: '登录请求已超时，请重新发起登录。',
          tone: 'error',
          durationMs: 5000,
        });
        return false;
      }

      if (parsed.state !== pending.state) {
        notificationStore.showNotification({
          title: '登录失败',
          message: 'state 校验失败，授权请求可能被篡改。',
          tone: 'error',
          durationMs: 5000,
        });
        return false;
      }

      try {
        const result = await authService.exchangeCodeForToken(
          parsed.code,
          pending.codeVerifier,
          pending.state,
        );
        this.user = result.user;
        this.membership = result.membership;
        this.tokens = result.tokens;
        this.loggedInAt = new Date().toISOString();
        this.persistSession();
        this.clearPendingPkce();
        markAuthCallbackHandled(callbackId);

        await focusMainWindow();

        notificationStore.showNotification({
          title: '登录成功',
          message: `欢迎回来，${result.user.nickname}`,
          tone: 'success',
          durationMs: 4000,
        });
        return true;
      } catch (error) {
        const code = error instanceof Error ? error.message : 'unknown';
        const messages: Record<string, string> = {
          invalid_code: '授权码无效，请重新登录。',
          code_expired: '授权码已过期，请重新登录。',
          state_mismatch: 'state 校验失败。',
          pkce_mismatch: 'PKCE 校验失败。',
          invalid_token_response: '账号服务未返回有效登录凭证，请重新登录。',
          network_error: '无法连接账号服务，请检查网络后重试。',
          request_failed: '账号服务请求失败，请稍后重试。',
          'Failed to fetch': '无法连接账号服务，请检查网络后重试。',
        };
        const fallbackMessage =
          error instanceof AuthApiError
            ? (messages[error.message] ?? error.message)
            : (messages[code] ?? '无法完成登录，请重试。');
        notificationStore.showNotification({
          title: '登录失败',
          message: fallbackMessage,
          tone: 'error',
          durationMs: 5000,
        });
        return false;
      }
    },

    logout(): void {
      this.user = null;
      this.membership = null;
      this.tokens = null;
      this.loggedInAt = null;
      this.clearPendingPkce();
      removeKey(AUTH_SESSION_STORAGE_KEY);
    },
  },
});
