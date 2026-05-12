# Desktop Toolbox 项目说明

## 项目简介

`Desktop Toolbox` 是一个桌面端工具集合应用，当前已具备工具首页与视频格式转换页面的前端界面基础，目标是为用户提供统一、易用的本地效率工具入口。

从现有代码结构看，项目已包含以下核心能力基础：

- 多页面路由导航（首页、工具页、任务中心、设置页、会员页等）
- 视频转换业务页面（上传、格式选择、参数配置、进度与历史展示文案）
- 多语言文案体系（当前已完善中文语言包）
- 桌面端打包与运行能力（基于 Tauri）

## 技术栈

> 核心技术栈：`Tauri 2 + Vue 3 + TypeScript + Rust（Python 补充） + FFmpeg + SQLite`

### 前端框架

- `Vue 3`：核心 UI 框架
- `Vue Router 4`：页面路由管理
- `Pinia`：状态管理
- `Vue I18n`：国际化能力

### 工程化与语言

- `TypeScript`：类型系统与开发体验增强
- `Vite`：本地开发与构建工具
- `@vitejs/plugin-vue`：Vue 单文件组件支持
- `vue-tsc`：Vue + TS 类型检查

### 桌面端能力

- `Tauri 2`（`@tauri-apps/api` + `@tauri-apps/cli`）：桌面应用容器与打包方案

### 后端与系统能力

- `Rust`：Tauri 核心命令、系统能力调用、性能敏感任务执行
- `Python`（补充）：用于快速实现算法脚本、媒体处理辅助流程和原型能力

### 媒体处理能力

- `FFmpeg`：视频转码、封装格式转换、码率/分辨率/帧率等参数处理

### 数据存储能力

- `SQLite`：本地轻量数据库，用于任务记录、历史记录、配置项持久化

## 目录与模块（当前可见）

- `src/pages/`：页面级模块（如视频转换页）
- `src/layouts/`：布局容器
- `src/pages/home/components/`：首页组件
- `src/i18n/locales/`：多语言文案资源

## 已配置脚本

- `npm run dev`：启动前端开发服务
- `npm run build`：类型检查并构建前端产物
- `npm run preview`：预览构建产物
- `npm run tauri:dev`：启动 Tauri 桌面开发环境
- `npm run tauri:build`：构建桌面应用

## 当前打包配置

当前项目采用 `Tauri 2` 进行桌面端打包，核心配置位于 `src-tauri/tauri.conf.json`。

当前已存在的关键信息如下：

- 应用名称：`Desktop Toolbox`
- 窗口标题：`Desktop Toolbox`
- 应用版本：`0.1.0`
- 应用标识符：`com.toolbox.desktop`
- 前端构建命令：`npm run build`
- 开发环境命令：`npm run dev:desktop`
- 打包目标：`all`

当前需要补齐的配置如下：

- 应用图标：`src-tauri/tauri.conf.json` 中 `bundle.icon` 目前为空数组，实际发包前必须补齐
- 应用作者信息：`src-tauri/Cargo.toml` 中 `authors` 当前为 `["you"]`，建议替换为真实团队或公司名称
- 发布命名信息：如需正式对外发布，建议同步确认应用中文名、英文名、安装包名、公司名、版权信息

## 打包前必填信息

正式打包前，建议先确定以下信息，并写入配置：

- 软件中文名：例如 `桌面工具箱`
- 软件英文名：例如 `Desktop Toolbox`
- 包名 / 标识符：例如 `com.yourcompany.desktoptoolbox`
- 软件版本：例如 `0.1.0`
- 公司或团队名称：例如 `Your Company`
- 应用图标源文件：建议提供一张 `1024 x 1024` 的 PNG，文件名例如 `app-icon.png`

推荐约束如下：

- 标识符一旦发布，尽量不要随意变更，否则会影响升级、签名、安装覆盖和系统数据目录
- 图标建议使用无透明边距的正方形 PNG
- 软件英文名应尽量稳定，避免后续安装目录、包名和品牌展示频繁变化

## 推荐修改的打包配置

建议先补齐 `src-tauri/tauri.conf.json` 中的打包字段。可参考以下配置：

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Desktop Toolbox",
  "version": "0.1.0",
  "identifier": "com.toolbox.desktop",
  "build": {
    "beforeDevCommand": "npm run dev:desktop",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5174",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Desktop Toolbox",
        "width": 1280,
        "height": 800,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

同时建议将 `src-tauri/Cargo.toml` 中作者信息改为真实信息，例如：

```toml
authors = ["Your Company"]
```

## 图标生成流程

当前仓库里的 `src-tauri/icons` 目录还没有桌面端图标文件，只有 Android 相关目录，因此建议先生成标准图标资源。

推荐流程：

1. 准备一张 `1024 x 1024` 的应用主图标 PNG，例如 `src-tauri/assets/app-icon.png`
2. 在项目根目录执行图标生成命令
3. 将生成出的图标文件写入 `src-tauri/icons/`
4. 确认 `src-tauri/tauri.conf.json` 的 `bundle.icon` 已引用这些文件

可执行命令：

```powershell
npm exec tauri icon .\src-tauri\assets\app-icon.png
```

生成后通常会得到这些常用文件：

- `src-tauri/icons/32x32.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`
- `src-tauri/icons/icon.ico`
- `src-tauri/icons/icon.icns`

## Windows 打包流程

Windows 可以在当前这台机器上直接打包。

### 环境要求

- Node.js
- npm
- Rust（已安装 `cargo`）
- Visual Studio C++ Build Tools 或完整 Visual Studio 的 C++ 桌面开发组件
- WebView2 运行时（Windows 10/11 一般已自带，缺失时需要补装）

> 注意：以上依赖仅对「开发/构建机器」必需。**最终发给用户的安装包已内置运行所需资源（包括 FFmpeg），用户无需额外安装 Rust/VS/FFmpeg**。

### 首次打包步骤

1. 安装前端依赖

```powershell
npm install
```

2. 确认 Rust 工具链可用

```powershell
rustc --version
cargo --version
```

3. 准备并生成应用图标

```powershell
npm exec tauri icon .\src-tauri\assets\app-icon.png
```

4. 检查 `src-tauri/tauri.conf.json` 中以下字段是否正确

- `productName`
- `version`
- `identifier`
- `bundle.icon`

5. 执行正式打包

```powershell
npm run tauri:build
```

### Windows 打包产物位置

成功后，常见产物会出现在：

- `src-tauri\target\release\bundle\msi\`
- `src-tauri\target\release\bundle\nsis\`

通常会看到以下类型文件：

- `.msi` 安装包
- `.exe` 安装包或安装器

### Windows 打包说明

- 当前项目的 `tauri:build` 已可直接触发前端构建和 Tauri 打包
- 首次打包会非常慢，因为 Rust 依赖需要完整编译
- 如果只想生成单一安装格式，可以后续将 `bundle.targets` 改成指定目标
 - 本项目已在 `src-tauri/tauri.conf.json` 的 `bundle.resources` 中内置 `ffmpeg.exe/ffprobe.exe`，并通过 `src-tauri/src/runtime_bins.rs` 在运行时自动解析打包路径，因此用户侧无需配置 FFmpeg 环境变量。

## CI / 可复现打包（推荐）

仓库已提供 Windows 打包工作流：`.github/workflows/windows-tauri-build.yml`。

- PR / push 会自动构建并产出 NSIS 安装包（artifact）
- 这能保证每次发布都在一致环境中完成，避免“本地缺工具链导致打包失败”的问题

## macOS 打包流程

`macOS` 不能在当前 Windows 环境中直接产出可分发的 `.app` / `.dmg` 安装包。Tauri 桌面应用通常需要在 `macOS` 机器上本地打包。

也就是说：

- `Windows 包`：在 Windows 上打
- `macOS 包`：在 macOS 上打

### macOS 环境要求

- 一台 macOS 设备
- Xcode Command Line Tools
- Node.js
- npm
- Rust

建议先执行：

```bash
xcode-select --install
rustc --version
cargo --version
node -v
npm -v
```

### macOS 打包步骤

1. 拉取同一份项目代码到 macOS 机器
2. 安装依赖

```bash
npm install
```

3. 生成或拷贝同一套应用图标

```bash
npm exec tauri icon ./src-tauri/assets/app-icon.png
```

4. 检查 `src-tauri/tauri.conf.json`

- `productName`
- `version`
- `identifier`
- `bundle.icon`

5. 执行打包

```bash
npm run tauri:build
```

### macOS 打包产物位置

成功后，常见产物会出现在：

- `src-tauri/target/release/bundle/macos/`
- `src-tauri/target/release/bundle/dmg/`

通常会看到以下类型文件：

- `.app`
- `.dmg`

### macOS 发布补充说明

如果后续要把应用正式分发给其他 macOS 用户，还需要继续配置：

- Apple Developer 账号
- 代码签名证书
- notarization（苹果公证）

如果只是本地自用或团队内部测试，可以先不做签名公证，但其他机器安装时可能会被系统安全策略拦截。

## Windows 和 macOS 是否需要分开打包

需要分开打包。

原因如下：

- 桌面应用属于平台相关构建，不同系统的底层依赖、运行时和安装包格式不同
- Windows 产物通常是 `.exe` / `.msi`
- macOS 产物通常是 `.app` / `.dmg`
- 即使前端代码相同，也必须在对应平台完成最终构建

最实用的发布方式是：

- 在 Windows 机器执行一次 `npm run tauri:build` 生成 Windows 安装包
- 在 macOS 机器执行一次 `npm run tauri:build` 生成 macOS 安装包

## 建议的发布信息模板

如果你准备正式发版，建议先统一下面这份信息：

- 软件中文名：`桌面工具箱`
- 软件英文名：`Desktop Toolbox`
- 可执行程序名：`Desktop Toolbox`
- 应用标识符：`com.toolbox.desktop`
- 当前版本：`0.1.0`
- 作者 / 公司：`Your Company`
- 图标源文件：`src-tauri/assets/app-icon.png`

如果需要品牌化发布，建议你把上面内容统一替换为正式信息后，再执行打包。

## 常见问题

### 1. 为什么 Windows 能打，macOS 不能在这里直接打？

因为 Tauri 的桌面打包依赖目标平台本身的工具链和系统能力。当前环境是 Windows，只能稳定产出 Windows 安装包；macOS 安装包应在 macOS 系统上构建。

### 2. 为什么现在还不建议直接对外发布？

因为当前项目虽然已有打包能力，但桌面端图标尚未配置完整，作者信息也还是占位值，正式发包前应先补齐品牌配置。

### 3. 如果只做内部测试，最少要准备什么？

至少准备以下内容：

- 正确的 `productName`
- 正确的 `identifier`
- 一套完整应用图标
- 能成功执行 `npm run tauri:build` 的本机环境

## 当前阶段说明

项目已实现 WebM 转 MP4 的核心流程（Rust + FFmpeg），包括：

- 多文件选择与拖拽导入（仅 `.webm`）
- 每文件独立任务项与进度更新
- 默认输出到源文件目录
- 全局输出目录模式
- 单文件“另存为”模式
- 转换完成后自动落盘并回写输出路径
- 失败/取消状态与任务中心联动

## WebM 转 MP4 使用说明

1. 进入“视频格式转换”页面。
2. 选择输出策略：
   - 输出到源文件目录
   - 输出到统一目录（可选择目录）
3. 点击“选择文件”或直接拖拽多个 `.webm` 文件到上传区域。
4. 可按需为某个文件点击“另存为”指定单独输出路径。
5. 点击“开始转换”，任务会串行执行并显示实时进度。
6. 转换完成后，MP4 文件会自动保存到对应目标位置。

## 最小验收步骤

- 准备 2~3 个 `.webm` 文件，验证多文件导入正常。
- 拖拽导入文件，验证任务列表生成。
- 在“源文件目录输出”模式转换，验证输出路径正确。
- 在“统一目录输出”模式转换，验证目录生效。
- 对单个文件使用“另存为”，验证覆盖全局策略。
- 转换过程中点击取消，验证任务状态为“已取消”。
