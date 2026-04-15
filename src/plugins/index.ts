import type { App } from "vue";
import { createPinia } from "pinia";
import { i18n } from "@/i18n";
import { router } from "@/router";

/**
 * 统一注册应用插件，确保初始化顺序可控。
 */
export function registerAppPlugins(app: App): void {
  const pinia = createPinia();
  app.use(pinia);
  app.use(i18n);
  app.use(router);
}
