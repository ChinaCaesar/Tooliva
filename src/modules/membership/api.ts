import { API_BASE_URL, AUTH_SESSION_STORAGE_KEY } from "@/config/constants";
import { AuthApiError, isAuthInvalidError } from "@/auth/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export interface DesktopMembershipSnapshot {
  tier: string;
  is_active: boolean;
  expires_at: number;
  has_used_trial: boolean;
  subscription_no: string;
  channel_code: string;
  auto_renew_active: boolean;
  purchasable: Record<string, { ok: boolean; reason?: string }>;
}

export interface DesktopPricingPlan {
  plan_code: string;
  price_plan_id: number;
  title: string;
  subtitle: string;
  badge: string;
  features: string[];
  billing_period: string;
  charge_mode: string;
  currency: string;
  amount: string;
  amount_minor: number;
  trial_days: number;
  supported_channels: string[];
}

interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

function getApiBaseUrl(): string {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const explicit = envBase?.trim();
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
      "ba-user-token": token,
    };
  } catch {
    return { Accept: "application/json" };
  }
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: getAuthHeaders(),
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!payload) {
    throw new Error("network_error");
  }
  if (!response.ok || Number(payload.code) !== 1) {
    const error = new AuthApiError(payload.msg || "request_failed", response.status, Number(payload.code));
    if (isAuthInvalidError(error)) {
      useAuthStore().logout();
    }
    throw error;
  }
  return payload.data;
}

export async function fetchDesktopPricingPlans(): Promise<DesktopPricingPlan[]> {
  const result = await requestJson<{ list: DesktopPricingPlan[] }>("/pricing/plans");
  return Array.isArray(result.list) ? result.list : [];
}

export async function fetchDesktopMembershipSnapshot(): Promise<DesktopMembershipSnapshot> {
  return requestJson<DesktopMembershipSnapshot>("/pricing/membership");
}
