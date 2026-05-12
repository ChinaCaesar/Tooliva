## 1. 多语言键修复

- [x] 1.1 将 `home.config.ts` 中侧栏 `titleKey` / `learnMoreKey` / `ctaKey` / `viewAllKey` 等改为与 `zh-CN.ts`、`en-US.ts` 一致的 `pages.home.sections.sidebar.*` 路径。
- [x] 1.2 全仓库检索 `pages.home.sidebar`、`pages.home.sections.sidebar` 与 `t('pages.home` 调用，修复任何仍指向不存在路径的键；在双语下目检首页无键名泄漏。

## 2. 移除高频使用工具

- [x] 2.1 从 `RecentUsageList.vue` 移除右列、相关 props、样式与 `frequent-tool-click` 事件。
- [x] 2.2 从 `HomePage.vue` 移除高频相关 props 传递、`handleFrequentToolClick` 与 `useHomePageData` 解构中的 `frequentTools`。
- [x] 2.3 从 `useHomePageData.ts` 移除 `frequentTools` 状态、`createEmptyFrequentTools`、`hydrateDashboardFromSqlite` 中对 `topTools` 的映射；删除或标记废弃仅服务高频的 mock/类型（若 `HOME_QUICK_ACTIONS` 等仍被别处使用则保留）。
- [x] 2.4 清理 `zh-CN` / `en-US` 中不再使用的「高频使用工具」等文案键（确认无其他引用后删除）。

## 3. 最近使用 UI 对齐参考稿

- [x] 3.1 将 `RecentUsageList.vue` 重构为单列布局：标题行 +「查看全部」+ 条目列表（条目为横向信息行：图标区、主文案、副文案、相对时间），空态与数据行为与现逻辑一致。
- [x] 3.2 调整该区块圆角、背景、分隔与间距，使与参考稿视觉一致；在窄视口下验收换行与不裁切。

## 4. 主推卡与全页节奏细调

- [x] 4.1 在 `HomeFeaturedToolsRow.vue` 中按参考稿调整卡片 `border-radius`、`padding`、`min-height`、标题/描述字号行高、图标尺寸、阴影与 `立即使用` 样式。
- [x] 4.2 视需要微调 `HomePage.vue`、`HomeGreetingHero.vue`、`HomeValuePropsStrip.vue` 与侧栏卡片的纵向间距，使整页与参考稿密度接近。

## 5. 验证

- [x] 5.1 执行 `pnpm run build`；在应用中切换中/英文检查首页侧栏与最近使用、主推区无异常。
- [x] 5.2 对照参考截图做一轮目检记录（可选：在 PR 描述中附前后对比说明）。
