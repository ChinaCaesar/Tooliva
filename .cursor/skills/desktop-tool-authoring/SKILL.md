---
name: desktop-tool-authoring
description: 在桌面工具箱（Vue+Tauri）中新增或扩展壳内工具的标准流程。用户提到新工具、tools.registry、首页卡片、侧栏入口、ImageCompress 类页面、批量任务、useBatchTask、batchService、壳层布局、工具页脚手架时使用；Agent 必须先读本 Skill 再改代码。
---

# desktop-tool-authoring

## 必读仓库路径（按顺序打开）

- `src/config/tools.registry.ts` — 工具元数据单一来源
- `src/pages/home/config/homeToolRoutes.ts` — `actionCode` → 路由
- `src/config/constants.ts` — `ROUTE_PATHS`
- Vue Router 注册处（与 `ROUTE_PATHS` 同步的页面组件）
- `src/modules/batch/` — `batchService.ts`、`useBatchTask.ts`、`types.ts`
- `src/pages/shared/useTaskBatchNotification.ts`
- `src/stores/notification.store.ts`、`src/stores/settings.store.ts`（任务完成提醒等）

验收规格摘要：`openspec/changes/tool-development-workflow-skills/specs/desktop-tool-authoring-workflow/spec.md`（归档前位于 change 目录；若已归档则读 `openspec/specs/` 下对应增量合并结果）。

---

## 阶段 0：需求确认

在写代码前从需求方收集以下信息（可直接复制「需求提示语模板」填空）：

- 工具 `key` / `actionCode` 命名（kebab-case，与埋点一致）
- 输入文件类型、输出格式、默认输出目录策略（是否覆盖源文件、重名序号规则以后端批量模块为准）
- 是否需要列表 + 批量处理；单文件实时预览是否仅 UI 侧（不阻塞批量管线）
- 错误与取消：失败项是否继续整批、用户取消后期望状态
- 文案语言：首页三件套 `titleKey` / `shortTitleKey` / `descriptionKey` 的语义
- 无障碍：主流程是否必须键盘可达

**验收**：形成一段可交给 Agent 的完整自然语言需求（见下文模板）。

---

## 阶段 1：注册表

1. 在 `TOOLS_REGISTRY_RAW` 追加 `AppToolDef`：`key`、`iconKey`（`HomeAssetKey` 已存在或先扩展资源）、`titleKey`、`shortTitleKey`、`descriptionKey`、`gradient`、`actionCode`、`recommended`、`sortOrder`。
2. 保证 `key` 全局唯一（文件内已有运行时校验）。

**验收**：`getAllToolsSorted()` 能列出该项（要求 `resolveHomeToolRoute` 非空，见阶段 2）。

---

## 阶段 2：路由与常量

1. 在 `ROUTE_PATHS` 增加路径常量。
2. 在 `resolveHomeToolRoute` 增加 `actionCode` 分支。
3. 注册路由与懒加载页面组件，与现有工具页同级。

**验收**：从首页/侧栏点击入口可进入；刷新深链可恢复。

---

## 阶段 3：页面与壳层

1. 新页面 MUST 处于应用壳内，复用与其它工具页相同的 **header、左侧 `AppSidebar`、footer** 模式（对照任意已发布工具页根布局结构）。
2. **内容区**按功能实现；栅格与窄屏行为须遵守主规格 `openspec/specs/tool-page-shell-layout/spec.md` 与 `openspec/specs/app-shell-sidebar/spec.md`。
3. **复杂页（如视频转 GIF）**：允许步骤文案、分区标题、警告提示单独撰写 i18n；**字体家族、字号阶梯、主色/中性色、圆角、间距、按钮层级**须与现有工具对齐，不得自成一套视觉体系。

**验收**：从设置页带侧栏进入新工具，侧栏仍可见且激活态正确。

---

## 阶段 4：国际化

1. 为首页卡片添加 `pages.home.tools.<camelCase>.{title,shortTitle,description}`（与现有四项命名一致）。
2. 页面内可见字符串全部走 `vue-i18n`，禁止中文硬编码（开发期临时字符串除外，合并前必须键化）。

**验收**：切换语言无裸露键名；首页与页面标题一致。

---

## 阶段 5：批量任务与通知（前端边界）

1. **唯一入口**：通过 `src/modules/batch/` 的 `submitBatchTask`、`listenBatchProgress`、`pauseBatchTask` / `resumeBatchTask` / `cancelBatchTask` 等与调度器交互；组合式封装优先 `useBatchTask`。
2. **禁止**：在页面/业务 composable 里为**同一批处理流水线**再写一套直接 `invoke('…')` 绕过 `batchService`（模块头注释已声明此约定）。
3. 批次结束如需全局通知/音效：使用 `useTaskBatchNotification`，并尊重 `useSettingsStore` 中与「任务完成提醒」相关的开关。
4. UI 仅负责：参数收集、列表与预览、提交任务、展示进度与失败列表、触发打开输出目录等；**不**在 UI 线程执行重计算、不重复实现后端已有编解码逻辑。

**非批量例外**：若业务确为单次、非队列型且永久不会扩展为多文件批处理，必须在 PR 说明中论证；仍应避免与批量事件模型混用造成双进度源。

**验收**：取消与进度行为与既有图片类工具一致；设置关闭完成提醒时不弹全局通知/不播放提示音。

---

## 阶段 6（可选）：Rust / Tauri

1. 新处理器：在 `src-tauri` 批量框架中注册 Processor（细节见 `openspec/changes/batch-task-scheduler/` 与 `.cursor/skills/image-processing-core/SKILL.md`）。
2. 保持「先写临时文件再 rename、取消时清理」等与现有调度器一致的安全策略。

---

## UI/UX 协作

- 涉及布局、表单、空状态、密度与动效时：**必须**读取并遵循工作区 `.cursor/skills/ui-ux-pro-max/SKILL.md`。
- 若提供 **Miaoduo / Motiff 链接或高保真效果图**：优先 `.cursor/skills/miaoduo-design-to-page/SKILL.md` 做结构映射，再用现有工具页的 token 与组件模式「落地」，避免设计与实现两套主题。

---

## 需求提示语模板（复制填空）

```text
【工具标识】actionCode：____   展示标题（中文）：____
【入口】首页主推：是/否   sortOrder：____
【输入】扩展名/大小上限：____   多选/拖入：____
【输出】格式：____   目录策略：默认桌面/上次目录/与源同目录（选）____
【处理】是否走批量调度器 task type：____   单文件选项 JSON 形状（字段说明）：____
【并发与取消】是否需要暂停：____   失败是否继续整批：____
【文案】需要单独提示的长说明（如视频时长/编码限制）：____
【无障碍】主流程 Tab 顺序特殊点：无 / 有（说明）____
【参考页】默认对齐：ImageCompressPage / 其它：____
```

---

## PR / MR 自检清单（与 OpenSpec Requirement 对齐）

- [ ] 注册表项齐全且 `key` 唯一；`resolveHomeToolRoute` 已配置
- [ ] `ROUTE_PATHS`、路由表、`homeToolRoutes` 三者一致
- [ ] 壳层布局与侧栏行为符合 `tool-page-shell-layout` / `app-shell-sidebar`
- [ ] 批量路径仅经 `src/modules/batch/`，无重复 `invoke` 调度
- [ ] 完成通知走 `useTaskBatchNotification`（或等价）且尊重设置开关
- [ ] i18n 键完整，首页三件套已加
- [ ] UI 已对照 `ui-ux-pro-max` 自检；复杂页未漂移全局 token
- [ ] （若有后端）Processor 注册与临时文件策略符合 batch 设计

---

## 变更同步（维护者）

若以下任一发生变更，必须同步更新本 Skill 对应小节：

- `SubmitBatchTaskPayload` / Tauri 命令名 / 事件名
- `AppToolDef` 字段或 `TOOLS_REGISTRY_RAW` 校验逻辑
- `resolveHomeToolRoute` 或 `normalizeRegistryActionCode` 行为
- 壳层布局组件职责拆分

---

## 与相关 Skill 的分工

| Skill | 何时叠加 |
|--------|----------|
| `ui-ux-pro-max` | 任何可见 UI 的新增或较大改版 |
| `miaoduo-design-to-page` | 有设计稿/节点链接时 |
| `image-processing-core` | Rust 图片管线、Processor、进度与 tile 等 |
| `vue-1.0.1` / `vue-expert-0.1.0` | 组合式 API、Pinia、路由边缘案例 |
