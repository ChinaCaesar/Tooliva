## Why

首轮首页仪表盘上线后，对照最新参考稿验收发现：侧栏标题等多处文案显示为原始 i18n 键名（配置路径与语言包路径不一致）；「高频使用工具」与参考稿不符且产品不再需要；「最近使用」区块版式与参考稿差距较大；主推工具卡在字号、间距、圆角与层次上与参考稿不一致。需在不大改信息架构的前提下完成视觉与文案对齐，并清理废弃能力。

## What Changes

- **移除「高频使用工具」**：删除首页该分栏及相关 UI、事件、`useHomePageData` 中对 `topTools`/`frequentTools` 的装配与 SQLite 回填逻辑；删除或收敛仅被该功能使用的 mock、类型与 i18n 键（若其他页面未引用）。
- **「最近使用」按参考稿重做**：改为单列表区域（标题 +「查看全部」+ 横向/条目样式与参考一致），去掉双列分栏；条目展示图标、名称、相对时间与可选文件名样式，与参考稿密度与圆角一致。
- **修复多语言键名一致性**：统一 `home.config.ts`、`HomePage.vue` 与各组件中引用的键与 `zh-CN` / `en-US` 中实际嵌套路径一致（例如侧栏标题统一为 `pages.home.sections.sidebar.*`）；全量检索 `pages.home.` 前缀键，避免遗漏。
- **主推工具区视觉细调**：按参考稿调整卡片最小高度、内边距、标题与描述字号行高、图标尺寸、「立即使用」样式与阴影；必要时微调 `HomeValuePropsStrip`、`HomeGreetingHero`、顶栏与页脚的间距阶梯，使整页 rhythm 与参考稿接近。

## Capabilities


### New Capabilities

- `home-dashboard-reference`：定义首页与参考稿对齐后的可见模块集合、侧栏与主区文案可解析性、移除高频区后的数据行为，以及最近使用区版式与主推卡视觉基线。

### Modified Capabilities

- 无（主规格目录 `openspec/specs/` 当前无已归档的 `home-dashboard` 主规格条目；本次以变更内 delta 规格承载验收项。）

## Impact

- 前端：`HomePage.vue`、`RecentUsageList.vue`、`HomeFeaturedToolsRow.vue`、`home.config.ts`、`useHomePageData.ts`、`tauriClient`/`getHomeDashboard` 消费方（若仅用于高频则收缩）、`home.mock.ts`、`types/home.ts`、`zh-CN.ts`、`en-US.ts`。
- 后端：若 `getHomeDashboard` 仅因高频工具而返回 `topTools`，可保留字段但前端不再使用，或同步精简接口与 Rust 实现（按任务拆分，避免无谓破坏）。
- 文档：与上一变更 `home-dashboard-one-screen-upgrade` 的规格在语义上连续，本变更侧重「参考稿对齐与缺陷修复」。
