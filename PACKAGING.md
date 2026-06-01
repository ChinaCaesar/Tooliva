# Tooliva Packaging Guide

## English

This document collects the packaging, release, and runtime-package notes that used to live in `readme.md`. English is the default language; the Chinese version is included below.

## Desktop packaging overview

Tooliva uses `Tauri 2` for desktop packaging. The main configuration lives in `src-tauri/tauri.conf.json`.

Current repository configuration:

- Product name: `Tooliva`
- Bundle identifier: `com.tooliva.desktop`
- Version source: `../package.json`
- Development command: `npm run dev:desktop`
- Frontend build command: `npm run build`
- Desktop build command: `npm run tauri:build`
- Current bundle target: `nsis`
- Bundled runtime resources:
  - `src-tauri/resources/bin/ffmpeg.exe`
  - `src-tauri/resources/bin/ffprobe.exe`
  - `src-tauri/resources/bin/7za.exe`
- Current icon set:
  - `src-tauri/icons/32x32.png`
  - `src-tauri/icons/128x128.png`
  - `src-tauri/icons/128x128@2x.png`
  - `src-tauri/icons/icon.ico`
  - `src-tauri/icons/icon.icns`

Related metadata already present in the repository:

- Tauri product name: `Tooliva`
- Rust package author: `Tooliva Team`
- Deep-link scheme: `tooliva`

## Release metadata checklist

Before shipping a public build, make sure the following values are final and consistent:

- Product name in English
- Product name in Chinese, if used in UI or installer copy
- Bundle identifier such as `com.tooliva.desktop`
- App version
- Company or team name
- Copyright and brand copy
- Primary app icon source file

Recommended constraints:

- Do not change the bundle identifier casually after release
- Keep the English product name stable across installer, bundle name, and branding
- Use a square high-resolution PNG as the icon source

## Recommended icon workflow

The repository already contains generated desktop icons under `src-tauri/icons/`, and the icon source file exists at:

- `src-tauri/assets/app-icon.png`

If you need to regenerate icons:

```powershell
npm exec tauri icon .\src-tauri\assets\app-icon.png
```

Common generated outputs:

- `src-tauri/icons/32x32.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`
- `src-tauri/icons/icon.ico`
- `src-tauri/icons/icon.icns`

## Windows packaging

Windows builds can be created directly on a Windows machine.

### Requirements

- Node.js
- npm
- Rust and `cargo`
- Visual Studio C++ Build Tools, or Visual Studio with Desktop C++ components
- WebView2 runtime

Note:
These dependencies are required on the build machine only. The packaged desktop app already bundles the runtime resources it needs, including FFmpeg and 7-Zip helpers.

### Build steps

1. Install frontend dependencies.

```powershell
npm install
```

2. Confirm the Rust toolchain is available.

```powershell
rustc --version
cargo --version
```

3. Regenerate icons if needed.

```powershell
npm exec tauri icon .\src-tauri\assets\app-icon.png
```

4. Check the main packaging fields in `src-tauri/tauri.conf.json`.

- `productName`
- `version`
- `identifier`
- `bundle.targets`
- `bundle.icon`
- `bundle.resources`

5. Run the desktop build.

```powershell
npm run tauri:build
```

### Build output

The current configuration targets `nsis`, so the main output is expected under:

- `src-tauri\target\release\bundle\nsis\`

Depending on future target settings, you may also see:

- `src-tauri\target\release\bundle\msi\`

Typical output files:

- `.exe` installer
- `.msi` installer, when MSI targets are enabled

### Notes

- `npm run tauri:build` already runs the frontend production build first
- The first Rust build can be slow because dependencies must compile
- FFmpeg binaries are bundled through `bundle.resources`
- `src-tauri/src/runtime_bins.rs` resolves packaged runtime binary paths at runtime, so end users do not need to configure FFmpeg manually

## CI and reproducible builds

The repository includes a Windows packaging workflow:

- `.github/workflows/windows-tauri-build.yml`

Current behavior:

- Runs on `windows-latest`
- Installs Node, pnpm, and Rust
- Builds the frontend
- Runs `pnpm run tauri:build`
- Uploads NSIS and available MSI bundle artifacts

This is the recommended path for repeatable release validation.

## macOS packaging

macOS packages should be built on a macOS machine. A Windows environment cannot directly produce distributable `.app` or `.dmg` outputs for a Tauri desktop release.

### Requirements

- A macOS machine
- Xcode Command Line Tools
- Node.js
- npm
- Rust

Suggested checks:

```bash
xcode-select --install
rustc --version
cargo --version
node -v
npm -v
```

### Build steps

1. Pull the same repository onto the macOS machine.
2. Install dependencies.

```bash
npm install
```

3. Generate or copy the same app icon assets.

```bash
npm exec tauri icon ./src-tauri/assets/app-icon.png
```

4. Check `src-tauri/tauri.conf.json`.

- `productName`
- `version`
- `identifier`
- `bundle.icon`

5. Run the build.

```bash
npm run tauri:build
```

### Expected output

Common output locations:

- `src-tauri/target/release/bundle/macos/`
- `src-tauri/target/release/bundle/dmg/`

Common file types:

- `.app`
- `.dmg`

### Distribution note

For public macOS distribution, you will usually need:

- An Apple Developer account
- Code signing certificates
- Notarization

For local testing only, unsigned builds may be acceptable, but macOS security policy may block them on other machines.

## Do Windows and macOS need separate builds?

Yes.

Reasons:

- Desktop packaging is platform-specific
- Windows and macOS use different toolchains and installer formats
- Windows outputs are usually `.exe` or `.msi`
- macOS outputs are usually `.app` or `.dmg`
- Even with the same frontend code, final packaging must be completed on the target platform

## Suggested release template

Use a single agreed release metadata sheet before publishing:

- Chinese product name: `Tooliva`
- English product name: `Tooliva`
- Executable name: `Tooliva`
- Bundle identifier: `com.tooliva.desktop`
- Version: `0.1.0`
- Author or company: `Tooliva Team`
- Icon source file: `src-tauri/assets/app-icon.png`

## FAQ

### Why can Windows build here, but macOS cannot?

Because Tauri packaging depends on the target platform's own toolchain and system capabilities. A Windows machine can reliably build Windows packages; macOS packages should be built on macOS.

### Why is release metadata still important if the app already builds?

Because a successful local build is not the same as a polished public release. Final branding, installer metadata, signing, and update strategy still matter.

### What is the minimum setup for internal testing?

- Correct `productName`
- Correct `identifier`
- A complete icon set
- A machine that can successfully run `npm run tauri:build`

## AI runtime packaging

The following commands are for packaging the local AI runtime import bundle used by the desktop app.

Behavior of the current scripts:

- Trims runtime content by default
- Removes `__pycache__`, `.pyc`, `.map`, `.h`, `.lib`, and test content
- Excludes `paddle` and `paddlepaddle-3.0.0.dist-info` by default
- Runs a smoke test for imports such as `torch`, `iopaint`, and `cv2`
- Uses temporary directories such as `_runtime_test/`, `_runtime_smoke_*/`, and `_ai_stage/`

### 1. Prepare the trimmed AI runtime source tree

```powershell
.\scripts\prepare-ai-runtime-source.ps1 `
  -BasePythonRoot "D:\python3.10" `
  -SitePackagesSource ".\src-tauri\resources\ai-runtime\python\Lib\site-packages" `
  -SidecarsSource ".\src-tauri\resources\ai-runtime\sidecars" `
  -OutputRoot ".\_ai"
```

### 2. Build the importable AI runtime archive

```powershell
.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -SourceRoot ".\_ai"
```

### 3. Add a model path to the manifest if needed

```powershell
.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -SourceRoot ".\_ai" `
  -ModelFilePath "D:\releases\big-lama.pt"
```

### 4. Keep paddle when explicitly required

```powershell
.\scripts\prepare-ai-runtime-source.ps1 `
  -BasePythonRoot "D:\python3.10" `
  -SitePackagesSource ".\src-tauri\resources\ai-runtime\python\Lib\site-packages" `
  -SidecarsSource ".\src-tauri\resources\ai-runtime\sidecars" `
  -OutputRoot ".\_ai" `
  -KeepPaddle

.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -SourceRoot ".\_ai" `
  -KeepPaddle
```

Default output:

```text
dist/ai-runtime/<RuntimeVersion>/
  ai-runtime.7z
  manifest.generated.json
```

Verified result noted in the project documentation:

- `ai-runtime.7z` can be generated successfully
- A previously verified archive size was about `1.37 GiB`
- The default trimmed package excludes `paddle`
- The desktop app supports importing the newer `.7z` package and remains compatible with older `.zip` packages
- The desktop installer bundles `resources/bin/7za.exe`, so users do not need a separate archive tool

## 中文

本文档汇总了原先放在 `readme.md` 中的打包、发布与运行时打包说明。默认语言为英文，下面提供中文版本。

## 桌面端打包概览

Tooliva 使用 `Tauri 2` 进行桌面端打包，核心配置位于 `src-tauri/tauri.conf.json`。

当前仓库配置如下：

- 产品名：`Tooliva`
- 包标识：`com.tooliva.desktop`
- 版本来源：`../package.json`
- 开发命令：`npm run dev:desktop`
- 前端构建命令：`npm run build`
- 桌面打包命令：`npm run tauri:build`
- 当前打包目标：`nsis`
- 内置运行时资源：
  - `src-tauri/resources/bin/ffmpeg.exe`
  - `src-tauri/resources/bin/ffprobe.exe`
  - `src-tauri/resources/bin/7za.exe`
- 当前图标集：
  - `src-tauri/icons/32x32.png`
  - `src-tauri/icons/128x128.png`
  - `src-tauri/icons/128x128@2x.png`
  - `src-tauri/icons/icon.ico`
  - `src-tauri/icons/icon.icns`

仓库中已经存在的相关元信息：

- Tauri 产品名：`Tooliva`
- Rust 包作者：`Tooliva Team`
- 深链接协议：`tooliva`

## 发版信息检查清单

正式发布前，建议确认并统一以下信息：

- 英文产品名
- 中文产品名
- 包标识，例如 `com.tooliva.desktop`
- 应用版本号
- 公司或团队名称
- 版权与品牌文案
- 主图标源文件

推荐约束：

- 已发布后不要轻易修改包标识
- 英文产品名尽量在安装包、应用名和品牌展示中保持一致
- 图标源建议使用高分辨率正方形 PNG

## 图标处理流程

当前仓库已经在 `src-tauri/icons/` 下提供了生成后的桌面图标，图标源文件位于：

- `src-tauri/assets/app-icon.png`

如需重新生成图标，可执行：

```powershell
npm exec tauri icon .\src-tauri\assets\app-icon.png
```

常见输出文件：

- `src-tauri/icons/32x32.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`
- `src-tauri/icons/icon.ico`
- `src-tauri/icons/icon.icns`

## Windows 打包

Windows 安装包可以直接在 Windows 机器上构建。

### 环境要求

- Node.js
- npm
- Rust 与 `cargo`
- Visual Studio C++ Build Tools，或带桌面 C++ 组件的 Visual Studio
- WebView2 运行时

说明：
这些依赖只要求在构建机器上存在。最终桌面安装包已经内置所需运行资源，包括 FFmpeg 和 7-Zip 辅助工具。

### 打包步骤

1. 安装前端依赖。

```powershell
npm install
```

2. 确认 Rust 工具链可用。

```powershell
rustc --version
cargo --version
```

3. 如有需要，重新生成图标。

```powershell
npm exec tauri icon .\src-tauri\assets\app-icon.png
```

4. 检查 `src-tauri/tauri.conf.json` 中的关键打包字段。

- `productName`
- `version`
- `identifier`
- `bundle.targets`
- `bundle.icon`
- `bundle.resources`

5. 执行桌面打包。

```powershell
npm run tauri:build
```

### 产物位置

当前配置目标为 `nsis`，主要产物通常位于：

- `src-tauri\target\release\bundle\nsis\`

若后续启用其他目标，也可能看到：

- `src-tauri\target\release\bundle\msi\`

常见产物类型：

- `.exe` 安装器
- `.msi` 安装器，前提是启用了 MSI 目标

### 说明

- `npm run tauri:build` 已经会先执行前端生产构建
- 首次 Rust 构建可能较慢，因为需要完整编译依赖
- FFmpeg 二进制通过 `bundle.resources` 一并打入安装包
- `src-tauri/src/runtime_bins.rs` 会在运行时解析打包后的二进制路径，因此用户无需手动配置 FFmpeg

## CI 与可复现打包

仓库中已提供 Windows 打包工作流：

- `.github/workflows/windows-tauri-build.yml`

当前流程会：

- 在 `windows-latest` 上运行
- 安装 Node、pnpm、Rust
- 构建前端
- 执行 `pnpm run tauri:build`
- 上传 NSIS 和可用的 MSI 构建产物

这是推荐的可复现发版验证方式。

## macOS 打包

macOS 安装包应在 macOS 机器上构建。Windows 环境无法直接稳定产出可分发的 `.app` 或 `.dmg`。

### 环境要求

- 一台 macOS 设备
- Xcode Command Line Tools
- Node.js
- npm
- Rust

建议先检查：

```bash
xcode-select --install
rustc --version
cargo --version
node -v
npm -v
```

### 打包步骤

1. 在 macOS 机器上拉取同一份仓库代码。
2. 安装依赖。

```bash
npm install
```

3. 生成或复制同一套应用图标。

```bash
npm exec tauri icon ./src-tauri/assets/app-icon.png
```

4. 检查 `src-tauri/tauri.conf.json`。

- `productName`
- `version`
- `identifier`
- `bundle.icon`

5. 执行打包。

```bash
npm run tauri:build
```

### 预期产物

常见输出位置：

- `src-tauri/target/release/bundle/macos/`
- `src-tauri/target/release/bundle/dmg/`

常见文件类型：

- `.app`
- `.dmg`

### 发布补充

如果要面向外部 macOS 用户正式发布，通常还需要：

- Apple Developer 账号
- 代码签名证书
- notarization 公证

如果只是本地测试，未签名构建也可以先使用，但在其他机器上可能会被系统安全策略拦截。

## Windows 和 macOS 是否需要分别打包

需要。

原因：

- 桌面端打包是平台相关构建
- Windows 和 macOS 的工具链、运行时和安装包格式不同
- Windows 常见产物是 `.exe` 或 `.msi`
- macOS 常见产物是 `.app` 或 `.dmg`
- 即使前端代码相同，最终打包也必须在目标平台完成

## 建议的发布信息模板

正式发布前建议统一如下元信息：

- 软件中文名：`Tooliva`
- 软件英文名：`Tooliva`
- 可执行程序名：`Tooliva`
- 应用标识：`com.tooliva.desktop`
- 版本号：`0.1.0`
- 作者或公司：`Tooliva Team`
- 图标源文件：`src-tauri/assets/app-icon.png`

## 常见问题

### 为什么这里能打 Windows 包，不能直接打 macOS 包？

因为 Tauri 打包依赖目标平台自身的工具链和系统能力。Windows 机器可以稳定产出 Windows 安装包；macOS 安装包应在 macOS 上构建。

### 为什么应用已经能打包了，还要关心发布元信息？

因为“能构建”并不等于“适合对外发布”。品牌信息、安装器元数据、签名和更新策略都会影响最终发布质量。

### 如果只是内部测试，最低需要准备什么？

- 正确的 `productName`
- 正确的 `identifier`
- 一套完整图标
- 一台能够成功执行 `npm run tauri:build` 的构建机器

## AI Runtime 打包

下面这些命令用于生成桌面端可导入的本地 AI Runtime 包。

当前脚本行为：

- 默认会精简运行时内容
- 会移除 `__pycache__`、`.pyc`、`.map`、`.h`、`.lib` 和测试内容
- 默认排除 `paddle` 与 `paddlepaddle-3.0.0.dist-info`
- 会执行 `torch`、`iopaint`、`cv2` 等导入的 smoke test
- 会使用 `_runtime_test/`、`_runtime_smoke_*/`、`_ai_stage/` 等临时目录

### 1. 准备精简后的 AI Runtime 源目录

```powershell
.\scripts\prepare-ai-runtime-source.ps1 `
  -BasePythonRoot "D:\python3.10" `
  -SitePackagesSource ".\src-tauri\resources\ai-runtime\python\Lib\site-packages" `
  -SidecarsSource ".\src-tauri\resources\ai-runtime\sidecars" `
  -OutputRoot ".\_ai"
```

### 2. 生成可导入的 AI Runtime 压缩包

```powershell
.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -SourceRoot ".\_ai"
```

### 3. 如有需要，把模型路径一起写入 manifest

```powershell
.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -SourceRoot ".\_ai" `
  -ModelFilePath "D:\releases\big-lama.pt"
```

### 4. 如果明确需要保留 paddle

```powershell
.\scripts\prepare-ai-runtime-source.ps1 `
  -BasePythonRoot "D:\python3.10" `
  -SitePackagesSource ".\src-tauri\resources\ai-runtime\python\Lib\site-packages" `
  -SidecarsSource ".\src-tauri\resources\ai-runtime\sidecars" `
  -OutputRoot ".\_ai" `
  -KeepPaddle

.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -SourceRoot ".\_ai" `
  -KeepPaddle
```

默认输出目录：

```text
dist/ai-runtime/<RuntimeVersion>/
  ai-runtime.7z
  manifest.generated.json
```

项目文档中已经记录过的验证结论：

- `ai-runtime.7z` 可以成功生成
- 曾验证过的归档大小约为 `1.37 GiB`
- 默认精简配置会排除 `paddle`
- 桌面端支持导入新的 `.7z` 包，同时兼容旧的 `.zip` 包
- 桌面安装包已内置 `resources/bin/7za.exe`，用户无需额外安装压缩软件
