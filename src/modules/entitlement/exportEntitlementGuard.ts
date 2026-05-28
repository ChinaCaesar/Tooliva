import { API_BASE_URL, AUTH_SESSION_STORAGE_KEY } from "@/config/constants";
import { AuthApiError, isAuthInvalidError } from "@/auth/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useEntitlementUpgradeDialogStore } from "@/stores/entitlement-upgrade-dialog.store";
import type { Router } from "vue-router";

interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

interface EntitlementDecisionResponse {
  allowed?: boolean;
  reason?: string;
  remaining?: number;
  reset_at?: number;
}

export interface ExportEntitlementDecision {
  allowed: boolean;
  reason: "ok" | "no_entitlement" | "service_error";
  backendReason?: string;
}

interface ConsumePayload {
  tool: string;
  amount: number;
  sourceId: string;
  idempotencyKey: string;
}

function getApiBaseUrl(): string {
  const explicit = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  return API_BASE_URL.replace(/\/$/, "");
}

function getAuthHeaders(): HeadersInit {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return { Accept: "application/json" };
    }
    const parsed = JSON.parse(raw) as { tokens?: { accessToken?: string } };
    const token = parsed?.tokens?.accessToken?.trim();
    if (!token) {
      return { Accept: "application/json" };
    }
    return {
      Accept: "application/json",
      "ba-user-token": token
    };
  } catch {
    return { Accept: "application/json" };
  }
}

export async function checkExportEntitlement(toolKey: string): Promise<ExportEntitlementDecision> {
  const authStore = useAuthStore();
  try {
    const query = new URLSearchParams({
      tool: toolKey,
      amount: "1"
    });
    const response = await fetch(`${getApiBaseUrl()}/entitlement/check?${query.toString()}`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<EntitlementDecisionResponse> | null;
    if (!payload) {
      return { allowed: false, reason: "service_error" };
    }
    if (!response.ok || Number(payload.code) !== 1) {
      const error = new AuthApiError(payload.msg || "request_failed", response.status, Number(payload.code));
      if (isAuthInvalidError(error)) {
        authStore.logout();
        return { allowed: false, reason: "no_entitlement", backendReason: payload.msg };
      }
      return { allowed: false, reason: "service_error", backendReason: payload.msg };
    }
    if (payload.data?.allowed) {
      return { allowed: true, reason: "ok" };
    }
    if (!authStore.isLoggedIn) {
      return { allowed: false, reason: "no_entitlement", backendReason: payload.data?.reason };
    }
    return { allowed: false, reason: "no_entitlement", backendReason: payload.data?.reason };
  } catch {
    return { allowed: false, reason: "service_error" };
  }
}

export async function consumeExportEntitlement(payload: ConsumePayload): Promise<ExportEntitlementDecision> {
  const authStore = useAuthStore();
  try {
    const response = await fetch(`${getApiBaseUrl()}/entitlement/consume`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tool: payload.tool,
        amount: payload.amount,
        source_id: payload.sourceId,
        idempotency_key: payload.idempotencyKey
      })
    });
    const raw = (await response.json().catch(() => null)) as ApiEnvelope<EntitlementDecisionResponse> | null;
    if (!raw) {
      return { allowed: false, reason: "service_error" };
    }
    if (response.ok && Number(raw.code) === 1 && raw.data?.allowed) {
      return { allowed: true, reason: "ok" };
    }
    const error = new AuthApiError(raw.msg || "request_failed", response.status, Number(raw.code));
    if (isAuthInvalidError(error)) {
      authStore.logout();
      return { allowed: false, reason: "no_entitlement", backendReason: raw.msg || raw.data?.reason };
    }
    if (response.status === 429 || raw.data?.reason === "quota_exceeded" || raw.data?.reason === "guest_quota_exceeded") {
      return { allowed: false, reason: "no_entitlement", backendReason: raw.msg || raw.data?.reason };
    }
    return { allowed: false, reason: "service_error", backendReason: raw.msg || raw.data?.reason };
  } catch {
    return { allowed: false, reason: "service_error" };
  }
}

export async function promptEntitlementUpgrade(
  router: Router,
  t: (key: string) => string,
  toolKey: string
): Promise<void> {
  const dialogStore = useEntitlementUpgradeDialogStore();
  const confirmed = await dialogStore.show({
    title: t("common.entitlement.upgradeDialogTitle"),
    message: t("common.entitlement.upgradeDialogMessage"),
    confirmLabel: t("common.entitlement.upgradeConfirm"),
    cancelLabel: t("common.entitlement.upgradeCancel")
  });
  if (!confirmed) return;
  await router.push({ path: "/membership", query: { source: "export_guard", tool: toolKey } });
}

export async function promptEntitlementLogin(t: (key: string) => string): Promise<void> {
  const dialogStore = useEntitlementUpgradeDialogStore();
  const authStore = useAuthStore();
  const confirmed = await dialogStore.show({
    title: t("common.entitlement.loginDialogTitle"),
    message: t("common.entitlement.needLogin"),
    confirmLabel: t("common.entitlement.loginDialogConfirm"),
    cancelLabel: t("common.entitlement.loginDialogCancel")
  });
  if (!confirmed) return;
  try {
    await authStore.startDesktopLogin();
  } catch {
    // 登录页拉起失败时保持静默，由统一登录入口继续兜底通知。
  }
}
