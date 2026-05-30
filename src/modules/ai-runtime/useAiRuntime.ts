import { computed, onBeforeUnmount, ref } from "vue";
import {
  tauriClient,
  type AiRuntimeEnvironmentPayload,
  type AiRuntimeLocalStatusPayload,
  type AiRuntimeManifestPayload,
  type AiRuntimeProgressPayload,
  type AiRuntimeStatus
} from "@/bridge/tauriClient";
import {
  AI_RUNTIME_ENABLED,
  AI_RUNTIME_MANIFEST_URL,
  AI_RUNTIME_MIN_FREE_DISK_GB
} from "@/config/constants";

export function useAiRuntime() {
  const status = ref<AiRuntimeStatus>(AI_RUNTIME_ENABLED ? "CHECKING" : "DISABLED");
  const localStatus = ref<AiRuntimeLocalStatusPayload | null>(null);
  const environment = ref<AiRuntimeEnvironmentPayload | null>(null);
  const manifest = ref<AiRuntimeManifestPayload | null>(null);
  const progress = ref<AiRuntimeProgressPayload | null>(null);
  const error = ref("");
  let disposeProgress: (() => void) | null = null;

  const isReady = computed(() => status.value === "INSTALLED" || status.value === "UPDATE_AVAILABLE");
  const versionLabel = computed(() => localStatus.value?.currentVersion || manifest.value?.runtimeVersion || "--");
  const hasManifestSource = computed(() => Boolean(AI_RUNTIME_MANIFEST_URL));

  function getMissingDownloadSourceMessage(): string {
    return "当前电脑满足 AI 组件安装条件，但当前版本还未配置一键下载源。升级到支持一键下载相关模块的版本后即可安装。";
  }

  function getManifestUnavailableMessage(): string {
    return "当前电脑满足 AI 组件安装条件，但暂时无法获取 AI 组件下载信息。请检查网络，或升级到支持一键下载相关模块的版本后重试。";
  }

  async function refresh(forceManifest = false): Promise<void> {
    if (!AI_RUNTIME_ENABLED) {
      status.value = "DISABLED";
      return;
    }

    status.value = "CHECKING";
    error.value = "";

    try {
      const [nextLocalStatus, nextEnvironment] = await Promise.all([
        tauriClient.checkAiRuntimeStatus(),
        tauriClient.checkAiEnvironment(AI_RUNTIME_MIN_FREE_DISK_GB)
      ]);

      localStatus.value = nextLocalStatus;
      environment.value = nextEnvironment;

      const runtimeInstalled = nextLocalStatus.installed && nextLocalStatus.available;
      const environmentAllowed = nextEnvironment.allowed;

      if (runtimeInstalled) {
        status.value = "INSTALLED";
      } else if (!environmentAllowed) {
        status.value = "ENV_NOT_SUPPORTED";
      } else {
        status.value = "READY_TO_INSTALL";
      }

      if (!hasManifestSource.value) {
        manifest.value = null;
        if (!runtimeInstalled && environmentAllowed) {
          error.value = getMissingDownloadSourceMessage();
        }
        return;
      }

      const shouldFetchManifest = forceManifest || !manifest.value;
      if (!shouldFetchManifest) return;

      try {
        manifest.value = await tauriClient.fetchAiRuntimeManifest(AI_RUNTIME_MANIFEST_URL);
        if (
          runtimeInstalled
          && nextLocalStatus.currentVersion
          && manifest.value.runtimeVersion !== nextLocalStatus.currentVersion
        ) {
          status.value = "UPDATE_AVAILABLE";
        }
      } catch (manifestError) {
        manifest.value = null;
        if (!runtimeInstalled && environmentAllowed) {
          error.value = manifestError instanceof Error
            ? manifestError.message
            : String(manifestError || getManifestUnavailableMessage());
        }
        console.warn("Failed to fetch AI runtime manifest", manifestError);
      }
    } catch (err) {
      status.value = "FAILED";
      error.value = err instanceof Error ? err.message : String(err);
    }
  }

  async function ensureManifest(): Promise<AiRuntimeManifestPayload> {
    if (manifest.value) return manifest.value;
    if (!hasManifestSource.value) {
      throw new Error(getMissingDownloadSourceMessage());
    }
    await refresh(true);
    if (!manifest.value) {
      throw new Error(error.value || getManifestUnavailableMessage());
    }
    return manifest.value;
  }

  async function installOrUpdate(): Promise<void> {
    const nextManifest = await ensureManifest();

    if (!disposeProgress) {
      disposeProgress = await tauriClient.onAiRuntimeProgress((payload) => {
        progress.value = payload;
        if (payload.stage === "downloading") status.value = "DOWNLOADING";
        if (payload.stage === "verifying") status.value = "VERIFYING";
        if (payload.stage === "installing") status.value = "INSTALLING";
      });
    }

    error.value = "";
    progress.value = null;

    try {
      await tauriClient.updateAiRuntime(nextManifest);
      await refresh(true);
      status.value = "INSTALLED";
    } catch (err) {
      status.value = "FAILED";
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  async function removeRuntime(): Promise<void> {
    await tauriClient.removeAiRuntime();
    localStatus.value = null;
    progress.value = null;
    status.value = "NOT_INSTALLED";
  }

  onBeforeUnmount(() => {
    if (disposeProgress) {
      disposeProgress();
      disposeProgress = null;
    }
  });

  return {
    status,
    localStatus,
    environment,
    manifest,
    progress,
    error,
    isReady,
    versionLabel,
    hasManifestSource,
    refresh,
    ensureManifest,
    installOrUpdate,
    removeRuntime
  };
}
