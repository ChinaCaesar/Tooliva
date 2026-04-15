<script setup lang="ts">
import SideNav from "@/components/navigation/SideNav.vue";
</script>

<template>
  <div class="layout">
    <SideNav />
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  background: #f4f7fb;
}

.content {
  flex: 1;
  padding: 24px;
}
</style>
