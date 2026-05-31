# Windows NSIS 打包体积限制与 AI 运行时说明

本文档说明 `pnpm tauri:build` 在 NSIS 打包阶段失败的根因，澄清「AI 运行时」与「LAMA 模型」的体积差异，并给出可落地的发布方案。

相关配置与代码：

- `src-tauri/tauri.conf.json` — `bundle.resources`
- `src-tauri/resources/ai-runtime/README.md` — 运行时与模型目录约定
- `src-tauri/src/ai_runtime.rs` — 路径解析与模型元数据
- `docs/release/windows-release-guide.md` — Windows 发布总流程

---

## 1. 问题现象

执行 `pnpm tauri:build` 时，前端构建与 Rust 编译均可成功，但在最后一步 NSIS 打安装包时失败：

```text
Running makensis to produce ...\Tooliva_0.1.0_x64-setup.exe

Internal compiler error #12345: error mmapping file (1947917674, 33554432) is out of range.

Note: you may have one or two (large) stale temporary file(s) left in your temporary directory ...
failed to bundle project `系统找不到指定的文件。 (os error 2)`
```

典型特征：

- `tooliva.exe` 已成功生成于 `src-tauri/target/release/`
- 失败发生在 `makensis` 阶段，而非 Rust 或 Vite 构建阶段
- 错误中的数字 `1947917674` 约为 1.86 GB，接近 NSIS 的 2 GB 上限

---

## 2. 根因

### 2.1 NSIS 有 2 GB 硬上限

NSIS（Nullsoft Scriptable Install System）安装包生成器存在约 **2 GB** 的技术上限。这是 NSIS 编译器本身的限制（与 Tauri 无关），当待打包内容总量超过该阈值时，会触发 `Internal compiler error #12345`。

参考：[tauri-apps/tauri#7372](https://github.com/tauri-apps/tauri/issues/7372)

### 2.2 当前 bundle 总体积远超 2 GB

`tauri.conf.json` 当前将以下资源全部打入安装包：

```json
"resources": [
  "resources/bin/ffmpeg.exe",
  "resources/bin/ffprobe.exe",
  "resources/ai-runtime"
]
```

实测体积（2026-05 本地构建环境）：

| 组件 | 路径 | 体积 |
|------|------|------|
| 主程序 | `target/release/tooliva.exe` | ~23 MB |
| FFmpeg | `resources/bin/ffmpeg.exe` + `ffprobe.exe` | ~0.16 GB |
| AI Python 运行时 | `resources/ai-runtime/python` | **~5.21 GB** |
| AI Sidecar 脚本 | `resources/ai-runtime/sidecars` | ~0.03 MB |
| **合计** | | **~5.4 GB** |

其中 `ai-runtime/python` 内 PyTorch 相关文件约占 **4.26 GB**（`torch`、`torchvision`、`iopaint` 等依赖，见 `sidecars/requirements.txt`）。

因此：**不是应用本身过大，而是 AI Python 运行时（主要是 PyTorch）导致 NSIS 无法完成打包。**

---

## 3. 常见误解：5 GB 是模型吗？

**不是。** 需要区分两类完全不同的资源：

### 3.1 AI Python 运行时（~5.2 GB）

- **内容**：便携式 Python 虚拟环境 + PyTorch + iopaint 等推理依赖
- **位置**：`resources/ai-runtime/python`（安装目录旁）
- **当前策略**：设计为随安装包分发（`bundle.resources`）
- **作用**：提供去水印等 AI 功能的执行环境；没有它，sidecar 脚本无法运行

### 3.2 LAMA 模型文件（~196 MB）

- **内容**：`big-lama.pt` 权重文件
- **位置**：`%APPDATA%\Tooliva\ai-models\lama\big-lama.pt`（用户数据目录）
- **当前策略**：**不打包进安装包**，首次使用去水印功能时由应用内下载
- **代码常量**：`LAMA_MODEL_SIZE_BYTES = 196_000_000`（见 `ai_runtime.rs`）

```text
去水印功能完整可用 ≈ 主程序 + FFmpeg + AI 运行时(~5.2G) + LAMA 模型(~196MB)
```

| 问题 | 答案 |
|------|------|
| 把去水印模型打进安装包会超过 5 GB 吗？ | 模型本身只有约 196 MB；**5 GB 主要来自 PyTorch 运行时**，不是模型 |
| NSIS 只打主程序 + FFmpeg（~50 MB）后，用户还要下 5 GB 模型吗？ | **不用下 5 GB 模型**；模型约 196 MB。但若安装包不含 `ai-runtime`，用户仍须另行获得 **~5.2 GB 的 Python/PyTorch 运行时** |
| 应用会自动下载 5 GB 运行时吗？ | **当前不会**。项目仅实现了 LAMA 模型的按需下载，未实现 AI 运行时的在线下载 |

---

## 4. 已验证的临时构建命令

### 4.1 排除 ai-runtime 后可成功打出 NSIS 安装包

```powershell
pnpm exec tauri build --config '{"bundle":{"resources":["resources/bin/ffmpeg.exe","resources/bin/ffprobe.exe"]}}'
```

产物约 **51 MB**：

```text
src-tauri\target\release\bundle\nsis\Tooliva_0.1.0_x64-setup.exe
```

此安装包包含主程序与 FFmpeg，**不包含** AI 去水印所需的 Python 运行时。

### 4.2 仅构建 exe，跳过安装包

```powershell
pnpm exec tauri build --no-bundle
```

产物为 `src-tauri\target\release\tooliva.exe`，需手动将 `resources\` 目录与 exe 一并分发。

---

## 5. 发布方案对比

### 方案 A：分包发布（推荐，改动最小）

| 交付物 | 内容 | 体积 | 说明 |
|--------|------|------|------|
| 主安装包（NSIS） | 主程序 + FFmpeg | ~50 MB | 可正常过 NSIS 2 GB 限制 |
| AI 运行时包（zip/7z） | `resources/ai-runtime` | ~5.2 GB | 单独上传 CDN，用户解压到安装目录 `resources\ai-runtime\` |
| LAMA 模型 | `big-lama.pt` | ~196 MB | 保持现状，应用内首次使用时下载 |

**优点**：主安装包小、下载快、可继续用 NSIS 与现有更新流程。  
**缺点**：用户需额外一步安装 AI 运行时；需在文档中说明目录结构。

### 方案 B：便携版 ZIP（单包全量）

不打 NSIS，将 `tooliva.exe` + 完整 `resources\` 打成 zip 分发。

**优点**：一个包包含全部能力，无 2 GB 限制。  
**缺点**：包体约 5.4 GB；无标准安装/卸载流程；deep link 注册需用户手动或额外脚本。

### 方案 C：改用 Inno Setup

Inno Setup 支持大于 2 GB 的安装包，但 Tauri 不内置支持，需自行编写安装脚本，基于 `tauri build --no-bundle` 产物二次打包。

**优点**：单一安装程序、体验接近传统 Windows 安装包。  
**缺点**：需维护独立安装脚本与 CI 步骤。

### 方案 D：AI 运行时按需下载（长期方案）

参考 LAMA 模型下载逻辑，在应用内实现：

1. 首次进入 AI 功能时检测 `ai-runtime` 是否存在
2. 若不存在，从 CDN 下载并解压到安装目录或用户数据目录
3. 再按需下载 LAMA 模型（~196 MB）

**优点**：主安装包可长期保持 ~50 MB；用户体验统一。  
**缺点**：开发量较大；需托管 5 GB 运行时包与断点续传、校验、进度 UI。

---

## 6. 推荐决策

| 阶段 | 建议 |
|------|------|
| **当前可立即发版** | 采用 **方案 A**：NSIS 主包 + 独立 `ai-runtime` 压缩包 |
| **内测 / 技术用户** | 可采用 **方案 B** 便携 zip，减少安装步骤 |
| **产品成熟期** | 规划 **方案 D**，将运行时与模型统一为「按需下载」 |

无论选哪种方案，建议在发布说明中明确写出：

- 不含 AI 运行时的安装包：**图片压缩、视频转 GIF 等 FFmpeg 功能可用**
- **图片/视频去水印**：除安装主包外，还需 AI 运行时（~5.2 GB）+ LAMA 模型（~196 MB，应用内下载）

---

## 7. 与现有发布文档的关系

- `windows-release-guide.md` 中 `bundle.resources` 包含 `resources/ai-runtime` 的说明，在 NSIS 限制解决前，**全量 `pnpm tauri:build` 会失败**
- 采用方案 A 时，打包命令应改为本文 **§4.1** 的 config 覆盖方式，或维护单独的 `tauri.installer.conf.json`
- 发布验收清单中「与 ai-runtime 相关流程能进入可运行状态」需在分包方案下增加：**确认用户已正确放置 AI 运行时目录**

---

## 8. 排查清单

若再次遇到类似错误，按序检查：

1. **报错阶段**：是否在 `Running makensis` 之后？若是，优先怀疑体积超限，而非 Rust/前端问题。
2. **`resources/ai-runtime/python` 体积**：是否超过 2 GB？（通常约 5 GB）
3. **C 盘临时目录空间**：NSIS 编译需要足够临时空间（虽非本次主因，但空间不足也会触发 #12345）。
4. **是否混淆模型与运行时**：LAMA 模型约 196 MB；5 GB 为 PyTorch 运行时。

---

## 9. 参考资料

- [Tauri Issue #7372 — NSIS and WiX fails when application larger than 2GB](https://github.com/tauri-apps/tauri/issues/7372)
- [NSIS 论坛 — Internal compiler error #12345](https://nsis-dev.github.io/NSIS-Forums/html/t-303411.html)
- 项目内 `src-tauri/resources/ai-runtime/README.md`
