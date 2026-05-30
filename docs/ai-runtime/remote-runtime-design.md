# Remote AI Runtime Design

## 目标

AI 增强组件与桌面主程序分离发布，通过远端 manifest 管理版本、下载地址、校验信息和模型信息。

## Manifest 结构

运行时 manifest 采用以下结构：

```json
{
  "channel": "stable",
  "runtimeVersion": "1.0.0",
  "minAppVersion": "0.1.0",
  "platform": "windows-x64",
  "packageSize": 4210000000,
  "packageSha256": "PLEASE_REPLACE_WITH_REAL_SHA256",
  "packageUrl": "https://example.com/ai-runtime/windows-x64/1.0.0/ai-runtime.zip",
  "requiredFreeDiskGb": 8,
  "requirements": {
    "os": "Windows 10/11 64-bit",
    "minMemoryGb": 8,
    "recommendedMemoryGb": 16,
    "cpu": "x64",
    "avxRequired": false,
    "avx2Recommended": true
  },
  "models": [
    {
      "name": "lama",
      "version": "1.0.0",
      "fileName": "big-lama.pt",
      "size": 196000000,
      "sha256": "PLEASE_REPLACE_WITH_REAL_SHA256",
      "url": "https://example.com/ai-models/lama/big-lama.pt"
    }
  ],
  "releaseNotes": [
    "优化本地 AI 去水印效果",
    "提升复杂背景修复稳定性"
  ]
}
```

## 本地安装布局

```text
%LOCALAPPDATA%/DesktopToolbox/ai-runtime/
  manifest.json
  current/
  versions/<version>/
  downloads/
  backup/
```

本地 `manifest.json` 记录当前版本、channel、下载来源和模型列表。

## 生命周期

1. 前端进入 AI 增强模式。
2. 调用 `check_ai_environment` 检查系统版本、位数、内存、磁盘和 CPU 能力。
3. 环境满足后调用 `fetch_ai_runtime_manifest`。
4. 用户确认安装或升级。
5. 下载到 `downloads/`。
6. 完成后执行 SHA256 校验。
7. 解压到 `versions/<new_version>/`。
8. 校验运行时目录结构。
9. 同步到 `current/` 并更新本地 `manifest.json`。
10. 保留旧版本目录，失败时不破坏旧版本。

## 回滚原则

- 新包下载失败：保留旧版本。
- SHA256 校验失败：删除损坏包并提示重试。
- 解压或结构校验失败：不切换 `current/`。
- 切换失败：继续使用旧版本或极速模式。

## 约束

- 所有远端链接都必须来自环境变量或远端 manifest。
- 安装目录始终位于用户目录，不写入程序安装目录。
- 模型下载地址也不硬编码，优先使用本地已安装 runtime manifest 中的模型清单。
