<script setup lang="ts">
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import ToolPageTopBar from "@/components/common/ToolPageTopBar.vue";
import { ROUTE_PATHS, WINDOW_SIZE_OPTIONS } from "@/config/constants";
import { LANGUAGES, type AppLanguage, type AppWindowSize } from "@/types/settings";
import { useSettingsStore } from "@/stores/settings.store";

const router = useRouter();
const settingsStore = useSettingsStore();
const { language, taskDoneNotificationEnabled, windowSize } = storeToRefs(settingsStore);

/**
 * 返回上一级页面，无历史记录时兜底到首页。
 */
function goBackPrevious(): void {
  if (globalThis.history.length > 1) {
    router.back();
    return;
  }
  router.push(ROUTE_PATHS.home);
}

/**
 * 切换应用语言并同步到全局 i18n。
 */
function onLanguageChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  settingsStore.setLanguage(target.value as AppLanguage);
}

/**
 * 切换应用窗口尺寸档位。
 */
function onWindowSizeChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  settingsStore.setWindowSize(target.value as AppWindowSize);
}

/**
 * 切换任务完成提醒开关，并立即持久化。
 */
function onTaskDoneNotificationChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  settingsStore.setTaskDoneNotificationEnabled(target.checked);
}
</script>

<template>
  <div class="settings-page">
    <ToolPageTopBar
      variant="compact"
      compact-leading-icon="back"
      :show-settings-button="false"
      title-key="common.back"
      @back-home="goBackPrevious"
      @open-settings="goBackPrevious"
    />

    <main class="settings-main">
      <section class="setting-section">
        <h2>{{ $t("pages.settings.menu.general") }}</h2>
        <article class="setting-row">
          <div>
            <h3>{{ $t("pages.settings.general.languageTitle") }}</h3>
            <p>{{ $t("pages.settings.general.languageDesc") }}</p>
          </div>
          <select class="language-select" :value="language" @change="onLanguageChange">
            <option v-for="item in LANGUAGES" :key="item" :value="item">
              {{ item }}
            </option>
          </select>
        </article>

        <article class="setting-row">
          <div>
            <h3>{{ $t("pages.settings.general.windowSizeTitle") }}</h3>
            <p>{{ $t("pages.settings.general.windowSizeDesc") }}</p>
          </div>
          <select class="language-select" :value="windowSize" @change="onWindowSizeChange">
            <option
              v-for="item in WINDOW_SIZE_OPTIONS"
              :key="item.value"
              :value="item.value"
            >
              {{ `${$t(`pages.settings.general.windowSize${item.value.charAt(0).toUpperCase()}${item.value.slice(1)}Title`)} (${item.width} × ${item.height})` }}
            </option>
          </select>
        </article>
      </section>

      <section class="setting-section">
        <h2>{{ $t("pages.settings.menu.notifications") }}</h2>
        <article class="setting-row">
          <div>
            <h3>{{ $t("pages.settings.notifications.taskDoneTitle") }}</h3>
            <p>{{ $t("pages.settings.notifications.taskDoneDesc") }}</p>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              :checked="taskDoneNotificationEnabled"
              @change="onTaskDoneNotificationChange"
            />
            <span>{{ taskDoneNotificationEnabled ? $t("pages.settings.actions.on") : $t("pages.settings.actions.off") }}</span>
          </label>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.settings-page {
  background: #fff;
  min-height: calc(100vh - 48px);
  border-radius: 16px;
  overflow: hidden;
  padding-top: 74px;
}
.settings-page :deep(.tool-top-bar) {
  box-shadow: 0 8px 14px rgba(15, 23, 42, 0.06);
}
.settings-main {
  padding: 32px;
  background: #f8fafc;
}
.setting-section {
  margin-bottom: 16px;
}
.setting-section h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 20px;
  line-height: 28px;
}
.setting-row {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-top: 8px;
}
.setting-row h3 {
  margin: 0;
  color: #111827;
  font-size: 16px;
  line-height: 24px;
}
.setting-row p {
  margin: 4px 0 0;
  color: #6b7280;
  line-height: 20px;
}
.language-select {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #111827;
  padding: 10px 12px;
  min-width: 140px;
}
.switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #111827;
  font-weight: 600;
}
@media (max-width: 768px) {
  .settings-main {
    padding: 16px;
  }
  .setting-row {
    flex-direction: column;
    align-items: stretch;
  }
  .language-select {
    width: 100%;
  }
}
</style>
