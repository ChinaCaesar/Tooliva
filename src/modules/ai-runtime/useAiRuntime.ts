import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  tauriClient,
  type AiRuntimeEnvironmentPayload,
  type AiRuntimeLocalStatusPayload,
  type AiRuntimeProgressPayload,
  type AiRuntimeStatus,
  type LocalAiRuntimePathsPayload
} from "@/bridge/tauriClient";
import { AI_RUNTIME_ENABLED, AI_RUNTIME_MIN_FREE_DISK_GB } from "@/config/constants";

const status = ref<AiRuntimeStatus>(
  AI_RUNTIME_ENABLED ? ("CHECKING" as AiRuntimeStatus) : ("DISABLED" as AiRuntimeStatus)
);
const localStatus = ref<AiRuntimeLocalStatusPayload | null>(null);
const localPaths = ref<LocalAiRuntimePathsPayload | null>(null);
const environment = ref<AiRuntimeEnvironmentPayload | null>(null);
const progress = ref<AiRuntimeProgressPayload | null>(null);
const error = ref("");
let installProgressTimer: number | null = null;

export function useAiRuntime() {
  const { t } = useI18n();
  const isReady = computed(() => status.value === "INSTALLED" || status.value === "UPDATE_AVAILABLE");
  const versionLabel = computed(() => localStatus.value?.currentVersion || "--");
  const installRequirements = computed(() => AI_RUNTIME_MIN_FREE_DISK_GB);

  const installLoadingMessages = computed(() => [
    t("aiEnhancement.installProgress.preparing"),
    t("aiEnhancement.installProgress.extracting"),
    t("aiEnhancement.installProgress.organizing"),
    t("aiEnhancement.installProgress.largePackage")
  ]);

  function stopInstallProgress(): void {
    if (installProgressTimer != null) {
      window.clearInterval(installProgressTimer);
      installProgressTimer = null;
    }
  }

  function startInstallProgress(): void {
    stopInstallProgress();
    const messages = installLoadingMessages.value;
    const totalSteps = messages.length;
    let index = 0;

    const updateProgress = (): void => {
      progress.value = {
        stage: "installing",
        downloadedBytes: 0,
        totalBytes: 0,
        percent: 0,
        bytesPerSecond: 0,
        message: messages[index]
      };
    };

    updateProgress();
    installProgressTimer = window.setInterval(() => {
      index = (index + 1) % totalSteps;
      updateProgress();
    }, 1200);
  }

  function getOfflineInstallMessage(): string {
    return t("aiEnhancement.installHintDefault");
  }

  async function refresh(): Promise<void> {
    if (!AI_RUNTIME_ENABLED) {
      status.value = "DISABLED";
      return;
    }

    error.value = "";

    try {
      const [nextLocalStatus, nextLocalPaths] = await Promise.all([
        tauriClient.checkAiRuntimeStatus(),
        tauriClient.getLocalAiRuntimePaths()
      ]);

      localStatus.value = nextLocalStatus;
      localPaths.value = nextLocalPaths;
      const runtimeInstalled = nextLocalStatus.installed && nextLocalStatus.available;
      if (runtimeInstalled) {
        status.value = "INSTALLED";
        return;
      }

      environment.value = null;
      status.value = "READY_TO_INSTALL";
      error.value = getOfflineInstallMessage();
    } catch (err) {
      status.value = "FAILED";
      error.value = err instanceof Error ? err.message : String(err);
    }
  }

  async function checkEnvironment(): Promise<AiRuntimeEnvironmentPayload> {
    const nextEnvironment = await tauriClient.checkAiEnvironment(installRequirements.value);
    environment.value = nextEnvironment;

    if (!nextEnvironment.allowed) {
      status.value = "ENV_NOT_SUPPORTED";
    } else if (status.value === "ENV_NOT_SUPPORTED" || status.value === "FAILED" || status.value === "CHECKING") {
      status.value = "READY_TO_INSTALL";
    }

    return nextEnvironment;
  }

  async function installOrUpdate(packagePath?: string): Promise<void> {
    if (!packagePath) {
      throw new Error(t("aiEnhancement.errors.selectPackageFirst"));
    }

    const nextEnvironment = await checkEnvironment();
    if (!nextEnvironment.allowed) {
      throw new Error(nextEnvironment.reasons[0] || t("aiEnhancement.errors.envNotSupported"));
    }

    error.value = "";
    status.value = "INSTALLING";
    startInstallProgress();

    try {
      await tauriClient.installLocalAiRuntimePackage(packagePath);
      stopInstallProgress();
      await refresh();
      status.value = "INSTALLED";
    } catch (err) {
      stopInstallProgress();
      status.value = "FAILED";
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  async function removeRuntime(): Promise<void> {
    await tauriClient.removeAiRuntime();
    localStatus.value = null;
    localPaths.value = null;
    environment.value = null;
    stopInstallProgress();
    progress.value = null;
    status.value = "NOT_INSTALLED";
  }

  async function openDirectory(target: "runtime" | "models"): Promise<void> {
    await tauriClient.openLocalAiRuntimeDirectory(target);
  }

  return {
    status,
    localStatus,
    localPaths,
    environment,
    progress,
    error,
    isReady,
    versionLabel,
    refresh,
    checkEnvironment,
    openDirectory,
    installOrUpdate,
    removeRuntime
  };
}
