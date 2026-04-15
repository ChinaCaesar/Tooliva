<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useToolStore } from "@/stores/tool.store";

const toolStore = useToolStore();
const { enabledTools } = storeToRefs(toolStore);
</script>

<template>
  <section class="panel">
    <h1>{{ $t("pages.tools.title") }}</h1>
    <div class="tool-list">
      <article v-for="tool in enabledTools" :key="tool.id" class="tool-item">
        <h3>{{ $t(tool.nameKey) }}</h3>
        <p>{{ $t(tool.descriptionKey) }}</p>
        <small>{{ $t(`toolCategory.${tool.category}`) }}</small>
      </article>
    </div>
  </section>
</template>
