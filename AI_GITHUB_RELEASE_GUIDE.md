# Tooliva AI 组件与模型 GitHub 上传指南

## 1. 文档目标

这份文档专门说明下面这件事：

- 如何把 `Tooliva` 的 AI runtime 打包产物和 `big-lama.pt` 模型上传到 GitHub
- 如何设计版本号，避免后续发布混乱
- 如何区分“代码仓库提交”和“发布资产上传”
- 如何处理兼容性、回滚、补丁更新和常见坑

这份指南基于当前仓库的真实实现编写，适用于当前项目的“手动下载 + 手动导入”产品流程。

---

## 2. 先说结论：当前项目最推荐的发布方式

当前项目不推荐把 AI runtime 和模型直接提交进 Git 仓库本体，而推荐使用下面的发布结构：

- 代码、脚本、配置、文档：提交到 Git 仓库
- 桌面安装包：上传到 GitHub Releases
- AI runtime 压缩包：上传到 GitHub Releases
- `big-lama.pt` 模型：上传到 GitHub Releases
- `manifest.generated.json`、校验说明、导入说明：一起作为 Release 附件上传

也就是说，推荐结构是：

1. 仓库里保留“怎么构建”的能力
2. Release 里保留“给用户下载”的大文件
3. 不把几百 MB 到几 GB 的 AI 产物直接塞进普通 Git 提交历史

这是当前项目最符合现状的方案，因为：

- 当前桌面安装包明确不应该内置 AI runtime 和模型
- 仓库 `.gitignore` 已经排除了 `src-tauri/resources/ai-runtime/python/`、模型文件和若干 AI 产物目录
- 当前应用的 AI 导入流程就是本地手动选择 `.7z` / `.zip` 和 `big-lama.pt`
- 当前发布文档也明确采用“主程序安装包 + AI runtime 包 + 模型文件”分发方式

---

## 3. 当前项目的真实分发结构

结合当前仓库代码和脚本，正式发布时建议拆成 3 类文件：

### 3.1 主程序安装包

示例：

- `Tooliva_0.1.0_x64-setup.exe`

作用：

- 给用户安装桌面应用本体
- 包含前端、Rust 主程序、`ffmpeg.exe`、`ffprobe.exe`、`7za.exe`
- 不包含 AI runtime
- 不包含 `big-lama.pt`

### 3.2 AI runtime 压缩包

示例：

- `ai-runtime-windows-x64-v1.0.0.7z`

作用：

- 给用户在应用设置页中手动导入
- 提供 Python runtime、PyTorch、`iopaint`、`cv2`、`sidecars/lama_inpaint.py` 等 AI 执行环境

当前应用支持的导入格式：

- `.7z`
- `.zip`

当前更推荐：

- `.7z`

原因是当前文档和脚本都已经切换到 `.7z` 作为默认形式，而且应用安装包也内置了 `7za.exe`。

### 3.3 模型文件

示例：

- `big-lama.pt`

作用：

- 给用户在应用设置页中单独导入
- 提供 LaMA inpainting 模型权重

非常重要：

- 当前应用导入模型时会严格检查文件名
- 用户选择的文件名必须是 `big-lama.pt`
- 如果你把上传文件改成 `big-lama-v1.0.0.pt`，当前应用会拒绝导入

所以在 GitHub Release 上，模型附件推荐就保持原名：

- `big-lama.pt`

---

## 4. 哪些内容应该传到 Git，哪些不应该

## 4.1 应该进入 Git 仓库的内容

- [scripts/package-ai-runtime.ps1](/F:/Vibe%20Coding/Tools/scripts/package-ai-runtime.ps1)
- [scripts/prepare-ai-runtime-source.ps1](/F:/Vibe%20Coding/Tools/scripts/prepare-ai-runtime-source.ps1)
- [docs/ai-runtime/manual-package.md](/F:/Vibe%20Coding/Tools/docs/ai-runtime/manual-package.md)
- [docs/release/windows-release-guide.md](/F:/Vibe%20Coding/Tools/docs/release/windows-release-guide.md)
- AI runtime 的构建说明、发布说明、版本策略文档
- sidecar 脚本源文件
- requirements / 依赖说明
- 与 AI runtime 发布相关的 manifest 模板、校验逻辑、工作流脚本

## 4.2 不应该直接进入普通 Git 提交历史的内容

- `src-tauri/resources/ai-runtime/python/`
- 整包运行时目录
- `_ai/`
- `_ai_stage/`
- `_runtime_smoke_*`
- 大体积 `.pt`
- `.safetensors`
- 已打包的 `.7z`
- 已构建出的多 GB runtime 文件

这不只是“仓库会变大”的问题，还包括：

- Git 历史一旦写入大文件，后续清理成本很高
- 团队成员克隆仓库会变慢
- CI 拉仓库会变慢
- 以后迁移仓库、镜像仓库或做浅克隆时都会变麻烦

## 4.3 Git LFS 能不能用

能，但当前项目不推荐把它当作首选分发方式。

原因不是 Git LFS 不能存，而是对当前项目来说不够合适：

- 当前产品是“给最终用户下载资产”，不是“给研发团队 checkout 模型源码”
- AI runtime 和模型是发布资产，不是日常协作文件
- LFS 会引入配额、计费、拉取策略和权限管理问题
- 普通用户不会通过 `git clone` 获取 AI runtime

更适合当前项目的方式仍然是：

- GitHub Releases 上传附件

如果以后团队内部确实需要把模型样本、小型推理资源或测试权重版本化，可以单独评估 Git LFS；但对于当前这套正式分发链路，不建议把大 runtime 包和正式模型作为 Git LFS 主渠道。

---

## 5. 当前仓库里的关键脚本和它们分别做什么

## 5.1 预处理运行时源目录

脚本：

- [scripts/prepare-ai-runtime-source.ps1](/F:/Vibe%20Coding/Tools/scripts/prepare-ai-runtime-source.ps1)

作用：

- 从基础 Python 与现有 site-packages 中整理出“可发布”的 runtime 源目录
- 排除一些不必要文件
- 默认排除 `paddle`
- 生成适合后续压缩打包的结构

典型输出目录：

- `_ai/`

输出结构大致为：

```text
_ai/
  python-base/
  python-site-packages/
  sidecars/
```

## 5.2 打 runtime 发布包

脚本：

- [scripts/package-ai-runtime.ps1](/F:/Vibe%20Coding/Tools/scripts/package-ai-runtime.ps1)

作用：

- 把 AI runtime 打成 `.7z`
- 生成 `manifest.generated.json`
- 可选复制 `big-lama.pt`
- 计算压缩包 SHA256
- 记录 `runtimeVersion`、`modelVersion`、`minAppVersion`、`channel`、`platform` 等信息

默认输出目录：

```text
dist/ai-runtime/<RuntimeVersion>/
  ai-runtime.7z
  manifest.generated.json
```

如果传了 `-ModelFilePath`，还会把模型拷进该输出目录，便于你集中上传：

```text
dist/ai-runtime/<RuntimeVersion>/
  ai-runtime.7z
  manifest.generated.json
  manual-import-notes.txt
  big-lama.pt
```

---

## 6. 发布前推荐的本地目录约定

为了减少混乱，建议你在本地始终按下面方式准备发布文件：

```text
dist/
  ai-runtime/
    1.0.0/
      ai-runtime-windows-x64-v1.0.0.7z
      manifest.generated.json
      manual-import-notes.txt
      big-lama.pt

src-tauri/
  target/release/bundle/nsis/
    Tooliva_0.1.0_x64-setup.exe
```

建议做法是：

1. 打完 runtime 后，把 `ai-runtime.7z` 重命名为更清晰的发布名
2. 主程序安装包保持 Tauri 默认构建产物命名
3. 模型文件保持 `big-lama.pt`

推荐命名：

- 安装包：`Tooliva_0.1.0_x64-setup.exe`
- runtime：`ai-runtime-windows-x64-v1.0.0.7z`
- manifest：`manifest.generated.json`
- 模型：`big-lama.pt`

为什么 runtime 要主动带版本号？

因为当前应用在“本地导入 runtime 包”时，会根据压缩包文件名生成本地安装记录中的版本串。虽然它最终会加上 `manual-...-timestamp`，但文件名越清晰，后续排查越容易。

---

## 7. 最推荐的 GitHub 上传方案：GitHub Releases

## 7.1 为什么选 Releases

对当前项目来说，GitHub Releases 的优点非常明确：

- 用户拿的是现成下载链接，不需要懂 Git
- 安装包、runtime、模型可以放在同一个版本页面
- 便于写变更说明
- 便于做 beta / stable 区分
- 不污染仓库提交历史
- 与当前“手动导入”产品流程完全一致

## 7.2 一次正式发布建议上传哪些附件

一个完整 Release 建议至少上传下面这些文件：

- 主程序安装包
- AI runtime 压缩包
- `big-lama.pt`
- `manifest.generated.json`
- `manual-import-notes.txt`

示例：

```text
Tooliva_0.1.0_x64-setup.exe
ai-runtime-windows-x64-v1.0.0.7z
big-lama.pt
manifest.generated.json
manual-import-notes.txt
```

如果你们团队习惯做校验，也建议额外上传：

- `SHA256SUMS.txt`

---

## 8. 具体打包与上传流程

## 8.1 第一步：构建主程序安装包

在仓库根目录执行：

```powershell
npm run tauri:build
```

产物通常位于：

- `src-tauri\target\release\bundle\nsis\`

当前仓库配置目标是 `nsis`，因此你主要会拿到 `.exe` 安装器。

## 8.2 第二步：准备 AI runtime 源目录

如果你需要从基础 Python 和现有依赖重新整理一份干净发布源，可执行：

```powershell
.\scripts\prepare-ai-runtime-source.ps1 `
  -BasePythonRoot "D:\python3.10" `
  -SitePackagesSource ".\src-tauri\resources\ai-runtime\python\Lib\site-packages" `
  -SidecarsSource ".\src-tauri\resources\ai-runtime\sidecars" `
  -OutputRoot ".\_ai"
```

如果当前 `src-tauri/resources/ai-runtime` 已经是你们确认过的发布源，也可以直接跳过这一步，改为让 `package-ai-runtime.ps1` 从现有目录打包。

## 8.3 第三步：生成 runtime 包和 manifest

推荐命令：

```powershell
.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -Channel stable `
  -MinAppVersion 0.1.0 `
  -Platform windows-x64 `
  -PackageFileName "ai-runtime-windows-x64-v1.0.0.7z" `
  -SourceRoot ".\_ai" `
  -ModelVersion 1.0.0 `
  -ModelFilePath "D:\releases\big-lama.pt"
```

这条命令做了几件事情：

- 把 runtime 打成 `ai-runtime-windows-x64-v1.0.0.7z`
- 生成 `manifest.generated.json`
- 计算 runtime 包的 SHA256
- 读取 `big-lama.pt` 的真实大小和 SHA256
- 把模型拷贝到输出目录，方便你统一上传

特别建议：

- 正式发布时尽量总是传 `-ModelFilePath`

原因是：

- 如果不传，`manifest.generated.json` 里的模型校验字段可能仍然是占位值或默认值
- 你会丢失一份和本次发布完全一致的模型校验结果

## 8.4 第四步：检查输出目录

执行后，检查：

```text
dist/ai-runtime/1.0.0/
```

确认至少存在：

- `ai-runtime-windows-x64-v1.0.0.7z`
- `manifest.generated.json`
- `manual-import-notes.txt`
- `big-lama.pt`

## 8.5 第五步：检查 runtime 包是否符合导入要求

runtime 压缩包内部必须是应用可以识别的结构，当前支持两种布局：

方式 A：

```text
python/
sidecars/
```

方式 B：

```text
python-base/
python-site-packages/
sidecars/
```

关键文件必须存在：

- `sidecars/lama_inpaint.py`
- `python/python.exe`

或者：

- `python-base/python.exe`
- `python-site-packages/torch/__init__.py`

如果结构不对，用户导入时会失败。

## 8.6 第六步：上传到 GitHub Release

你有两种常用方式：

- GitHub 网页端上传
- GitHub CLI 上传

---

## 9. 用 GitHub 网页端上传的详细步骤

## 9.1 创建一个 Release

1. 打开 GitHub 仓库主页
2. 进入 `Releases`
3. 点击 `Draft a new release`
4. 选择或创建 tag

推荐 tag 命名：

- `v0.1.0`
- `v0.1.1`
- `v0.2.0-beta.1`

推荐 Release 标题：

- `Tooliva v0.1.0`
- `Tooliva v0.1.1`
- `Tooliva v0.2.0 Beta 1`

## 9.2 上传附件

把下面文件拖入附件区：

- `Tooliva_0.1.0_x64-setup.exe`
- `ai-runtime-windows-x64-v1.0.0.7z`
- `big-lama.pt`
- `manifest.generated.json`
- `manual-import-notes.txt`

## 9.3 写发布说明时建议写清楚

至少要写：

- 这个版本的主程序版本号
- 对应 runtime 版本号
- 对应模型版本号
- 用户应该先下载什么，再导入什么
- 当前是否兼容旧 runtime / 旧模型

建议文案结构：

```text
1. Download and install the desktop app.
2. Open Tooliva Settings > AI Enhancement.
3. Import ai-runtime-windows-x64-v1.0.0.7z.
4. Import big-lama.pt.
5. Restart the app if needed.
```

## 9.4 发布前最后检查

发布前至少看一遍：

- 模型附件文件名是否还是 `big-lama.pt`
- runtime 是否确实是 `.7z` 或 `.zip`
- 是否误把 `_ai/` 整个目录上传成源代码附件
- 是否漏传 `manifest.generated.json`
- 是否把主程序版本和 runtime 版本写错

---

## 10. 用 GitHub CLI 上传的详细步骤

如果你们团队习惯命令行发布，可以使用 `gh`。

## 10.1 创建 Release

示例：

```powershell
gh release create v0.1.0 `
  "src-tauri/target/release/bundle/nsis/Tooliva_0.1.0_x64-setup.exe" `
  "dist/ai-runtime/1.0.0/ai-runtime-windows-x64-v1.0.0.7z" `
  "dist/ai-runtime/1.0.0/big-lama.pt" `
  "dist/ai-runtime/1.0.0/manifest.generated.json" `
  "dist/ai-runtime/1.0.0/manual-import-notes.txt" `
  --title "Tooliva v0.1.0" `
  --notes "Desktop installer and manual AI runtime package for Tooliva v0.1.0."
```

## 10.2 已有 Release 时追加上传附件

```powershell
gh release upload v0.1.0 `
  "dist/ai-runtime/1.0.0/ai-runtime-windows-x64-v1.0.0.7z" `
  "dist/ai-runtime/1.0.0/big-lama.pt" `
  "dist/ai-runtime/1.0.0/manifest.generated.json" `
  "dist/ai-runtime/1.0.0/manual-import-notes.txt"
```

## 10.3 命令行上传时的建议

- 先在本地把文件名改成最终发布名，再上传
- 不要指望上传后再解释“这个文件其实对应另一个版本”
- 每个版本单独一个目录，避免传错文件

---

## 11. 版本设计：一定要分清 4 套版本号

这个项目至少有 4 个“版本概念”，不要混在一起：

1. 桌面应用版本
2. AI runtime 版本
3. 模型版本
4. 最低兼容应用版本

---

## 12. 桌面应用版本

桌面应用版本就是用户安装的 Tooliva 客户端版本。

当前相关位置：

- [package.json](/F:/Vibe%20Coding/Tools/package.json)
- [src-tauri/tauri.conf.json](/F:/Vibe%20Coding/Tools/src-tauri/tauri.conf.json)
- [src-tauri/Cargo.toml](/F:/Vibe%20Coding/Tools/src-tauri/Cargo.toml)

推荐格式：

- `0.1.0`
- `0.1.1`
- `0.2.0`

建议规则：

- UI 修复、普通 bug 修复：`PATCH`
- 新增功能但兼容旧行为：`MINOR`
- 明显破坏兼容、安装流程改变、AI 导入策略改变：`MAJOR`

---

## 13. AI runtime 版本

这个版本由 `package-ai-runtime.ps1` 的 `-RuntimeVersion` 控制。

示例：

- `1.0.0`
- `1.0.1`
- `1.1.0`
- `2.0.0`

这个版本用来表示：

- 运行时 Python 基底是否变化
- PyTorch / `iopaint` / `cv2` 依赖是否变化
- runtime 包目录结构是否变化
- sidecar 脚本是否变化

建议规则：

- 只修补小问题，不改变目录结构或核心依赖：升 `PATCH`
- 新增依赖、更新依赖、增强功能但兼容旧导入方式：升 `MINOR`
- 目录结构变化、启动方式变化、旧客户端不再兼容：升 `MAJOR`

---

## 14. 模型版本

这个版本由 `package-ai-runtime.ps1` 的 `-ModelVersion` 控制。

它不是文件名，而是写入 `manifest.generated.json` 的模型元信息。

示例：

- `1.0.0`
- `1.0.1`
- `1.1.0`

模型版本应该在下面场景变化：

- `big-lama.pt` 内容发生变化
- 模型换了新的训练权重
- 模型文件大小、SHA256 发生变化

如果模型文件没变，就不要随意改模型版本。

---

## 15. 最低兼容应用版本 `minAppVersion`

这个字段由 `package-ai-runtime.ps1` 的 `-MinAppVersion` 控制。

它表达的是：

- 这个 runtime 包最少要求什么版本的 Tooliva 客户端来导入和使用

示例：

- `0.1.0`
- `0.1.5`
- `0.2.0`

推荐规则：

- 如果新 runtime 只是依赖更新，但旧客户端仍能识别和导入：保持不变
- 如果新 runtime 结构改变，必须依赖新客户端代码：提高 `minAppVersion`

---

## 16. `channel` 应该怎么用

脚本支持：

- `stable`
- `beta`

虽然当前产品主流程不是远程自动下载，但仍建议保持这个字段有意义。

推荐约定：

- `stable`：对普通用户发布
- `beta`：内部测试、灰度测试、试用版

不要把以下东西混在一起：

- GitHub tag 是 `v0.1.0-beta.1`
- runtime channel 却写成 `stable`

版本语义最好一致。

---

## 17. 推荐的版本关系设计

下面是一套很实用的推荐方式：

### 场景 A：只改桌面 UI 或普通逻辑，不改 AI runtime，不改模型

- App：`0.1.0 -> 0.1.1`
- Runtime：保持 `1.0.0`
- Model：保持 `1.0.0`
- `minAppVersion`：保持 `0.1.0`

这种情况：

- 重新发布安装包即可
- 不需要重新上传 runtime
- 不需要重新上传模型

### 场景 B：修 runtime 脚本或依赖，但模型不变

- App：可保持不变，或按需升级
- Runtime：`1.0.0 -> 1.0.1`
- Model：保持 `1.0.0`
- `minAppVersion`：若兼容旧客户端，可保持

这种情况：

- 重新上传 runtime 包
- 模型可以不变
- 发布说明里要写“runtime 已更新，模型无需重新导入”

### 场景 C：模型换了新权重，但 runtime 不变

- App：可不变
- Runtime：保持 `1.0.0`
- Model：`1.0.0 -> 1.0.1`
- `minAppVersion`：通常不变

这种情况：

- 重新上传 `big-lama.pt`
- 更新 manifest 中模型版本和校验值
- runtime 包可以不变

### 场景 D：runtime 结构变了，旧客户端不兼容

- App：`0.1.x -> 0.2.0`
- Runtime：`1.x -> 2.0.0`
- Model：按需变更
- `minAppVersion`：提升到 `0.2.0`

这种情况：

- 应用和 runtime 要一起发
- 发布说明里必须明确“旧客户端不要导入新 runtime”

---

## 18. 文件命名策略建议

命名一定要可读、可追溯、可回滚。

推荐：

- 安装包：`Tooliva_0.1.0_x64-setup.exe`
- runtime：`ai-runtime-windows-x64-v1.0.0.7z`
- 模型：`big-lama.pt`
- manifest：`manifest.generated.json`
- checksums：`SHA256SUMS.txt`

不推荐：

- `final.7z`
- `new-runtime.7z`
- `latest-runtime.7z`
- `big-lama-new.pt`

原因很简单：

- 日后排查用户问题时，你根本无法通过文件名判断用户下载的是哪个版本

---

## 19. `manifest.generated.json` 在当前项目里到底有什么用

这一点很重要，容易混淆。

当前项目里：

- 应用的“手动本地导入 runtime”流程，并不会直接去读取你放在 GitHub 上的 `manifest.generated.json`
- 用户导入的是本地 `.7z` / `.zip` 文件
- 应用安装后会在本地 runtime 存储目录里生成自己的 `manifest.json`

也就是说，当前阶段：

- `manifest.generated.json` 更像“发布元信息”和“运维记录”
- 它可以帮助你记录本次发布的 runtime 版本、模型版本、SHA256、最低兼容版本
- 它也为未来做远程清单、自动更新、下载校验保留了接口

所以推荐做法是：

- 继续生成并上传 `manifest.generated.json`
- 但不要误以为“只上传 manifest，应用就会自动下载 AI runtime”
- 当前产品流程仍然是用户手动下载、手动导入

---

## 20. 如何处理版本兼容问题

最核心的原则是：

- 应用版本解决“客户端逻辑兼容性”
- runtime 版本解决“AI 运行环境兼容性”
- 模型版本解决“权重文件兼容性”

遇到兼容问题时，优先问自己 3 个问题：

1. 这次改动是不是影响了 runtime 包目录结构
2. 这次改动是不是影响了模型文件本身
3. 旧版客户端还能不能识别并正确导入新包

如果答案是：

- 旧客户端不能识别新包：提高 `minAppVersion`
- 旧 runtime 还能跑，只是效果差：升 runtime `PATCH` 或 `MINOR`
- 只有模型变了：只升 model version

---

## 21. 如何处理回滚

AI 组件发布最怕“换了文件，但版本没变”。

正确回滚方式是：

### 21.1 主程序有问题

- 回滚桌面安装包版本
- runtime 和模型如果没问题，可以不动

### 21.2 runtime 有问题

- 重新打一个新的 runtime 版本
- 不要把坏文件覆盖成同名新文件然后假装没发生过
- 正确做法是发一个新版本，例如：
  - `1.0.0 -> 1.0.1`

### 21.3 模型有问题

- 重新上传新的 `big-lama.pt`
- 同时更新 `ModelVersion`
- 重新生成 `manifest.generated.json`

### 21.4 最不推荐的方式

- 保持版本号不变，只替换 GitHub 上原文件内容

这会导致：

- 用户明明说自己下载的是“1.0.0”，但你后台替换过内容
- 你无法确定对方拿到的是旧 1.0.0 还是新 1.0.0
- SHA256 校验会对不上

所以推荐原则是：

- 内容变了，版本就变

---

## 22. 当前项目里最容易踩的坑

## 22.1 把模型上传成别的文件名

错误示例：

- `big-lama-v1.pt`
- `lama.pt`

当前应用会拒绝导入，因为它要求文件名必须是：

- `big-lama.pt`

## 22.2 把 Python 虚拟环境当成发布 runtime

当前脚本已经有专门校验，虚拟环境会被视为不可移植。

不要把下面这种东西当正式发布包：

- 带 `pyvenv.cfg` 的 venv

要发布的是：

- portable Python
- 或 `python-base + python-site-packages + sidecars` 结构

## 22.3 误把 AI runtime 打进 NSIS 安装包

当前项目文档明确要求不要这样做。

不要重新往安装包里塞：

- `resources/ai-runtime`
- Python runtime
- `torch`
- `iopaint`
- `big-lama.pt`

## 22.4 不传 `-ModelFilePath` 就生成正式 manifest

这样容易留下不真实的模型校验值。

正式发版时，建议总是带上：

- `-ModelFilePath`

## 22.5 runtime 版本和文件名完全对不上

错误示例：

- `RuntimeVersion=1.0.0`
- 文件名却叫 `ai-runtime-windows-x64-v2.0.0.7z`

这样后续你自己都会查晕。

推荐原则：

- 参数版本、目录版本、文件名版本、Release 说明版本保持一致

## 22.6 发布说明里不写导入顺序

当前是手动导入流程，用户不知道顺序就很容易出错。

建议始终写清楚：

1. 先安装主程序
2. 再导入 runtime
3. 再导入 `big-lama.pt`

---

## 23. 推荐发布清单

每次正式上传到 GitHub 前，建议按下面清单过一遍：

### 23.1 主程序

- `npm run tauri:build` 成功
- 安装包能正常安装
- 非 AI 功能正常

### 23.2 runtime

- runtime 压缩包是 `.7z` 或 `.zip`
- 压缩包内部结构符合要求
- `sidecars/lama_inpaint.py` 存在
- Python 可执行文件存在
- smoke test 通过

### 23.3 模型

- 文件名是 `big-lama.pt`
- 文件大小符合预期
- SHA256 已记录

### 23.4 版本

- App version 正确
- RuntimeVersion 正确
- ModelVersion 正确
- MinAppVersion 正确
- channel 正确

### 23.5 Release 页面

- tag 正确
- 标题正确
- 附件传全
- 说明写清楚导入顺序
- 没有把内部测试文件误上传

---

## 24. 一套可直接复用的推荐命令

## 24.1 准备 runtime 源目录

```powershell
.\scripts\prepare-ai-runtime-source.ps1 `
  -BasePythonRoot "D:\python3.10" `
  -SitePackagesSource ".\src-tauri\resources\ai-runtime\python\Lib\site-packages" `
  -SidecarsSource ".\src-tauri\resources\ai-runtime\sidecars" `
  -OutputRoot ".\_ai"
```

## 24.2 生成发布用 runtime 包

```powershell
.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -Channel stable `
  -MinAppVersion 0.1.0 `
  -Platform windows-x64 `
  -PackageFileName "ai-runtime-windows-x64-v1.0.0.7z" `
  -SourceRoot ".\_ai" `
  -ModelVersion 1.0.0 `
  -ModelFilePath "D:\releases\big-lama.pt"
```

## 24.3 生成主程序安装包

```powershell
npm run tauri:build
```

## 24.4 用 GitHub CLI 创建 Release

```powershell
gh release create v0.1.0 `
  "src-tauri/target/release/bundle/nsis/Tooliva_0.1.0_x64-setup.exe" `
  "dist/ai-runtime/1.0.0/ai-runtime-windows-x64-v1.0.0.7z" `
  "dist/ai-runtime/1.0.0/big-lama.pt" `
  "dist/ai-runtime/1.0.0/manifest.generated.json" `
  "dist/ai-runtime/1.0.0/manual-import-notes.txt" `
  --title "Tooliva v0.1.0" `
  --notes "Manual AI runtime and model import package for Tooliva v0.1.0."
```

---

## 25. 最后的建议

如果你只记住 5 条，记住下面这些就够了：

1. 大文件发布走 GitHub Releases，不走普通 Git 提交
2. runtime 和模型分开发，主程序安装包里不要再塞 AI runtime
3. `big-lama.pt` 文件名不要改
4. 内容变了就升版本，不要偷偷覆盖旧文件
5. `RuntimeVersion`、`ModelVersion`、`MinAppVersion` 和 Release 文案一定要统一

如果后面你愿意，我下一步可以继续帮你把这份文档再往前推进一层，直接补成：

- GitHub Release 标准模板
- `SHA256SUMS.txt` 自动生成脚本
- 一套可直接执行的 `gh release create` 发布脚本
