import { createApp } from "vue";
import App from "@/App.vue";
import { registerAuthDeepLinkListener } from "@/auth/register-deep-link";
import { registerAppPlugins } from "@/plugins";
import { useAuthStore } from "@/stores/auth.store";
import { useSettingsStore } from "@/stores/settings.store";
import "@/styles/base.css";

const app = createApp(App);
registerAppPlugins(app);

const settingsStore = useSettingsStore();
const authStore = useAuthStore();

/**
 * 应用启动前先同步用户配置，避免首屏出现语言/设置闪动。
 */
async function bootstrap(): Promise<void> {
  await settingsStore.hydrate();
  authStore.hydrate();
  await registerAuthDeepLinkListener();
  app.mount("#app");
}

void bootstrap();
