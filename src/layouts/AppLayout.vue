<script setup lang="ts">
import AppNotificationContainer from "@/components/common/AppNotificationContainer.vue";
</script>

<template>
  <div class="layout">
    <main class="content">
      <RouterView />
    </main>
    <AppNotificationContainer />
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  background: #f4f7fb;
}

.content {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.content :deep(.panel) {
  margin: 24px;
}
</style>
