import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";
import { ROUTE_PATHS } from "@/config/constants";
import AppShellLayout from "@/layouts/app-shell/AppShellLayout.vue";
import HomePage from "@/pages/HomePage.vue";
import ImageCompressPage from "@/pages/ImageCompressPage.vue";
import VideoToGifPage from "@/pages/VideoToGifPage.vue";
import ImageUpscalePage from "@/pages/ImageUpscalePage.vue";
import ImageWatermarkPage from "@/pages/ImageWatermarkPage.vue";
import ImageWatermarkRemovalPage from "@/pages/ImageWatermarkRemovalPage.vue";
import VideoWatermarkRemovalPage from "@/pages/VideoWatermarkRemovalPage.vue";
import GifCompressPage from "@/pages/GifCompressPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";
import MembershipPage from "@/pages/MembershipPage.vue";
import LoginPage from "@/pages/LoginPage.vue";

const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.home,
    component: AppShellLayout,
    children: [
      { path: "", name: "home", component: HomePage },
      { path: ROUTE_PATHS.settings.replace(/^\//, ""), name: "settings", component: SettingsPage },
      { path: ROUTE_PATHS.membership.replace(/^\//, ""), name: "membership", component: MembershipPage },
      { path: ROUTE_PATHS.imageWatermark.replace(/^\//, ""), name: "image-watermark", component: ImageWatermarkPage },
      { path: ROUTE_PATHS.imageCompress.replace(/^\//, ""), name: "image-compress", component: ImageCompressPage },
      { path: ROUTE_PATHS.videoToGif.replace(/^\//, ""), name: "video-to-gif", component: VideoToGifPage },
      { path: ROUTE_PATHS.imageUpscale.replace(/^\//, ""), name: "image-upscale", component: ImageUpscalePage },
      {
        path: ROUTE_PATHS.imageWatermarkRemoval.replace(/^\//, ""),
        name: "image-watermark-removal",
        component: ImageWatermarkRemovalPage
      },
      {
        path: ROUTE_PATHS.videoWatermarkRemoval.replace(/^\//, ""),
        name: "video-watermark-removal",
        component: VideoWatermarkRemovalPage
      },
      { path: ROUTE_PATHS.gifCompress.replace(/^\//, ""), name: "gif-compress", component: GifCompressPage }
    ]
  },
  { path: ROUTE_PATHS.login, name: "login", component: LoginPage }
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});
