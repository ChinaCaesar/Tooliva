<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/stores/settings.store";
import { useToolStore } from "@/stores/tool.store";

const settingsStore = useSettingsStore();
const toolStore = useToolStore();
const { favoriteToolIds } = storeToRefs(settingsStore);
const { enabledTools } = storeToRefs(toolStore);

const favoriteTools = computed(() => enabledTools.value.filter((tool) => favoriteToolIds.value.includes(tool.id)));
</script>

<template>
  <section class="panel">
    <h1>{{ $t("pages.favorites.title") }}</h1>
    <div v-if="favoriteTools.length === 0">{{ $t("common.noData") }}</div>
    <article v-for="tool in favoriteTools" :key="tool.id" class="tool-item">
      <h3>{{ $t(tool.nameKey) }}</h3>
      <p>{{ $t(tool.descriptionKey) }}</p>
    </article>
  </section>
</template>
