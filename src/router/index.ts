import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";
import { ROUTE_PATHS } from "@/config/constants";
import HomePage from "@/pages/HomePage.vue";
import VideoConvertPage from "@/pages/VideoConvertPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";
import MembershipPage from "@/pages/MembershipPage.vue";

const routes: RouteRecordRaw[] = [
  { path: ROUTE_PATHS.home, name: "home", component: HomePage },
  { path: ROUTE_PATHS.videoConvert, name: "video-convert", component: VideoConvertPage },
  { path: ROUTE_PATHS.settings, name: "settings", component: SettingsPage },
  { path: ROUTE_PATHS.membership, name: "membership", component: MembershipPage }
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});
