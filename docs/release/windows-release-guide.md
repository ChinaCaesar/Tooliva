# Windows Release Guide

## 目标

- 标准 Windows NSIS 安装包只包含主程序、前端资源、`ffmpeg.exe`、`ffprobe.exe` 和基础本地去水印能力。
- `resources/ai-runtime`、Python、PyTorch、`iopaint`、LAMA 等 AI 运行时内容禁止打入 NSIS 包。
- 目标安装包体积控制在 50 MB 到 150 MB。

## 为什么必须拆包

- NSIS 在超大资源场景下存在明显体积与稳定性限制，超过 2 GB 时打包和安装都会变得不可控。
- 现有 AI Python 运行时远大于桌面主程序体积，继续内置会直接放大安装包并拖慢发版。
- 用户并非都需要 AI 增强修复，默认能力应先保证“基础去水印可用”。

## 当前打包规则

`src-tauri/tauri.conf.json` 的 `bundle.resources` 现在只保留：

```json
[
  "resources/bin/ffmpeg.exe",
  "resources/bin/ffprobe.exe"
]
```

禁止重新加入以下目录或同类大文件：

- `resources/ai-runtime`
- `resources/ai-runtime/python`
- `torch`
- `torchvision`
- `iopaint`
- LAMA 模型权重
- 任何远大于主程序的 AI 运行时目录

## 环境变量

标准包与 AI 远程组件的连接全部通过环境变量控制，不允许在前端或 Rust 里硬编码 CDN 地址：

```env
VITE_AI_RUNTIME_MANIFEST_URL=https://example.com/ai-runtime/manifest.json
VITE_AI_RUNTIME_BASE_URL=https://example.com/ai-runtime
VITE_AI_RUNTIME_ENABLED=true
VITE_AI_RUNTIME_MIN_FREE_DISK_GB=8
VITE_AI_RUNTIME_PACKAGE_CHANNEL=stable
```

## 运行时目录

AI 运行时安装到用户目录，不写入安装目录：

```text
%LOCALAPPDATA%/Tooliva/ai-runtime/
  manifest.json
  current/
  versions/
  downloads/
  backup/
```

模型继续放在：

```text
%APPDATA%/Tooliva/ai-models/
  lama/
    big-lama.pt
```

## 发布流程

1. 确认 `.env.production` 中 AI 运行时地址已指向线上 manifest。
2. 运行 `pnpm tauri:build` 生成 NSIS 安装包。
3. 检查安装包内资源，只应看到 FFmpeg 相关文件，不应包含 `resources/ai-runtime`。
4. 上传主安装包。
5. 单独上传 AI runtime 压缩包与远端 manifest。
6. 在干净 Windows 机器验证：
   - 不安装 AI 组件时，极速模式可用。
   - 进入 AI 增强模式时，先做环境检查。
   - 环境满足后可读取远端 manifest，并显示版本、体积、磁盘要求。

## 验收重点

- 主安装包内不包含 AI runtime。
- AI 失败安装不会破坏旧版本目录。
- 标准安装包仍能正常使用图片/视频基础去水印和 FFmpeg 相关功能。
