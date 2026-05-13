<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { open, message } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { WINDOW_SIZE_OPTIONS } from "@/config/constants";
import { HOME_PAGE_CONFIG } from "@/pages/home/config/home.config";
import { HOME_ASSETS } from "@/pages/home/resources/homeAssets";
import { LANGUAGES, type AppLanguage, type AppWindowSize, type ThemeMode, type UserSettings } from "@/types/settings";
import { useSettingsStore } from "@/stores/settings.store";
import SettingsSectionCard from "@/pages/settings/components/SettingsSectionCard.vue";
import SettingsRow from "@/pages/settings/components/SettingsRow.vue";
import SettingsThemeSegment from "@/pages/settings/components/SettingsThemeSegment.vue";
import SettingsPathRow from "@/pages/settings/components/SettingsPathRow.vue";

const { t } = useI18n();
const settingsStore = useSettingsStore();
const {
  language,
  theme,
  taskDoneNotificationEnabled,
  windowSize,
  launchOnStartup,
  minimizeToTray,
  confirmOnClose,
  defaultOutputDirectory,
  cacheDirectory,
  outputFileNamingRule,
  maxConcurrentTasks,
  autoCheckUpdates,
  updateMethod,
  checkFrequency,
  privacyUxImprovement,
  errorReportingEnabled
} = storeToRefs(settingsStore);

const appVersion = computed(() => HOME_PAGE_CONFIG.footer.version);

const clearDataModalOpen = ref(false);
const clearDataAcknowledged = ref(false);
const clearDataClearing = ref(false);
const clearDataModalPanelRef = ref<HTMLElement | null>(null);

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

function onThemeUpdate(value: ThemeMode): void {
  settingsStore.setTheme(value);
}

type BooleanToggleKey =
  | "launchOnStartup"
  | "minimizeToTray"
  | "confirmOnClose"
  | "autoCheckUpdates"
  | "privacyUxImprovement"
  | "errorReportingEnabled";

function onToggleBoolean(key: BooleanToggleKey, checked: boolean): void {
  const partial: Partial<UserSettings> = { [key]: checked };
  settingsStore.patchSettings(partial);
}

async function pickOutputDirectory(): Promise<void> {
  if (!isTauri()) {
    window.alert(t("pages.settings.path.webNoPicker"));
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
    window.alert(t("pages.settings.path.webNoPicker"));
    return;
  }
  const selected = await open({ directory: true, multiple: false });
  const path = Array.isArray(selected) ? selected[0] : selected;
  if (typeof path === "string" && path.length > 0) {
    settingsStore.setCacheDirectory(path);
  }
}

function onNamingRuleChange(event: Event): void {
  const v = (event.target as HTMLSelectElement).value;
  settingsStore.patchSettings({ outputFileNamingRule: v });
}

function onMaxConcurrentChange(event: Event): void {
  const v = Number((event.target as HTMLSelectElement).value);
  settingsStore.patchSettings({ maxConcurrentTasks: Number.isFinite(v) ? v : 3 });
}

function onUpdateMethodChange(event: Event): void {
  settingsStore.patchSettings({ updateMethod: (event.target as HTMLSelectElement).value });
}

function onCheckFrequencyChange(event: Event): void {
  settingsStore.patchSettings({ checkFrequency: (event.target as HTMLSelectElement).value });
}

async function onClearCache(): Promise<void> {
  const body = t("pages.settings.dashboard.clearCacheHint");
  if (isTauri()) await message(body, { title: t("pages.settings.dashboard.cacheTitle") });
  else window.alert(body);
}


async function onCheckUpdates(): Promise<void> {
  const body = t("pages.settings.dashboard.checkUpdatesHint");
  if (isTauri()) await message(body, { title: t("pages.settings.checkUpdates") });
  else window.alert(body);
}

async function onOpenLink(kind: "terms" | "privacy"): Promise<void> {
  const body =
    kind === "terms"
      ? t("pages.settings.dashboard.termsPlaceholder")
      : t("pages.settings.dashboard.privacyPlaceholder");
  if (isTauri()) await message(body, { title: t("pages.settings.menu.privacy") });
  else window.alert(body);
}
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
            <SettingsRow :title="$t('pages.settings.general.autoLaunchTitle')" :description="$t('pages.settings.general.autoLaunchDesc')">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="launchOnStartup"
                  @change="onToggleBoolean('launchOnStartup', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle__ui" aria-hidden="true" />
              </label>
            </SettingsRow>
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
            <SettingsRow :title="$t('pages.settings.dashboard.themeTitle')" :description="$t('pages.settings.dashboard.themeDesc')">
              <SettingsThemeSegment :model-value="theme" @update:model-value="onThemeUpdate" />
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
                :path-value="cacheDirectory"
                empty-hint-key="pages.settings.dashboard.cacheEmptyHint"
                @change="pickCacheDirectory"
              />
            </SettingsRow>
            <SettingsRow :title="$t('pages.settings.dashboard.cacheSizeTitle')" :description="$t('pages.settings.dashboard.cacheSizeDesc')">
              <button type="button" class="btn-ghost" @click="onClearCache">
                {{ $t("pages.settings.dashboard.clearCache") }}
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
            <SettingsRow :title="$t('pages.settings.dashboard.updateMethodTitle')" :description="$t('pages.settings.dashboard.updateMethodDesc')">
              <select class="select" :value="updateMethod" @change="onUpdateMethodChange">
                <option value="stable">{{ $t("pages.settings.dashboard.updateStable") }}</option>
                <option value="beta">{{ $t("pages.settings.dashboard.updateBeta") }}</option>
              </select>
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
.clear-data-modal-panel {
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
  padding: 22px 22px 18px;
  outline: none;
}
.clear-data-modal-title {
  margin: 0 0 12px;
  font-size: 18px;
  line-height: 26px;
  font-weight: 700;
  color: #0f172a;
}
.clear-data-modal-body {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.55;
  color: #475569;
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
.clear-data-modal-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}
.btn-danger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-ghost:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
