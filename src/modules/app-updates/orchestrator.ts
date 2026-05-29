import { isTauri } from "@tauri-apps/api/core";
import { localStorageService } from "@/storage/localStorage";
import type { AppLanguage, UserSettings } from "@/types/settings";
import { checkDesktopAppUpdate, type AppUpdateCheckResult } from "@/modules/app-updates/api";

const AUTO_UPDATE_META_KEY = "desktop-toolbox:auto-update-meta";

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
  phase: "checking" | "downloading" | "installing" | "restarting";
  downloadedBytes?: number;
  totalBytes?: number;
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

function toUpdateErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (/permission|denied/i.test(message)) return "permission_denied";
  if (/plugin|command .* not found|not configured|unavailable/i.test(message)) return "permission_denied";
  if (/network|fetch|timeout/i.test(message)) return "network_error";
  if (/signature|pubkey|verify|metadata/i.test(message)) return "metadata_invalid";
  if (/no update|up to date/i.test(message)) return "no_update";
  return "install_failed";
}

export async function installUpdateWithTauri(
  onProgress?: (payload: InstallProgressPayload) => void,
): Promise<void> {
  if (!isTauri()) {
    throw new Error("not_tauri");
  }

  onProgress?.({ phase: "checking" });
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) {
    throw new Error("no_update");
  }

  let hasDownloadProgress = false;
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        hasDownloadProgress = true;
        onProgress?.({
          phase: "downloading",
          totalBytes: undefined,
          downloadedBytes: 0,
        });
        break;
      case "Progress":
        hasDownloadProgress = true;
        onProgress?.({
          phase: "downloading",
          totalBytes: undefined,
          downloadedBytes: event.data.chunkLength,
        });
        break;
      case "Finished":
        onProgress?.({ phase: "installing" });
        break;
      default:
        break;
    }
  });

  if (!hasDownloadProgress) {
    onProgress?.({ phase: "installing" });
  }
  onProgress?.({ phase: "restarting" });
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

export function mapUpdateInstallError(error: unknown): string {
  return toUpdateErrorMessage(error);
}
