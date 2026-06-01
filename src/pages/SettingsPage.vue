<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { WINDOW_SIZE_OPTIONS, AI_RUNTIME_ENABLED } from "@/config/constants";
import { APP_VERSION, APP_VERSION_LABEL } from "@/config/appVersion";
import { tauriClient } from "@/bridge/tauriClient";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
import { useExternalNavigate } from "@/composables/useExternalNavigate";
import { showAppAlert, showAppConfirm } from "@/utils/appDialog";
import { useAiEnhancementGuideNavigate } from "@/modules/ai-runtime/useAiEnhancementGuideNavigate";
import { useAiEnhancementPanel } from "@/modules/ai-runtime/useAiEnhancementPanel";
import { LANGUAGES, type AiPathMode, type AppLanguage, type AppWindowSize, type UserSettings } from "@/types/settings";
import { useSettingsStore } from "@/stores/settings.store";
import { useTaskStore } from "@/stores/task.store";
import SettingsSectionCard from "@/pages/settings/components/SettingsSectionCard.vue";
import SettingsRow from "@/pages/settings/components/SettingsRow.vue";
import SettingsPathRow from "@/pages/settings/components/SettingsPathRow.vue";
import AiRuntimeInstallLoadingOverlay from "@/components/ai-runtime/AiRuntimeInstallLoadingOverlay.vue";
import { type AppUpdateCheckResult } from "@/modules/app-updates/api";
import {
  executeUpdateInstall,
  mapUpdateInstallError,
  resolveUpdateInstallAction,
  runDesktopUpdateCheck,
} from "@/modules/app-updates/orchestrator";

const { t } = useI18n();
const settingsStore = useSettingsStore();
const taskStore = useTaskStore();
const { navigate } = useExternalNavigate();
const { openAiEnhancementGuide } = useAiEnhancementGuideNavigate();
const {
  language,
  taskDoneNotificationEnabled,
  windowSize,
  minimizeToTray,
  confirmOnClose,
  defaultOutputDirectory,
  cacheDirectory,
  outputFileNamingRule,
  maxConcurrentTasks,
  autoCheckUpdates,
  checkFrequency,
  privacyUxImprovement,
  errorReportingEnabled,
  aiPathMode,
  aiRuntimeRoot,
  aiModelsRoot
} = storeToRefs(settingsStore);

const appVersion = computed(() => APP_VERSION_LABEL);

const clearDataModalOpen = ref(false);
const clearDataAcknowledged = ref(false);
const clearDataClearing = ref(false);
const clearDataModalPanelRef = ref<HTMLElement | null>(null);
const updateProgressModalOpen = ref(false);
const updateResultModalOpen = ref(false);
const updateProgressValue = ref(0);
const updateProgressLabel = ref("");
const updateProgressBytesText = ref("");
const systemTempDirectory = ref("");
const updateChecking = ref(false);
const updateInstalling = ref(false);
const updateResult = ref<AppUpdateCheckResult | null>(null);
const updateResultStatus = ref<"success" | "error">("success");
const updateResultMessage = ref("");
const updateResultTitle = computed(() => {
  if (updateResultStatus.value === "error") {
    return t("pages.settings.dashboard.updateCheckFailedTitle");
  }
  if (updateResult.value?.available) {
    return t("pages.settings.dashboard.updateAvailableTitle");
  }
  return t("pages.settings.dashboard.updateUpToDateTitle");
});
const updateInstallAction = computed(() => resolveUpdateInstallAction(updateResult.value));
const canExecuteRealUpdate = computed(() => updateInstallAction.value.type === "in_app_download_install");

const aiPanel = useAiEnhancementPanel();
const {
  hasInstalledAiRuntime,
  isLamaModelReady,
  aiRuntimePath,
  lamaModelPath,
  modelsRoot,
  aiRuntimeSimpleStatusText,
  aiModelStatusText,
  aiRuntimeProgress,
  aiRuntimeStatusText,
  isRuntimeBusy,
  isReplacingRuntime,
  isReplacingModel,
  runtimeActionError,
  refreshStatus,
  replaceRuntime,
  replaceModel
} = aiPanel;

const aiRuntimeDisplayPath = computed(() => aiRuntimePath.value || "");
const lamaModelDisplayPath = computed(() => modelsRoot.value || lamaModelPath.value || "");
const effectiveCacheDirectory = computed(() => cacheDirectory.value || systemTempDirectory.value || "");
const showAiRuntimeLoadingOverlay = computed(() => isRuntimeBusy.value || isReplacingRuntime.value);
const isCustomAiPathMode = computed(() => aiPathMode.value === "custom");
const defaultAiRuntimeRoot = computed(() => aiPanel.aiRuntime.localPaths.value?.defaultRuntimeRoot || "");
const defaultAiModelsRoot = computed(() => aiPanel.aiRuntime.localPaths.value?.defaultModelsRoot || "");
const resolvedAiRuntimeRoot = computed(() => aiPanel.aiRuntime.localPaths.value?.runtimeRoot || defaultAiRuntimeRoot.value || aiRuntimeRoot.value);
const resolvedAiModelsRoot = computed(() => aiPanel.aiRuntime.localPaths.value?.modelsRoot || defaultAiModelsRoot.value || aiModelsRoot.value);
const aiPathModeDescription = computed(() =>
  isCustomAiPathMode.value
    ? t("pages.settings.aiModules.pathModeCustomDesc")
    : t("pages.settings.aiModules.pathModeDefaultDesc")
);
const aiRuntimeLoadingMessage = computed(() => {
  if (aiRuntimeProgress.value?.message) return aiRuntimeProgress.value.message;
  if (isReplacingRuntime.value && !isRuntimeBusy.value) return t("aiEnhancement.overlay.replacingRuntime");
  return aiRuntimeStatusText.value;
});
const runtimeStatusDescription = computed(() =>
  `${aiRuntimeSimpleStatusText.value}${hasInstalledAiRuntime.value ? "" : ` 路 ${t("pages.settings.aiModules.notInstalled")}`}`
);
const modelStatusDescription = computed(() =>
  `${aiModelStatusText.value}${isLamaModelReady.value ? "" : ` 路 ${t("pages.settings.aiModules.notInstalled")}`}`
);

watch(clearDataModalOpen, (open) => {
  if (open) {
    clearDataAcknowledged.value = false;
    void nextTick(() => {
      clearDataModalPanelRef.value?.focus();
    });
  }
});

function openClearDataModal(): void {
  clearDataModalOpen.value = true;
}

function closeClearDataModal(): void {
  if (clearDataClearing.value) return;
  clearDataModalOpen.value = false;
}

async function confirmClearLocalDataInModal(): Promise<void> {
  if (!clearDataAcknowledged.value || clearDataClearing.value) return;
  clearDataClearing.value = true;
  try {
    await settingsStore.clearAllLocalUserData();
    clearDataModalOpen.value = false;
  } finally {
    clearDataClearing.value = false;
  }
}

function onLanguageChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  settingsStore.setLanguage(target.value as AppLanguage);
}

function onWindowSizeChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  settingsStore.setWindowSize(target.value as AppWindowSize);
}

type BooleanToggleKey =
  | "minimizeToTray"
  | "confirmOnClose"
  | "autoCheckUpdates"
  | "privacyUxImprovement"
  | "errorReportingEnabled";

function onToggleBoolean(key: BooleanToggleKey, checked: boolean): void {
  const partial: Partial<UserSettings> = { [key]: checked };
  settingsStore.patchSettings(partial);
}

async function persistAiPathSettings(partial: Partial<UserSettings>): Promise<void> {
  await settingsStore.updateSettings(partial);
  if (AI_RUNTIME_ENABLED) {
    await refreshStatus();
  }
}

async function onAiPathModeChange(event: Event): Promise<void> {
  const nextMode = (event.target as HTMLSelectElement).value as AiPathMode;
  if (nextMode === aiPathMode.value) return;
  if (nextMode === "custom") {
    await persistAiPathSettings({
      aiPathMode: "custom",
      aiRuntimeRoot: aiRuntimeRoot.value || defaultAiRuntimeRoot.value,
      aiModelsRoot: aiModelsRoot.value || defaultAiModelsRoot.value
    });
    return;
  }
  await persistAiPathSettings({ aiPathMode: "default" });
}

async function pickOutputDirectory(): Promise<void> {
  if (!isTauri()) {
    await showAppAlert({
      title: t("pages.settings.dashboard.pathHintTitle"),
      message: t("pages.settings.path.webNoPicker")
    });
    return;
  }
  const selected = await open({ directory: true, multiple: false });
  const path = Array.isArray(selected) ? selected[0] : selected;
  if (typeof path === "string" && path.length > 0) {
    settingsStore.setDefaultOutputDirectory(path);
  }
}

async function pickCacheDirectory(): Promise<void> {
  if (!isTauri()) {
    await showAppAlert({
      title: t("pages.settings.dashboard.pathHintTitle"),
      message: t("pages.settings.path.webNoPicker")
    });
    return;
  }
  const selected = await open({ directory: true, multiple: false });
  const path = Array.isArray(selected) ? selected[0] : selected;
  if (typeof path === "string" && path.length > 0) {
    settingsStore.setCacheDirectory(path);
  }
}

async function pickAiDirectory(kind: "runtime" | "models"): Promise<void> {
  if (!isTauri()) {
    await showAppAlert({
      title: t("pages.settings.dashboard.pathHintTitle"),
      message: t("pages.settings.path.webNoPicker")
    });
    return;
  }
  const selected = await open({ directory: true, multiple: false });
  const path = Array.isArray(selected) ? selected[0] : selected;
  if (typeof path !== "string" || path.length === 0) {
    return;
  }
  await persistAiPathSettings(
    kind === "runtime"
      ? { aiPathMode: "custom", aiRuntimeRoot: path }
      : { aiPathMode: "custom", aiModelsRoot: path }
  );
}

async function pickAiRuntimeDirectory(): Promise<void> {
  await pickAiDirectory("runtime");
}

async function pickAiModelsDirectory(): Promise<void> {
  await pickAiDirectory("models");
}

async function restoreDefaultAiPaths(): Promise<void> {
  await persistAiPathSettings({ aiPathMode: "default" });
}

function onNamingRuleChange(event: Event): void {
  const v = (event.target as HTMLSelectElement).value;
  settingsStore.patchSettings({ outputFileNamingRule: v });
}

function onMaxConcurrentChange(event: Event): void {
  const v = Number((event.target as HTMLSelectElement).value);
  settingsStore.patchSettings({ maxConcurrentTasks: Number.isFinite(v) ? v : 3 });
}

function onCheckFrequencyChange(event: Event): void {
  settingsStore.patchSettings({ checkFrequency: (event.target as HTMLSelectElement).value });
}

async function onClearCache(): Promise<void> {
  await showAppAlert({
    title: t("pages.settings.dashboard.cacheTitle"),
    message: t("pages.settings.dashboard.clearCacheHint")
  });
}

async function loadSystemTempDirectory(): Promise<void> {
  if (!isTauri()) return;
  try {
    const result = await tauriClient.getTempDirectory();
    systemTempDirectory.value = result.path.trim();
  } catch {
    systemTempDirectory.value = "";
  }
}

async function onCheckUpdates(): Promise<void> {
  if (updateChecking.value || updateInstalling.value) return;

  updateChecking.value = true;
  updateResultModalOpen.value = false;
  updateProgressModalOpen.value = true;
  updateProgressValue.value = 0;
  updateProgressBytesText.value = "";
  updateProgressLabel.value = t("pages.settings.dashboard.updateCheckProgressStart");

  let progressTimer: number | undefined;

  try {
    progressTimer = window.setInterval(() => {
      if (updateProgressValue.value < 84) {
        updateProgressValue.value = Math.min(84, updateProgressValue.value + 7);
      }
    }, 140);

    window.setTimeout(() => {
      if (updateChecking.value && updateProgressValue.value < 28) {
        updateProgressValue.value = 28;
        updateProgressLabel.value = t("pages.settings.dashboard.updateCheckProgressNetwork");
      }
    }, 220);

    window.setTimeout(() => {
      if (updateChecking.value && updateProgressValue.value < 58) {
        updateProgressValue.value = 58;
        updateProgressLabel.value = t("pages.settings.dashboard.updateCheckProgressCompare");
      }
    }, 620);

    const checked = await runDesktopUpdateCheck({
      trigger: "manual",
      settings: {
        autoCheckUpdates: autoCheckUpdates.value,
        checkFrequency: checkFrequency.value,
        updateMethod: "stable",
      },
      currentVersion: APP_VERSION,
      locale: language.value,
    });
    if (checked.status !== "ok" || !checked.result) {
      throw new Error("manual_check_failed");
    }
    const result = checked.result;
    const installAction = resolveUpdateInstallAction(result);

    updateResult.value = result;
    updateResultStatus.value = "success";
    if (!result.available) {
      updateResultMessage.value = t("pages.settings.dashboard.updateUpToDateMessage", { version: result.currentVersion });
    } else if (installAction.type === "dev_check_only") {
      updateResultMessage.value = t("pages.settings.dashboard.updateAvailableDevMessage", { version: result.latestVersion });
    } else if (installAction.type === "unsupported") {
      updateResultMessage.value = t("pages.settings.dashboard.updateAvailableUnsupportedMessage", { version: result.latestVersion });
    } else {
      updateResultMessage.value = t("pages.settings.dashboard.updateAvailableMessage", { version: result.latestVersion });
    }
  } catch {
    updateResult.value = null;
    updateResultStatus.value = "error";
    updateResultMessage.value = t("pages.settings.dashboard.updateCheckFailedMessage");
  } finally {
    if (progressTimer) {
      window.clearInterval(progressTimer);
    }
    updateProgressValue.value = 100;
    updateProgressLabel.value = t("pages.settings.dashboard.updateCheckProgressDone");
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    updateProgressModalOpen.value = false;
    updateResultModalOpen.value = true;
    updateChecking.value = false;
  }
}

function closeUpdateResultModal(): void {
  if (updateInstalling.value) return;
  updateResultModalOpen.value = false;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

async function onInstallUpdate(): Promise<void> {
  if (!updateResult.value?.available || updateInstalling.value || !canExecuteRealUpdate.value) return;
  if (taskStore.activeTasks.length > 0) {
    updateResultStatus.value = "error";
    updateResultMessage.value = t("pages.settings.dashboard.updateInstallBlockedByActiveTasks");
    updateResultModalOpen.value = true;
    return;
  }
  updateInstalling.value = true;
  updateResultModalOpen.value = false;
  updateProgressModalOpen.value = true;
  updateProgressValue.value = 0;
  updateProgressBytesText.value = "";
  updateProgressLabel.value = t("pages.settings.dashboard.updateInstallProgressPrepare");
  try {
    await executeUpdateInstall(updateResult.value, (payload) => {
      switch (payload.phase) {
        case "checking":
          updateProgressValue.value = 10;
          updateProgressBytesText.value = "";
          updateProgressLabel.value = t("pages.settings.dashboard.updateInstallProgressPrepare");
          break;
        case "downloading": {
          const totalBytes = payload.totalBytes ?? 0;
          const downloadedBytes = payload.downloadedBytes ?? 0;
          const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          updateProgressValue.value = Math.max(12, Math.min(96, progress));
          updateProgressBytesText.value =
            totalBytes > 0 ? `${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)}` : formatBytes(downloadedBytes);
          updateProgressLabel.value = t("pages.settings.dashboard.updateInstallProgressDownload");
          break;
        }
        case "launching":
          updateProgressValue.value = 100;
          updateProgressBytesText.value = "";
          updateProgressLabel.value = t("pages.settings.dashboard.updateInstallProgressApply");
          break;
        case "done":
          updateProgressValue.value = 100;
          updateProgressBytesText.value = "";
          updateProgressLabel.value = t("pages.settings.dashboard.updateInstallProgressDone");
          break;
      }
    });
  } catch (error) {
    updateProgressModalOpen.value = false;
    updateProgressBytesText.value = "";
    updateResultStatus.value = "error";
    updateResultMessage.value = t(`pages.settings.dashboard.updateInstallError.${mapUpdateInstallError(error)}`);
    updateResultModalOpen.value = true;
  } finally {
    updateInstalling.value = false;
  }
}

async function onOpenLink(kind: "terms" | "privacy"): Promise<void> {
  await navigate({
    entryId: kind === "terms" ? "settings-about-terms" : "settings-about-privacy",
    logicalPath: kind === "terms" ? "/terms" : "/privacy",
  });
}

async function onOpenAiGuide(): Promise<void> {
  await openAiEnhancementGuide("settings-ai-modules-guide");
}

async function onReplaceAiRuntime(): Promise<void> {
  if (!isTauri() || isReplacingRuntime.value) return;
  if (hasInstalledAiRuntime.value) {
    const confirmed = await showAppConfirm({
      title: t("pages.settings.aiModules.replaceRuntimeConfirmTitle"),
      message: t("pages.settings.aiModules.replaceRuntimeConfirmBody"),
      confirmLabel: t("pages.settings.actions.replace"),
      cancelLabel: t("pages.settings.dashboard.closeConfirmCancel"),
      tone: "warning"
    });
    if (!confirmed) return;
  }
  await replaceRuntime();
  if (runtimeActionError.value) {
    await showAppAlert({
      title: t("pages.settings.aiModules.replaceFailedTitle"),
      message: runtimeActionError.value
    });
  }
}

async function onReplaceLamaModel(): Promise<void> {
  if (!isTauri() || isReplacingModel.value) return;
  if (isLamaModelReady.value) {
    const confirmed = await showAppConfirm({
      title: t("pages.settings.aiModules.replaceModelConfirmTitle"),
      message: t("pages.settings.aiModules.replaceModelConfirmBody"),
      confirmLabel: t("pages.settings.actions.replace"),
      cancelLabel: t("pages.settings.dashboard.closeConfirmCancel"),
      tone: "warning"
    });
    if (!confirmed) return;
  }
  await replaceModel();
  if (runtimeActionError.value) {
    await showAppAlert({
      title: t("pages.settings.aiModules.replaceFailedTitle"),
      message: runtimeActionError.value
    });
  }
}

onMounted(() => {
  void loadSystemTempDirectory();
  if (AI_RUNTIME_ENABLED) {
    void refreshStatus();
  }
});
</script>

<template>
  <div class="settings-page">
    <div class="settings-page__scroll">
      <header class="settings-page__header">
        <h1 class="settings-page__title">{{ $t("pages.settings.headerTitle") }}</h1>
        <p class="settings-page__subtitle">{{ $t("pages.settings.dashboard.subtitle") }}</p>
      </header>

      <div class="settings-page__grid">
        <div class="settings-page__col settings-page__col--main">
          <SettingsSectionCard :title="$t('pages.settings.dashboard.sectionGeneral')">
            <SettingsRow :title="$t('pages.settings.dashboard.minimizeTrayTitle')" :description="$t('pages.settings.dashboard.minimizeTrayDesc')">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="minimizeToTray"
                  @change="onToggleBoolean('minimizeToTray', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle__ui" aria-hidden="true" />
              </label>
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.dashboard.confirmCloseTitle')" :description="$t('pages.settings.dashboard.confirmCloseDesc')">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="confirmOnClose"
                  @change="onToggleBoolean('confirmOnClose', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle__ui" aria-hidden="true" />
              </label>
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.general.languageTitle')" :description="$t('pages.settings.general.languageDesc')">
              <select class="select" :value="language" @change="onLanguageChange">
                <option v-for="item in LANGUAGES" :key="item" :value="item">
                  {{ item }}
                </option>
              </select>
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.general.windowSizeTitle')" :description="$t('pages.settings.general.windowSizeDesc')">
              <select class="select" :value="windowSize" @change="onWindowSizeChange">
                <option v-for="item in WINDOW_SIZE_OPTIONS" :key="item.value" :value="item.value">
                  {{
                    `${$t(`pages.settings.general.windowSize${item.value.charAt(0).toUpperCase()}${item.value.slice(1)}Title`)} (${item.width} × ${item.height})`
                  }}
                </option>
              </select>
            </SettingsRow>
          </SettingsSectionCard>

          <SettingsSectionCard :title="$t('pages.settings.dashboard.sectionOutput')">
            <SettingsRow
              variant="block"
              :title="$t('pages.settings.tools.outputPathTitle')"
              :description="$t('pages.settings.tools.outputPathDesc')"
            >
              <SettingsPathRow
                :path-value="defaultOutputDirectory"
                empty-hint-key="pages.settings.dashboard.outputEmptyHint"
                mode="simple"
                @change="pickOutputDirectory"
              />
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.dashboard.namingRuleTitle')" :description="$t('pages.settings.dashboard.namingRuleDesc')">
              <select class="select" :value="outputFileNamingRule" @change="onNamingRuleChange">
                <option value="original">{{ $t("pages.settings.dashboard.namingOriginal") }}</option>
                <option value="timestamp">{{ $t("pages.settings.dashboard.namingTimestamp") }}</option>
              </select>
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.tools.concurrentTitle')" :description="$t('pages.settings.tools.concurrentDesc')">
              <select class="select" :value="String(maxConcurrentTasks)" @change="onMaxConcurrentChange">
                <option v-for="n in [1, 2, 3, 4, 5]" :key="n" :value="String(n)">{{ n }}</option>
              </select>
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.notifications.taskDoneTitle')" :description="$t('pages.settings.notifications.taskDoneDesc')">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="taskDoneNotificationEnabled"
                  @change="settingsStore.setTaskDoneNotificationEnabled(($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle__ui" aria-hidden="true" />
              </label>
            </SettingsRow>
          </SettingsSectionCard>

          <SettingsSectionCard :title="$t('pages.settings.dashboard.sectionCache')">
            <SettingsRow
              variant="block"
              :title="$t('pages.settings.dashboard.cacheDirTitle')"
              :description="$t('pages.settings.dashboard.cacheDirDesc')"
            >
              <SettingsPathRow
                :path-value="effectiveCacheDirectory"
                empty-hint-key="pages.settings.dashboard.cacheEmptyHint"
                mode="simple"
                @change="pickCacheDirectory"
              />
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.dashboard.cacheSizeTitle')" :description="$t('pages.settings.dashboard.cacheSizeDesc')">
              <button type="button" class="btn-ghost" @click="onClearCache">
                {{ $t("pages.settings.dashboard.clearCache") }}
              </button>
            </SettingsRow>
          </SettingsSectionCard>

          <SettingsSectionCard v-if="AI_RUNTIME_ENABLED" :title="$t('pages.settings.aiModules.sectionTitle')">
            <SettingsRow :title="$t('pages.settings.aiModules.pathModeTitle')" :description="aiPathModeDescription">
              <select class="select" :value="aiPathMode" @change="onAiPathModeChange">
                <option value="default">{{ $t("pages.settings.aiModules.pathModeDefault") }}</option>
                <option value="custom">{{ $t("pages.settings.aiModules.pathModeCustom") }}</option>
              </select>
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.aiModules.guideTitle')" :description="$t('pages.settings.aiModules.guideDesc')">
              <button type="button" class="btn-ghost btn-ghost--guide" @click="onOpenAiGuide">
                {{ $t("pages.settings.aiModules.guideAction") }}
              </button>
            </SettingsRow>
            <SettingsRow variant="block" :title="$t('pages.settings.aiModules.runtimeStorageRootTitle')" :description="$t('pages.settings.aiModules.runtimeStorageRootDesc')">
              <div class="settings-page__ai-asset-card">
                <div class="settings-page__ai-asset-block">
                  <SettingsPathRow
                    :path-value="resolvedAiRuntimeRoot"
                    :open-path="resolvedAiRuntimeRoot"
                    empty-hint-key="pages.settings.aiModules.runtimeStorageEmptyHint"
                    change-label-key="pages.settings.actions.chooseFolder"
                    mode="simple"
                    @change="pickAiRuntimeDirectory"
                  />
                  <p class="settings-page__path-note">
                    {{ $t("pages.settings.aiModules.defaultRuntimeRootLabel", { path: defaultAiRuntimeRoot }) }}
                  </p>
                </div>
                <div class="settings-page__ai-asset-divider" />
                <div class="settings-page__ai-asset-block">
                  <h4 class="settings-page__ai-asset-title">{{ $t("pages.settings.aiModules.runtimeTitle") }}</h4>
                  <p class="settings-page__ai-asset-desc">{{ runtimeStatusDescription }}</p>
                  <SettingsPathRow
                    :path-value="aiRuntimeDisplayPath"
                    empty-hint-key="pages.settings.aiModules.runtimeEmptyHint"
                    change-label-key="pages.settings.actions.replace"
                    :change-disabled="isReplacingRuntime"
                    ai-open-target="runtime"
                    mode="simple"
                    @change="onReplaceAiRuntime"
                  />
                </div>
              </div>
            </SettingsRow>
            <SettingsRow variant="block" :title="$t('pages.settings.aiModules.modelsStorageRootTitle')" :description="$t('pages.settings.aiModules.modelsStorageRootDesc')">
              <div class="settings-page__ai-asset-card">
                <div class="settings-page__ai-asset-block">
                  <SettingsPathRow
                    :path-value="resolvedAiModelsRoot"
                    :open-path="resolvedAiModelsRoot"
                    empty-hint-key="pages.settings.aiModules.modelsStorageEmptyHint"
                    change-label-key="pages.settings.actions.chooseFolder"
                    mode="simple"
                    @change="pickAiModelsDirectory"
                  />
                  <p class="settings-page__path-note">
                    {{ $t("pages.settings.aiModules.defaultModelsRootLabel", { path: defaultAiModelsRoot }) }}
                  </p>
                </div>
                <div class="settings-page__ai-asset-divider" />
                <div class="settings-page__ai-asset-block">
                  <h4 class="settings-page__ai-asset-title">{{ $t("pages.settings.aiModules.modelTitle") }}</h4>
                  <p class="settings-page__ai-asset-desc">{{ modelStatusDescription }}</p>
                  <SettingsPathRow
                    :path-value="lamaModelDisplayPath"
                    empty-hint-key="pages.settings.aiModules.modelEmptyHint"
                    change-label-key="pages.settings.actions.replace"
                    :change-disabled="isReplacingModel"
                    ai-open-target="models"
                    mode="simple"
                    @change="onReplaceLamaModel"
                  />
                </div>
              </div>
            </SettingsRow>
            <SettingsRow
              v-if="isCustomAiPathMode"
              :title="$t('pages.settings.aiModules.restoreDefaultTitle')"
              :description="$t('pages.settings.aiModules.restoreDefaultDesc')"
            >
              <button type="button" class="btn-ghost" @click="restoreDefaultAiPaths">
                {{ $t("pages.settings.aiModules.restoreDefaultAction") }}
              </button>
            </SettingsRow>
          </SettingsSectionCard>
        </div>

        <div class="settings-page__col settings-page__col--side">
          <SettingsSectionCard :title="$t('pages.settings.dashboard.sectionUpdates')">
            <SettingsRow :title="$t('pages.settings.notifications.updateTitle')" :description="$t('pages.settings.notifications.updateDesc')">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="autoCheckUpdates"
                  @change="onToggleBoolean('autoCheckUpdates', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle__ui" aria-hidden="true" />
              </label>
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.dashboard.checkFrequencyTitle')" :description="$t('pages.settings.dashboard.checkFrequencyDesc')">
              <select class="select" :value="checkFrequency" @change="onCheckFrequencyChange">
                <option value="startup">{{ $t("pages.settings.dashboard.freqStartup") }}</option>
                <option value="daily">{{ $t("pages.settings.dashboard.freqDaily") }}</option>
                <option value="weekly">{{ $t("pages.settings.dashboard.freqWeekly") }}</option>
              </select>
            </SettingsRow>
          </SettingsSectionCard>

          <SettingsSectionCard :title="$t('pages.settings.menu.privacy')">
            <SettingsRow :title="$t('pages.settings.privacy.usageTitle')" :description="$t('pages.settings.privacy.usageDesc')">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="privacyUxImprovement"
                  @change="onToggleBoolean('privacyUxImprovement', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle__ui" aria-hidden="true" />
              </label>
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.privacy.crashTitle')" :description="$t('pages.settings.privacy.crashDesc')">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="errorReportingEnabled"
                  @change="onToggleBoolean('errorReportingEnabled', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle__ui" aria-hidden="true" />
              </label>
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.dashboard.clearDataTitle')" :description="$t('pages.settings.dashboard.clearDataDesc')">
              <button type="button" class="btn-danger" @click="openClearDataModal">
                {{ $t("pages.settings.dashboard.clearData") }}
              </button>
            </SettingsRow>
          </SettingsSectionCard>

          <SettingsSectionCard :title="$t('pages.settings.menu.about')">
            <div class="about-card">
              <div class="about-card__brand">
                <img :src="HOME_ASSETS.pubAppLogo" alt="" class="about-card__logo" />
                <div>
                  <strong class="about-card__name">{{ $t("pages.home.topBar.appName") }}</strong>
                  <p class="about-card__ver">{{ $t("pages.settings.currentVersion") }} {{ appVersion }}</p>
                </div>
              </div>
              <p class="about-card__desc">{{ $t("pages.settings.aboutDesc") }}</p>
              <div class="about-card__links">
                <button type="button" class="linkish" @click="onCheckUpdates">{{ $t("pages.settings.checkUpdates") }}</button>
                <button type="button" class="linkish" @click="onOpenLink('terms')">{{ $t("pages.settings.dashboard.terms") }}</button>
                <button type="button" class="linkish" @click="onOpenLink('privacy')">{{ $t("pages.settings.dashboard.privacyPolicy") }}</button>
              </div>
              <p class="about-card__copy">{{ $t("pages.settings.dashboard.copyright") }}</p>
            </div>
          </SettingsSectionCard>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="clearDataModalOpen"
        class="clear-data-modal-backdrop"
        aria-hidden="false"
        @click.self="closeClearDataModal"
      >
        <div
          ref="clearDataModalPanelRef"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="clear-data-modal-title"
          tabindex="-1"
          class="clear-data-modal-panel"
          @keydown.escape.prevent="closeClearDataModal"
        >
          <h2 id="clear-data-modal-title" class="clear-data-modal-title">
            {{ $t("pages.settings.dashboard.clearDataModalTitle") }}
          </h2>
          <p class="clear-data-modal-body">{{ $t("pages.settings.dashboard.clearDataModalBody") }}</p>
          <label class="clear-data-modal-ack">
            <input v-model="clearDataAcknowledged" type="checkbox" />
            <span>{{ $t("pages.settings.dashboard.clearDataModalAck") }}</span>
          </label>
          <div class="clear-data-modal-actions">
            <button type="button" class="btn-ghost" :disabled="clearDataClearing" @click="closeClearDataModal">
              {{ $t("pages.settings.dashboard.clearDataModalCancel") }}
            </button>
            <button
              type="button"
              class="btn-danger"
              :disabled="!clearDataAcknowledged || clearDataClearing"
              @click="confirmClearLocalDataInModal"
            >
              {{ $t("pages.settings.dashboard.clearDataModalConfirm") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <AiRuntimeInstallLoadingOverlay
        v-if="showAiRuntimeLoadingOverlay"
        :title="t('aiEnhancement.overlay.processingTitle')"
        :message="aiRuntimeLoadingMessage"
      />
    </Teleport>

    <Teleport to="body">
      <div v-if="updateProgressModalOpen" class="dialog-backdrop" aria-hidden="false">
        <div class="dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="update-progress-title">
          <h2 id="update-progress-title" class="dialog-title">
            {{ $t("pages.settings.dashboard.updateProgressTitle") }}
          </h2>
          <p class="dialog-body">{{ updateProgressLabel }}</p>
          <div class="update-progress-bar" aria-hidden="true">
            <span class="update-progress-bar__fill" :style="{ width: `${updateProgressValue}%` }" />
          </div>
          <p class="dialog-meta">{{ updateProgressValue }}%</p>
          <p v-if="updateProgressBytesText" class="dialog-meta">{{ updateProgressBytesText }}</p>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="updateResultModalOpen" class="dialog-backdrop" aria-hidden="false" @click.self="closeUpdateResultModal">
        <div class="dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="update-result-title">
          <h2 id="update-result-title" class="dialog-title">
            {{ updateResultTitle }}
          </h2>
          <p class="dialog-body">{{ updateResultMessage }}</p>
          <div v-if="updateResult" class="dialog-meta-block">
            <p class="dialog-meta">{{ $t("pages.settings.currentVersion") }}: {{ `v${updateResult.currentVersion.replace(/^v/i, "")}` }}</p>
            <p class="dialog-meta">{{ $t("pages.settings.dashboard.latestVersionLabel") }}: {{ `v${updateResult.latestVersion.replace(/^v/i, "")}` }}</p>
            <p v-if="updateResult.publishedAt" class="dialog-meta">{{ $t("pages.settings.dashboard.releaseDateLabel") }}: {{ updateResult.publishedAt }}</p>
            <p v-if="updateResult.notes" class="dialog-body dialog-body--notes">{{ updateResult.notes }}</p>
          </div>
          <div class="dialog-actions">
            <button
              v-if="updateResult?.available && updateResultStatus !== 'error' && canExecuteRealUpdate"
              type="button"
              class="btn-primary"
              :disabled="updateInstalling"
              @click="onInstallUpdate"
            >
              {{ $t("pages.settings.dashboard.downloadUpdateNow") }}
            </button>
            <button type="button" class="btn-ghost" :disabled="updateInstalling" @click="closeUpdateResultModal">
              {{ $t("pages.settings.dashboard.closeModal") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}
.settings-page__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 20px 22px 28px;
}
.settings-page__header {
  margin-bottom: 18px;
}
.settings-page__title {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
  color: #0f172a;
}
.settings-page__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
}
.settings-page__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
@media (max-width: 960px) {
  .settings-page__grid {
    grid-template-columns: 1fr;
  }
}
.settings-page__col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.select {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #111827;
  padding: 8px 10px;
  min-width: 140px;
  font-size: 13px;
}
.toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle__ui {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: #e5e7eb;
  transition: background 0.2s ease;
  position: relative;
}
.toggle__ui::after {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  top: 2px;
  left: 2px;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
}
.toggle input:checked + .toggle__ui {
  background: #2563eb;
}
.toggle input:checked + .toggle__ui::after {
  transform: translateX(20px);
}
.toggle input:focus-visible + .toggle__ui {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.btn-ghost {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  cursor: pointer;
}
.btn-primary {
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 14px;
  cursor: pointer;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn-ghost--guide {
  border-color: #bfdbfe;
  color: #1d4ed8;
  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
}
.btn-danger {
  border: none;
  border-radius: 8px;
  background: #dc2626;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 14px;
  cursor: pointer;
}
.btn-danger:hover {
  background: #b91c1c;
}
.settings-page__ai-asset-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background:
    radial-gradient(circle at top left, rgba(219, 234, 254, 0.8), transparent 45%),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}
.settings-page__ai-asset-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.settings-page__ai-asset-title {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 700;
  color: #0f172a;
}
.settings-page__ai-asset-desc {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: #64748b;
}
.settings-page__ai-asset-divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0), rgba(148, 163, 184, 0.45), rgba(148, 163, 184, 0));
}
.settings-page__path-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
  padding: 0 2px;
}
.about-card__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.about-card__logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: contain;
}
.about-card__name {
  font-size: 16px;
  color: #0f172a;
}
.about-card__ver {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}
.about-card__desc {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 20px;
  color: #475569;
}
.about-card__links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-bottom: 12px;
}
.linkish {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  color: #2563eb;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.about-card__copy {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}

.dialog-backdrop,
.clear-data-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
}
.dialog-panel,
.clear-data-modal-panel {
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
  padding: 22px 22px 18px;
  outline: none;
}
.dialog-title,
.clear-data-modal-title {
  margin: 0 0 12px;
  font-size: 18px;
  line-height: 26px;
  font-weight: 700;
  color: #0f172a;
}
.dialog-body,
.clear-data-modal-body {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.55;
  color: #475569;
}
.dialog-body--notes {
  margin-top: 10px;
  margin-bottom: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
}
.dialog-meta-block {
  margin-bottom: 18px;
}
.dialog-meta {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: #64748b;
}
.dialog-meta + .dialog-meta {
  margin-top: 4px;
}
.clear-data-modal-ack {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 20px;
  font-size: 13px;
  line-height: 1.45;
  color: #334155;
  cursor: pointer;
}
.clear-data-modal-ack input {
  margin-top: 2px;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  accent-color: #dc2626;
}
.dialog-actions,
.clear-data-modal-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}
.update-progress-bar {
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
  margin-bottom: 10px;
}
.update-progress-bar__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb 0%, #60a5fa 100%);
  transition: width 0.2s ease;
}
.btn-danger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
