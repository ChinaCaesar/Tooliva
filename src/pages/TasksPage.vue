<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useTaskStore } from "@/stores/task.store";

const taskStore = useTaskStore();
const { activeTasks, historyTasks } = storeToRefs(taskStore);
const { t } = useI18n();

function createDemoTask(): void {
  const task = taskStore.createTask("image-resize", "demo");
  taskStore.updateTaskProgress(task.id, 50, t("pages.tasks.demoMessage"));
}
</script>

<template>
  <section class="panel">
    <h1>{{ $t("pages.tasks.title") }}</h1>
    <button class="btn" type="button" @click="createDemoTask">{{ $t("pages.tasks.createDemoTask") }}</button>

    <h2>{{ $t("common.active") }}</h2>
    <div v-if="activeTasks.length === 0">{{ $t("common.noData") }}</div>
    <article v-for="task in activeTasks" :key="task.id" class="task-item">
      <div>{{ task.id }}</div>
      <div>{{ task.status }} - {{ task.progress }}%</div>
      <div>{{ task.message }}</div>
    </article>

    <h2>{{ $t("common.history") }}</h2>
    <div v-if="historyTasks.length === 0">{{ $t("common.noData") }}</div>
    <article v-for="task in historyTasks" :key="task.id" class="task-item">
      <div>{{ task.id }}</div>
      <div>{{ task.status }}</div>
      <div>{{ task.message }}</div>
    </article>
  </section>
</template>
