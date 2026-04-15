<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ROUTE_PATHS } from "@/config/constants";

const route = useRoute();

const navItems = computed(() => [
  { path: ROUTE_PATHS.home, key: "nav.home" },
  { path: ROUTE_PATHS.tools, key: "nav.tools" },
  { path: ROUTE_PATHS.favorites, key: "nav.favorites" },
  { path: ROUTE_PATHS.tasks, key: "nav.tasks" },
  { path: ROUTE_PATHS.settings, key: "nav.settings" },
  { path: ROUTE_PATHS.membership, key: "nav.membership" }
]);
</script>

<template>
  <aside class="side-nav">
    <RouterLink
      v-for="item in navItems"
      :key="item.path"
      class="nav-item"
      :class="{ active: route.path === item.path }"
      :to="item.path"
    >
      {{ $t(item.key) }}
    </RouterLink>
  </aside>
</template>

<style scoped>
.side-nav {
  width: 220px;
  border-right: 1px solid #e8ecf3;
  background: #ffffff;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  text-decoration: none;
  color: #4a5568;
  padding: 10px 12px;
  border-radius: 10px;
}

.nav-item:hover {
  background: #f3f7ff;
}

.nav-item.active {
  background: #2f6fec;
  color: #ffffff;
}
</style>
