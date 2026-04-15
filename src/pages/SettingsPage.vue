<script setup lang="ts">
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import ToolPageTopBar from "@/components/common/ToolPageTopBar.vue";
import { ROUTE_PATHS } from "@/config/constants";
import { LANGUAGES, type AppLanguage } from "@/types/settings";
import { useSettingsStore } from "@/stores/settings.store";

const router = useRouter();
const settingsStore = useSettingsStore();
const { language } = storeToRefs(settingsStore);

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
      </section>
    </main>

    <!--
      <div class="settings-layout">
        <aside class="settings-side">
          <button v-for="item in menuItems" :key="item.key" type="button" class="menu-item" :class="{ 'menu-item--active': item.active }">
            {{ $t(item.key) }}
          </button>
          <div class="restart-tip">
            <h4>{{ $t("pages.settings.restartTipTitle") }}</h4>
            <p>{{ $t("pages.settings.restartTipDesc") }}</p>
            <button type="button">{{ $t("pages.settings.restartApp") }}</button>
          </div>
        </aside>
      </div>
    -->

    <!--
      <section class="setting-section">
        <h2>{{ $t("pages.settings.menu.tools") }}</h2>
      </section>
      <section class="setting-section">
        <h2>{{ $t("pages.settings.menu.account") }}</h2>
      </section>
      <section class="setting-section">
        <h2>{{ $t("pages.settings.menu.notifications") }}</h2>
      </section>
      <section class="setting-section">
        <h2>{{ $t("pages.settings.menu.privacy") }}</h2>
      </section>
      <section class="about-card">
        <h2>{{ $t("pages.settings.menu.about") }}</h2>
      </section>
    -->

    <!--
      <article class="setting-row">
        <h3>{{ $t("pages.settings.general.darkModeTitle") }}</h3>
      </article>
      <article class="setting-row">
        <h3>{{ $t("pages.settings.general.autoLaunchTitle") }}</h3>
      </article>
      <article class="setting-row">
        <h3>{{ $t("pages.settings.general.scaleTitle") }}</h3>
      </article>
      <article class="setting-row">
        <h3>{{ $t("pages.settings.general.defaultSaveTitle") }}</h3>
      </article>
    -->
  </div>
</template>

<style scoped>
.settings-page {
  background: #fff;
  min-height: calc(100vh - 48px);
  border-radius: 16px;
  overflow: hidden;
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
