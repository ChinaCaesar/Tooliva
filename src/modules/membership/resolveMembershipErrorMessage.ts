import { AuthApiError, isAuthInvalidError } from "@/auth/auth.service";

const TECHNICAL_ERROR_CODES = new Set([
  "network_error",
  "request_failed",
  "Failed to fetch",
  "Load failed",
]);

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.trim();
  if (!message) {
    return false;
  }
  if (TECHNICAL_ERROR_CODES.has(message)) {
    return true;
  }
  return /network|fetch|timeout|aborted|failed to fetch|load failed/i.test(message);
}

function isTechnicalMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return true;
  }
  if (TECHNICAL_ERROR_CODES.has(trimmed)) {
    return true;
  }
  return /^[a-z0-9_]+$/i.test(trimmed);
}

export function resolveMembershipErrorMessage(
  error: unknown,
  fallbackKey: string,
  t: (key: string) => string,
): string {
  if (isNetworkError(error)) {
    return t("pages.membershipDesktop.errors.networkError");
  }

  if (error instanceof AuthApiError && isAuthInvalidError(error)) {
    return t("pages.membershipDesktop.errors.sessionExpired");
  }

  if (error instanceof AuthApiError) {
    const message = error.message.trim();
    if (message && !isTechnicalMessage(message)) {
      return message;
    }
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message && !isTechnicalMessage(message)) {
      return message;
    }
  }

  return t(fallbackKey);
}
