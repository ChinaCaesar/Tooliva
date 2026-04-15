---
name: miaoduo-design-to-page
description: Build production-grade Vue pages from Miaoduo design nodes with MCP. Use when the user provides a miaoduo/motiff link and asks for high-fidelity implementation, modular components, i18n integration, config/mock/types extraction, and downloadable assets.
---

# Miaoduo Design To Page

## 适用场景

当用户出现以下需求时使用本 Skill：

- “根据妙多/Motiff 设计稿实现页面”
- “按商业项目标准还原页面，不要只做视觉”
- “需要组件化、i18n、mock、types、资源管理”
- “通过妙多 MCP 获取设计稿节点并生成页面”

## 目标

将妙多节点设计稿转为可维护的 Vue 3 + TypeScript 页面，满足：

1. 视觉高保真（优先贴近设计稿）
2. 工程可维护（模块拆分、命名清晰、低耦合）
3. 数据可配置（config/mock/types 完整）
4. 文案国际化（禁止模板硬编码文案）
5. 资源可治理（统一目录、统一索引引用）

## 执行流程

### 1) 读取项目基线

必须先确认：

- 路由与页面入口文件
- i18n 初始化与 locale 文件结构
- 样式基线（全局样式、布局容器）
- 路径别名（如 `@`）与资源引用方式

优先读取：

- `src/router/index.ts`
- `src/i18n/index.ts`
- `src/i18n/locales/*.ts`
- `src/layouts/*.vue`
- `src/styles/*.css`
- `tsconfig.json` / `vite.config.ts`

### 2) 使用妙多 MCP 拉取设计节点

必须遵守：

1. 先读取 MCP tool descriptor（schema）再调用工具
2. 从链接解析 `docId` 与 `nodeId`
3. 优先调用 `get_miaoduo_node` 获取 HTML 结构
4. 需要截图比对时调用 `get_miaoduo_node_screenshot`

从节点 HTML 中提取：

- 页面分区（TopBar、Banner、列表、卡片、侧边信息、Footer）
- 可复用结构（重复卡片、重复条目）
- 文案与标签（全部迁移到 i18n key）
- 图片 URL（全部下载到资源目录）

### 3) 资产下载与资源索引

资源规范：

- 下载路径：`resources/<page-name>/`
- 文件名：语义化 kebab-case（如 `tool-image-compress.svg`）
- 建立索引：`src/pages/<page-name>/resources/<page>Assets.ts`
- 组件只接收资源 key 或 resolved url，不写散乱路径

下载失败处理：

- 创建占位文件（如 `.placeholder.txt`）记录原始 URL
- 保证页面可运行，后续可替换

### 4) 目录分层与文件组织

推荐结构（按页面）：

```txt
src/pages/<PageName>.vue
src/pages/<page-name>/
  components/
  composables/
  config/
  mock/
  types/
  resources/
resources/<page-name>/
```

要求：

- 页面入口仅负责编排，不堆业务数据
- 组件通过 props 接收数据
- config/mock/types 与 UI 解耦

### 5) 数据建模（types/config/mock）

至少定义：

- 卡片项类型
- 列表项类型
- 按钮/入口项类型
- 统计项类型
- 资源 key 联合类型

然后：

1. 在 `mock/` 放演示数据（字段可扩展）
2. 在 `config/` 放页面结构与 key 配置
3. 在 `composables/` 做数据装配（mock -> view model）
4. 预留 API 切换点（未来替换 mock 即可）

### 6) i18n 接入

硬性规则：

- 组件模板中不允许写死中英文文案
- 标题、副标题、按钮、标签、空态、说明全部走 i18n

key 规划建议：

- `pages.<page>.topBar.*`
- `pages.<page>.sections.*`
- `pages.<page>.cards.*`
- `pages.<page>.actions.*`
- `pages.<page>.footer.*`

至少补齐：

- `zh-CN`
- `en-US`

### 7) 页面实现

实现顺序建议：

1. 页面容器（入口编排）
2. 头部/主内容/侧边/底部组件
3. 列表与卡片组件
4. 路由交互（如设置、会员、返回）
5. 响应式基础断点（避免窄屏崩布局）

### 8) 验证与交付

完成后必须执行：

- 构建验证：`npm run build`（或项目实际命令）
- 最近编辑文件 lint 检查
- 自检硬编码文案/硬编码列表
- 自检是否已抽离 types/config/mock/resources

交付内容应包含：

1. 模块拆分说明
2. 目录结构说明
3. 关键数据结构说明
4. i18n key 规划
5. 资源清单
6. API 替换点
7. 自检结论

## 快速执行清单

复制并执行：

```txt
- [ ] 读取路由/i18n/布局基线
- [ ] 读取妙多 MCP schema
- [ ] 调用 get_miaoduo_node 获取节点 HTML
- [ ] 提取模块、文案、列表、图片 URL
- [ ] 下载资源到 resources/<page-name>/
- [ ] 建资源索引文件
- [ ] 创建 components/composables/config/mock/types
- [ ] 页面入口只做编排，组件 props 驱动
- [ ] 全量文案接入 zh-CN / en-US
- [ ] 构建 + lint + 自检 + 交付说明
```

## 默认质量门槛

- 不做单文件堆砌实现
- 不保留硬编码文案
- 不在组件内硬编码业务列表
- 不忽略类型定义
- 不使用散乱资源路径
- 不跳过构建与 lint 校验
