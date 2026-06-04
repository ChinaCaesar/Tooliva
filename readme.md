# Tooliva

## English

Tooliva is a local-first desktop toolbox for creator and media workflows. It combines a Vue 3 front end with a Tauri + Rust desktop runtime so common processing tasks can run on the user's machine instead of in the cloud.

### Official website

- [Official website](https://tool.toolivaai.com/)
- [Official website (zh-CN)](https://tool.toolivaai.com/zh-CN)


### What this project is for

- Provide one desktop entry point for image, video, and workflow utilities
- Keep processing local for better privacy and predictable performance
- Offer a scalable architecture for traditional media tools and offline AI-assisted tools
- Support multilingual desktop experiences, with English and Chinese available

### What Tooliva can do

Current and visible capabilities in this repository include:

- Image compression
- GIF compression
- Video to GIF conversion
- Image watermarking
- Local image upscale workflow
- Task management for batch processing jobs
- Desktop update, dialog, deep-link, and native window integration
- Offline AI runtime import flow for advanced local processing

Features already scaffolded or under active development include:

- Image watermark removal
- Video watermark removal
- Additional AI-enhanced media workflows

### Product characteristics

- Local-first desktop app built with `Tauri 2`
- Front end powered by `Vue 3`, `TypeScript`, `Vite`, `Pinia`, and `Vue I18n`
- Native processing and orchestration handled by `Rust`
- Media processing powered by bundled `FFmpeg`
- Local persistence based on `SQLite`

### Repository structure

- `src/`: Vue application, pages, layouts, i18n, and feature UI
- `src-tauri/`: Tauri app, Rust commands, native processors, packaging config, and bundled resources
- `docs/`: release notes, packaging notes, and runtime-related documentation
- `scripts/`: project automation and packaging helper scripts

### Development

```bash
npm install
npm run dev
npm run tauri:dev
npm run build
npm run tauri:build
```


### Documentation

- Packaging and release notes: [PACKAGING.md](./PACKAGING.md)
- AI runtime GitHub upload guide: [AI_GITHUB_RELEASE_GUIDE.md](./AI_GITHUB_RELEASE_GUIDE.md)

## 中文

Tooliva 是一个面向创作者与媒体处理场景的本地优先桌面工具箱。项目使用 Vue 3 构建前端界面，使用 Tauri + Rust 提供桌面运行时与本地能力，让常见处理任务尽量在用户设备上完成，而不是依赖云端。

### 官网

- [官网（英文）](https://tool.toolivaai.com/)
- [官网（中文）](https://tool.toolivaai.com/zh-CN)


### 这个项目是做什么的

- 提供统一的桌面端工具入口，承载图片、视频和效率类工具
- 以本地处理为核心，兼顾隐私、安全和可预期的执行性能
- 为传统媒体处理工具和离线 AI 工具提供统一架构
- 支持中英文桌面体验，默认英文，同时提供中文

### 当前能够实现的功能

从当前仓库可见能力来看，项目已经包含或接入了以下功能：

- 图片压缩
- GIF 压缩
- 视频转 GIF
- 图片加水印
- 本地图像放大工作流
- 批处理任务管理
- 桌面更新、对话框、深链接与原生窗口能力
- 离线 AI Runtime 导入能力，用于后续本地 AI 处理

当前已经有结构或正在推进的功能包括：

- 图片去水印
- 视频去水印
- 更多 AI 增强型媒体处理能力

### 项目特点

- 基于 `Tauri 2` 的本地桌面应用
- 前端技术栈为 `Vue 3`、`TypeScript`、`Vite`、`Pinia`、`Vue I18n`
- 原生命令、任务调度和处理流程由 `Rust` 承载
- 媒体处理依赖内置 `FFmpeg`
- 本地持久化使用 `SQLite`

### 目录概览

- `src/`：Vue 页面、布局、国际化与前端功能模块
- `src-tauri/`：Tauri 配置、Rust 命令、原生处理器、打包资源
- `docs/`：发布、运行时与其他说明文档
- `scripts/`：自动化与打包辅助脚本

### 开发命令

```bash
npm install
npm run dev
npm run tauri:dev
npm run build
npm run tauri:build
```


### 相关文档

- 打包与发布说明：[PACKAGING.md](./PACKAGING.md)
- AI 组件上传与版本说明：[AI_GITHUB_RELEASE_GUIDE.md](./AI_GITHUB_RELEASE_GUIDE.md)
