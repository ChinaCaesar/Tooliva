import { isTauri } from "@tauri-apps/api/core";
import { exit } from "@tauri-apps/plugin-process";
import { tauriClient } from "@/bridge/tauriClient";
import { localStorageService } from "@/storage/localStorage";
import type { AppLanguage, UserSettings } from "@/types/settings";
import { checkDesktopAppUpdate, type AppUpdateCheckResult } from "@/modules/app-updates/api";

const AUTO_UPDATE_META_KEY = "tooliva:auto-update-meta";

type UpdateTrigger = "auto" | "manual";

interface AutoUpdateMeta {
  lastAutoCheckedAt?: string;
  lastPromptDate?: string;
}

export interface UpdateOrchestratorResult {
  status: "ok" | "skipped";
  reason?: "auto_disabled" | "frequency_limited" | "auto_prompt_throttled";
  result?: AppUpdateCheckResult;
}

export interface InstallProgressPayload {
  phase: "checking" | "downloading" | "launching" | "done";
  downloadedBytes?: number;
  totalBytes?: number;
}

export type UpdateInstallAction =
  | { type: "no_update" }
  | { type: "dev_check_only" }
  | { type: "unsupported"; reason: "not_tauri" | "missing_download_url" }
  | { type: "in_app_download_install"; downloadUrl: string };

export interface UpdateInstallExecutionResult {
  type: "in_app_download_install";
  downloadUrl: string;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readMeta(): AutoUpdateMeta {
  return localStorageService.get<AutoUpdateMeta>(AUTO_UPDATE_META_KEY, {});
}

function writeMeta(meta: AutoUpdateMeta): void {
  localStorageService.set(AUTO_UPDATE_META_KEY, meta);
}

function shouldRunAutoCheckFrequency(checkFrequency: string, meta: AutoUpdateMeta): boolean {
  if (checkFrequency === "startup") return true;
  if (!meta.lastAutoCheckedAt) return true;

  const last = new Date(meta.lastAutoCheckedAt).getTime();
  if (!Number.isFinite(last) || Number.isNaN(last)) return true;
  const now = Date.now();
  const elapsedMs = now - last;
  const oneDay = 24 * 60 * 60 * 1000;

  if (checkFrequency === "daily") {
    return elapsedMs >= oneDay;
  }
  if (checkFrequency === "weekly") {
    return elapsedMs >= oneDay * 7;
  }
  return true;
}

export async function runDesktopUpdateCheck(options: {
  trigger: UpdateTrigger;
  settings: Pick<UserSettings, "autoCheckUpdates" | "checkFrequency" | "updateMethod">;
  currentVersion: string;
  locale: AppLanguage;
}): Promise<UpdateOrchestratorResult> {
  const meta = readMeta();
  const isAuto = options.trigger === "auto";

  if (isAuto && !options.settings.autoCheckUpdates) {
    return { status: "skipped", reason: "auto_disabled" };
  }
  if (isAuto && !shouldRunAutoCheckFrequency(options.settings.checkFrequency, meta)) {
    return { status: "skipped", reason: "frequency_limited" };
  }

  const result = await checkDesktopAppUpdate({
    currentVersion: options.currentVersion,
    channel: options.settings.updateMethod,
    locale: options.locale,
  });

  if (isAuto) {
    writeMeta({ ...meta, lastAutoCheckedAt: new Date().toISOString() });
  }

  if (isAuto && result.available && meta.lastPromptDate === todayKey()) {
    return { status: "skipped", reason: "auto_prompt_throttled", result };
  }

  return { status: "ok", result };
}

export function markAutoUpdatePromptShown(): void {
  const meta = readMeta();
  writeMeta({ ...meta, lastPromptDate: todayKey() });
}

export function resolveUpdateInstallAction(result: AppUpdateCheckResult | null | undefined): UpdateInstallAction {
  if (!result?.available) {
    return { type: "no_update" };
  }
  if (import.meta.env.DEV) {
    return { type: "dev_check_only" };
  }
  if (!isTauri()) {
    return { type: "unsupported", reason: "not_tauri" };
  }
  if (!result.downloadUrl) {
    return { type: "unsupported", reason: "missing_download_url" };
  }
  return {
    type: "in_app_download_install",
    downloadUrl: result.downloadUrl,
  };
}

function toUpdateErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (/missing_download_url/i.test(message)) return "missing_download_url";
  if (/not_tauri/i.test(message)) return "not_tauri";
  if (/dev_check_only|dev_environment/i.test(message)) return "dev_environment";
  if (/installer_invalid|downloaded_file_is_not_a_windows_executable/i.test(message)) return "download_corrupt";
  if (/installer_launch_failed|spawn/i.test(message)) return "install_failed";
  if (/installer_invalid|downloaded_file_is_not/i.test(message)) return "download_corrupt";
  if (/incomplete_download/i.test(message)) return "network_error";
  if (/permission|denied/i.test(message)) return "permission_denied";
  if (/plugin|command .* not found|not configured|unavailable/i.test(message)) return "permission_denied";
  if (/network|fetch|timeout/i.test(message)) return "network_error";
  if (/signature|pubkey|verify|metadata/i.test(message)) return "metadata_invalid";
  if (/no update|up to date/i.test(message)) return "no_update";
  return "install_failed";
}

export async function executeUpdateInstall(
  result: AppUpdateCheckResult,
  onProgress?: (payload: InstallProgressPayload) => void,
): Promise<UpdateInstallExecutionResult> {
  const action = resolveUpdateInstallAction(result);
  if (action.type === "no_update") {
    throw new Error("no_update");
  }
  if (action.type === "dev_check_only") {
    throw new Error("dev_environment");
  }
  if (action.type === "unsupported") {
    throw new Error(action.reason);
  }

  onProgress?.({ phase: "checking" });
  await tauriClient.downloadAndPrepareUpdateInstaller(
    {
      downloadUrl: action.downloadUrl,
      version: result.latestVersion,
    },
    (payload) => {
      onProgress?.({
        phase: "downloading",
        downloadedBytes: payload.downloadedBytes,
        totalBytes: payload.totalBytes,
      });
    },
  );
  onProgress?.({ phase: "launching" });
  await tauriClient.launchPreparedUpdateInstaller();
  onProgress?.({ phase: "done" });
  await exit(0);
  return action;
}

export function mapUpdateInstallError(error: unknown): string {
  return toUpdateErrorMessage(error);
}
