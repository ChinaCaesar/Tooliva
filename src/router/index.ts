import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";
import { ROUTE_PATHS } from "@/config/constants";
import HomePage from "@/pages/HomePage.vue";
import ToolsPage from "@/pages/ToolsPage.vue";
import FavoritesPage from "@/pages/FavoritesPage.vue";
import TasksPage from "@/pages/TasksPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";
import MembershipPage from "@/pages/MembershipPage.vue";

const routes: RouteRecordRaw[] = [
  { path: ROUTE_PATHS.home, name: "home", component: HomePage },
  { path: ROUTE_PATHS.tools, name: "tools", component: ToolsPage },
  { path: ROUTE_PATHS.favorites, name: "favorites", component: FavoritesPage },
  { path: ROUTE_PATHS.tasks, name: "tasks", component: TasksPage },
  { path: ROUTE_PATHS.settings, name: "settings", component: SettingsPage },
  { path: ROUTE_PATHS.membership, name: "membership", component: MembershipPage }
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});
