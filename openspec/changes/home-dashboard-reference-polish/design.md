## Context

- 变更 `home-dashboard-one-screen-upgrade` 已实现仪表盘骨架；测试发现 `home.config.ts` 中侧栏标题等键写为 `pages.home.sidebar.*`，而语言包实际挂在 `pages.home.sections.sidebar.*`，导致界面渲染为键字符串。
- 「最近使用」当前为左右双列（含高频工具列），与参考稿中单区域「最近使用 + 查看全部 + 条目列表」不一致。
- 参考稿对主推卡片的圆角、阴影、字号与纵向节奏有更细要求，需在前端以设计 token 或组件级样式统一收紧。

## Goals / Non-Goals

**Goals:**

- 所有面向用户的首页文案必须通过存在的 i18n 路径解析为自然语言，不得出现 `pages.home.*` 原始键名。
- 首页不再展示「高频使用工具」及其数据链路；最近使用区版式与参考稿一致（单区域列表）。
- 主推工具卡与全页间距、字号与参考稿显著缩小差距（在默认 1200×720 窗口下目检对齐）。

**Non-Goals:**

- 不重画整套设计系统 token 全站推广；仅首页相关组件与配置。
- 不在本变更中新增录屏等未上线工具路由。

## Decisions

1. **i18n 键名单一来源**
   - **做法**：以语言包为准，将 `HOME_PAGE_CONFIG` 中侧栏相关 `*Key` 全部改为 `pages.home.sections.sidebar.*` 前缀；并在实现阶段用脚本或人工全仓库检索 `pages.home.sidebar` 残留。
   - **备选**：改语言包嵌套到 `pages.home.sidebar`——否决，已与 mock 及大量文案一致在 `sections` 下。

2. **移除高频工具**
   - **做法**：删除 `RecentUsageList` 右列与 props；从 `useHomePageData` 移除 `frequentTools` 状态、`createEmptyFrequentTools`、`hydrate` 内对 `dashboard.topTools` 的映射；`HomePage` 删除对应事件。若 Rust `getHomeDashboard` 仍计算 `topTools`，可暂留后端字段避免破坏性变更，前端忽略即可。
   - **备选**：保留数据仅隐藏 UI——否决，产品明确不再需要。

3. **最近使用版式**
   - **做法**：`RecentUsageList` 改为单列：标题行（左标题右「查看全部」）+ 若干横向条目卡片（参考稿为小横条/卡片：左图标块、中间主副文案、右相对时间）；条目数量与空态逻辑沿用现有 3 条占位策略。
   - **备选**：使用 CSS grid 多列——以参考稿为准选单列横向滚动或纵向堆叠。

4. **主推卡视觉**
   - **做法**：在 `HomeFeaturedToolsRow.vue` 内集中调整 `border-radius`（约 12–16px）、`padding`、`min-height`、标题 16–18px、描述 12–13px、图标 48px 档、阴影与 hover；必要时略减 `gap` 与 `HomePage` 主区内 `padding`。
   - **验收**：与提供的参考截图并排对比，允许 ±2px 误差。

## Risks / Trade-offs

- **[风险] 删除高频后 SQLite 仍写入 topTools** → [缓解] 后端可保留写入；前端不读即可，后续单独清理。
- **[风险] 仅修 config 漏改某处硬编码键** → [缓解] tasks 中列「全仓库 grep `pages.home.sidebar`」验收项。

## Migration Plan

1. 分支上先修 i18n 键与高频删除，确保构建通过；再改最近使用与主推样式。
2. 合并前在 `zh-CN` / `en-US` 切换下目检侧栏三卡标题与列表项。
3. 回滚：恢复相关 Vue 与 composable 文件至上一版本。

## Open Questions

- 「查看全部」最终跳转目标（任务中心路由或对话框）是否保持现状占位即可。
- 主推卡渐变是否必须与参考稿色值逐色一致，或允许在现有品牌色基础上微调。
