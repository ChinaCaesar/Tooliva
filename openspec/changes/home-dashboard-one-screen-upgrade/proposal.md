## Why

当前首页已具备基础组件拆分，但信息架构与视觉层级与目标参考稿不一致；同时缺少对「推荐视口下一屏无页面级滚动」的明确约定与可验收行为，不利于桌面端 Tauri 窗口缩放场景下的体验一致性与后续迭代维护。

## What Changes

- 按参考稿重组首页主区与侧栏：问候与主视觉区、横向主推工具卡（含「更多/即将推出」占位）、最近使用、底部价值卖点横条；侧栏调整为安全说明、会员权益、更新日志等卡片化模块（具体文案与是否接支付能力由实现阶段按产品占位策略落地）。
- 建立**一屏与自适应**的版面约束：在约定的最小窗口宽高内，页面级不出现滚动条；小于该阈值时允许降级（例如主区或侧栏内部滚动、或断点下栈式布局并放宽「一屏」约束），并在规格中写清验收口径。
- 继续强化**组件化**：页面容器仅负责编排与路由类事件；各区块为独立 Vue 组件；视图模型与静态配置集中在 `composables` 与 `config`/`types`，避免单文件膨胀。
- 顶栏与页脚在视觉与信息上与参考稿对齐（搜索占位、快捷键提示、版本与 slogan 等），在不影响既有 Tauri 窗口行为的前提下协调样式。

## Capabilities

### New Capabilities

- `home-dashboard`：定义首页仪表盘布局、一屏与断点降级、侧栏与主区模块信息架构及可访问性/交互相关的需求与场景。

### Modified Capabilities

- 无（`openspec/specs/` 下当前无既有能力规格，本次不引入对已发布规格的增量修改文件）。

## Impact

- 前端：`src/pages/HomePage.vue`、`src/pages/home/components/*`、`src/pages/home/config/home.config.ts`、`src/pages/home/composables/useHomePageData.ts`、多语言 `locales` 中与首页相关的文案键。
- 资源：`src/pages/home/resources/homeAssets.ts` 及新增插图或图标资源路径（若采用静态图）。
- 后端：无强制变更；若「最近使用」或「更新日志」后续接真实数据源，可在本变更之后单独演进。
