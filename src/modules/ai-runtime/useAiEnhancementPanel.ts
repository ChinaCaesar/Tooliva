import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { useAiRuntime } from "@/modules/ai-runtime/useAiRuntime";
import { useAiModel } from "@/modules/ai-runtime/useAiModel";

const runtimeActionError = ref("");
const isImportingAiModel = ref(false);
const isReplacingRuntime = ref(false);
const isReplacingModel = ref(false);

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value < 10 && index > 0 ? value.toFixed(2) : value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function useAiEnhancementPanel() {
  const { t } = useI18n();
  const aiRuntime = useAiRuntime();
  const aiModel = useAiModel();

  const aiRuntimeStatus = aiRuntime.status;
  const aiRuntimeProgress = aiRuntime.progress;

  const hasInstalledAiRuntime = computed(
    () => aiRuntimeStatus.value === "INSTALLED" || aiRuntimeStatus.value === "UPDATE_AVAILABLE"
  );

  const aiRuntimeSimpleStatusText = computed(() =>
    hasInstalledAiRuntime.value
      ? t("aiEnhancement.simpleStatus.installed")
      : t("aiEnhancement.simpleStatus.notInstalled")
  );

  const aiRuntimeStatusText = computed(() => {
    const status = aiRuntime.status.value;
    const key = `aiEnhancement.runtimeStatus.${status}` as const;
    return t(key);
  });

  const aiInstallHint = computed(() => {
    if (runtimeActionError.value) return runtimeActionError.value;
    if (aiRuntime.environment.value?.reasons?.length) return aiRuntime.environment.value.reasons[0];
    if (aiRuntime.status.value === "READY_TO_INSTALL") {
      return aiRuntime.error.value || t("aiEnhancement.installHintDefault");
    }
    if (aiRuntime.error.value) return aiRuntime.error.value;
    return "";
  });

  const aiRuntimeRequirementsText = computed(() =>
    t("aiEnhancement.requirements", {
      os: t("aiEnhancement.requirementsOs"),
      memory: 8,
      disk: 8
    })
  );

  const canShowAiInstallAction = computed(
    () =>
      !hasInstalledAiRuntime.value &&
      !["CHECKING", "DOWNLOADING", "VERIFYING", "INSTALLING"].includes(aiRuntimeStatus.value)
  );

  const isLamaModelReady = computed(() => aiModel.isModelReady.value);
  const aiModelStatusText = computed(() =>
    isLamaModelReady.value ? t("aiEnhancement.modelStatus.ready") : t("aiEnhancement.modelStatus.notImported")
  );
  const isRuntimeBusy = computed(() => ["DOWNLOADING", "VERIFYING", "INSTALLING"].includes(aiRuntimeStatus.value));

  const aiProgressPercent = computed(() => aiRuntime.progress.value?.percent ?? 0);
  const aiDownloadSpeedLabel = computed(() => formatBytes(aiRuntime.progress.value?.bytesPerSecond ?? 0));
  const aiProgressSummaryLabel = computed(() => {
    const payload = aiRuntime.progress.value;
    if (!payload) return "--";
    return `${formatBytes(payload.downloadedBytes)} / ${formatBytes(payload.totalBytes)}`;
  });

  const runtimeDevice = computed(() => aiModel.modelStatus.value?.runtimeDevice || "");
  const torchVersion = computed(() => aiModel.modelStatus.value?.torchVersion || "");
  const modelsRoot = computed(() => aiModel.modelsRoot.value);
  const aiRuntimePath = computed(() => aiRuntime.localPaths.value?.currentRuntimePath || aiRuntime.localPaths.value?.runtimeRoot || "");
  const lamaModelPath = computed(() => aiModel.modelPath.value || aiRuntime.localPaths.value?.lamaModelPath || "");

  async function refreshStatus(onSynced?: () => void): Promise<void> {
    try {
      await aiRuntime.refresh();
      await aiModel.refresh();
      onSynced?.();
    } catch {
      onSynced?.();
    }
  }

  async function ensureRuntimeReady(): Promise<boolean> {
    await refreshStatus();
    if (aiRuntime.status.value !== "INSTALLED" && aiRuntime.status.value !== "UPDATE_AVAILABLE") {
      return false;
    }
    return true;
  }

  async function ensureModelReady(): Promise<void> {
    const status = await aiModel.refresh();
    if (!status.downloaded) {
      throw new Error(
        t("aiEnhancement.errors.modelMissing", { path: `${status.modelsRoot}\\lama\\` })
      );
    }
  }

  async function installRuntime(onSynced?: () => void): Promise<void> {
    try {
      runtimeActionError.value = "";
      const selected = await open({
        multiple: false,
        filters: [{ name: t("aiEnhancement.dialog.runtimePackage"), extensions: ["7z", "zip"] }]
      });
      if (!selected || Array.isArray(selected)) return;
      await aiRuntime.installOrUpdate(selected);
      await refreshStatus(onSynced);
    } catch (error) {
      runtimeActionError.value = error instanceof Error ? error.message : String(error);
    }
  }

  async function importModel(onSynced?: () => void): Promise<void> {
    try {
      runtimeActionError.value = "";
      isImportingAiModel.value = true;
      const selected = await open({
        multiple: false,
        filters: [{ name: t("aiEnhancement.dialog.lamaModel"), extensions: ["pt"] }]
      });
      if (!selected || Array.isArray(selected)) return;
      await aiModel.importModel(selected);
      await refreshStatus(onSynced);
    } catch (error) {
      runtimeActionError.value = error instanceof Error ? error.message : String(error);
    } finally {
      isImportingAiModel.value = false;
    }
  }

  async function replaceRuntime(onSynced?: () => void): Promise<void> {
    try {
      runtimeActionError.value = "";
      isReplacingRuntime.value = true;
      if (hasInstalledAiRuntime.value) {
        await aiRuntime.removeRuntime();
      }
      const selected = await open({
        multiple: false,
        filters: [{ name: t("aiEnhancement.dialog.runtimePackage"), extensions: ["7z", "zip"] }]
      });
      if (!selected || Array.isArray(selected)) {
        await refreshStatus(onSynced);
        return;
      }
      await aiRuntime.installOrUpdate(selected);
      await refreshStatus(onSynced);
    } catch (error) {
      runtimeActionError.value = error instanceof Error ? error.message : String(error);
      await refreshStatus(onSynced);
    } finally {
      isReplacingRuntime.value = false;
    }
  }

  async function replaceModel(onSynced?: () => void): Promise<void> {
    try {
      runtimeActionError.value = "";
      isReplacingModel.value = true;
      if (isLamaModelReady.value) {
        await aiModel.removeModel();
      }
      const selected = await open({
        multiple: false,
        filters: [{ name: t("aiEnhancement.dialog.lamaModel"), extensions: ["pt"] }]
      });
      if (!selected || Array.isArray(selected)) {
        await refreshStatus(onSynced);
        return;
      }
      await aiModel.importModel(selected);
      await refreshStatus(onSynced);
    } catch (error) {
      runtimeActionError.value = error instanceof Error ? error.message : String(error);
      await refreshStatus(onSynced);
    } finally {
      isReplacingModel.value = false;
    }
  }

  async function openRuntimeDirectory(): Promise<void> {
    await aiRuntime.openDirectory("runtime");
  }

  async function openModelsDirectory(): Promise<void> {
    await aiRuntime.openDirectory("models");
  }

  return {
    aiRuntime,
    aiModel,
    aiRuntimeStatus,
    aiRuntimeProgress,
    runtimeActionError,
    isImportingAiModel,
    isReplacingRuntime,
    isReplacingModel,
    hasInstalledAiRuntime,
    aiRuntimeSimpleStatusText,
    aiRuntimeStatusText,
    aiInstallHint,
    aiRuntimeRequirementsText,
    canShowAiInstallAction,
    isLamaModelReady,
    aiModelStatusText,
    isRuntimeBusy,
    aiProgressPercent,
    aiDownloadSpeedLabel,
    aiProgressSummaryLabel,
    runtimeDevice,
    torchVersion,
    modelsRoot,
    aiRuntimePath,
    lamaModelPath,
    refreshStatus,
    ensureRuntimeReady,
    ensureModelReady,
    installRuntime,
    importModel,
    replaceRuntime,
    replaceModel,
    openRuntimeDirectory,
    openModelsDirectory
  };
}
