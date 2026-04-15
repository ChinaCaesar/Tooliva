<script setup lang="ts">
import { storeToRefs } from "pinia";
import { LANGUAGES, type AppLanguage } from "@/types/settings";
import { useSettingsStore } from "@/stores/settings.store";

const settingsStore = useSettingsStore();
const { language, defaultOutputDirectory } = storeToRefs(settingsStore);

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
.form-item {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
