/// <reference types="vite/client" />

import "vue-router";

declare global {
  /** App 版本号；来自 `.env.*` 的 `APP_VERSION`，由 `vite.config.ts` 构建期注入。 */
  const __APP_VERSION__: string;
}

declare module "vue-router" {
  interface RouteMeta {
    /**
     * 为 true 时在 AppShellLayout 中隐藏左侧 AppSidebar（首页不受此项影响）。
     * 需要全宽内容区的壳内子页可设置此项，避免再按 path 硬编码特例。
     */
    hideAppSidebar?: boolean;
  }
}

declare module "*.vue" {
  /* 避免在 .d.ts 内从 "vue" 做类型导入（Bundler 解析下会触发 TS2307），由 vue-tsc 校验各 SFC。 */
  const component: any;
  export default component;
}
