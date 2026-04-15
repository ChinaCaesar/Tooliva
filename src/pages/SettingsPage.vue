<script setup lang="ts">
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ROUTE_PATHS } from "@/config/constants";
import { LANGUAGES, type AppLanguage } from "@/types/settings";
import { useSettingsStore } from "@/stores/settings.store";

const router = useRouter();
const settingsStore = useSettingsStore();
const { language, defaultOutputDirectory } = storeToRefs(settingsStore);

/**
 * 返回首页，统一设置页返回入口。
 */
function goBackHome(): void {
  router.push(ROUTE_PATHS.home);
}

function onLanguageChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  settingsStore.setLanguage(target.value as AppLanguage);
}

function onOutputChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  settingsStore.setDefaultOutputDirectory(target.value);
}
</script>

<template>
  <section class="panel">
    <button type="button" class="back-btn" @click="goBackHome">
      {{ $t("common.backToHome") }}
    </button>
    <h1>{{ $t("pages.settings.title") }}</h1>

    <div class="form-item">
      <label for="lang">{{ $t("common.language") }}</label>
      <select id="lang" :value="language" @change="onLanguageChange">
        <option v-for="item in LANGUAGES" :key="item" :value="item">
          {{ item }}
        </option>
      </select>
    </div>

    <div class="form-item">
      <label for="output">{{ $t("common.outputDirectory") }}</label>
      <input id="output" :value="defaultOutputDirectory" type="text" @input="onOutputChange" />
    </div>
  </section>
</template>

<style scoped>
.back-btn {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  padding: 6px 12px;
  cursor: pointer;
  margin-bottom: 12px;
}

.form-item {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
