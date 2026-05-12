import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";
import { ROUTE_PATHS } from "@/config/constants";
import AppShellLayout from "@/layouts/app-shell/AppShellLayout.vue";
import HomePage from "@/pages/HomePage.vue";
import VideoConvertPage from "@/pages/VideoConvertPage.vue";
import ImageCompressPage from "@/pages/ImageCompressPage.vue";
import ImageUpscalePage from "@/pages/ImageUpscalePage.vue";
import ImageWatermarkPage from "@/pages/ImageWatermarkPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";
import MembershipPage from "@/pages/MembershipPage.vue";

const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.home,
    component: AppShellLayout,
    children: [
      { path: "", name: "home", component: HomePage },
      { path: ROUTE_PATHS.settings.replace(/^\//, ""), name: "settings", component: SettingsPage },
      { path: ROUTE_PATHS.membership.replace(/^\//, ""), name: "membership", component: MembershipPage }
    ]
  },
  { path: ROUTE_PATHS.videoConvert, name: "video-convert", component: VideoConvertPage },
  { path: ROUTE_PATHS.imageCompress, name: "image-compress", component: ImageCompressPage },
  { path: ROUTE_PATHS.imageUpscale, name: "image-upscale", component: ImageUpscalePage },
  { path: ROUTE_PATHS.imageWatermark, name: "image-watermark", component: ImageWatermarkPage }
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});
