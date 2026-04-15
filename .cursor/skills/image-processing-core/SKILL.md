---
name: image-processing-core
description: 提供 Rust 图片处理公共任务框架（调度、后台执行、进度
、IO、上下文、tile、错误与性能日志），并通过 trait 插件化接入压缩/水印/放大/裁剪/格式转换等模块。用户提到图片处理、批量任务、进度回调、大图分块、统一错误日志、GPU/AI 扩展时必须优先使用。
---

# image-processing-core

## 定位

`image-processing-core` 是图片处理**基础设施 Skill**，不是算法 Skill。

- 负责：任务框架、执行链路、进度、IO、上下文、错误、日志、扩展点
- 不负责：具体图片算法实现细节（压缩策略、水印算法、滤镜核等）
- 开发模式：`实现处理器 + 注册到框架 + 调用任务系统`

---

## 适用范围

当需求满足以下任一场景时使用本 Skill：

- Rust/Tauri 图片处理模块开发
- 单图或批量图片任务执行
- 需要进度回调和 UI 实时监听
- 需要后台线程执行避免阻塞 UI
- 需要统一图片加载/解码/保存
- 大图处理（4K/8K）或分块处理（tile + overlap）
- 需要统一错误码、阶段耗时与性能日志
- 需要 GPU/AI 推理扩展接口

---

## 非适用范围

以下情况不应引入本 Skill：

- 纯前端 Canvas 临时处理（无 Rust 后端任务）
- 单次极简脚本（无任务管理、无复用需求）
- 与图片无关的音频/文档处理流程
- 仅做 UI 样式改动，不涉及图片处理执行链路

---

## 强制复用规则

凡是新图片模块，只要涉及以下任意两项及以上，必须复用 `image-processing-core`，禁止另起底层实现：

- 后台线程处理
- 进度回调
- 文件加载或保存
- 图片解码或编码
- 批量任务处理
- 大图处理
- tile 分块处理
- 错误处理
- 性能日志

执行要求：

1. 先实现 `ImageProcessor` trait
2. 注册到 `ProcessorRegistry`
3. 通过统一 `start_image_job` 入口调度
4. 复用统一 `ProgressEvent`、`ImagePipelineError`、`PipelineSummary`

---

## 工程目录结构（标准）

```text
src-tauri/src/
├─ image_core/
│  ├─ mod.rs
│  ├─ types.rs           # Context/Plan/Output/Progress/Summary
│  ├─ error.rs           # ImagePipelineError
│  ├─ io.rs              # load/decode/save + path policy
│  ├─ tile.rs            # tile + overlap engine
│  ├─ scheduler.rs       # queue/concurrency/throttle/cancel hooks
│  ├─ executor.rs        # spawn_blocking wrapper
│  ├─ progress.rs        # reporter abstraction + event dispatch
│  ├─ metrics.rs         # stage timing + counters
│  ├─ logger.rs          # structured logs
│  ├─ processor.rs       # ImageProcessor trait
│  ├─ registry.rs        # processor registry
│  └─ pipeline.rs        # orchestration pipeline
├─ image_processors/
│  ├─ mod.rs
│  ├─ registry.rs
│  ├─ upscale/processor.rs
│  ├─ compress/processor.rs
│  ├─ watermark/processor.rs
│  ├─ convert/processor.rs
│  └─ crop/processor.rs
└─ commands/
   ├─ image_jobs.rs      # unified command entry
   └─ image.rs           # compatibility wrapper (optional)
```

---

## 核心 Trait 设计

### 1) 处理器接口（算法插件入口）

```rust
pub trait ImageProcessor: Send + Sync {
    fn key(&self) -> &'static str;
    fn plan(
        &self,
        ctx: &ProcessContext,
        input: &LoadedImage,
    ) -> Result<ProcessPlan, ImagePipelineError>;
    fn process(
        &self,
        ctx: &ProcessContext,
        input: &LoadedImage,
        plan: &ProcessPlan,
        runtime: &ProcessRuntime,
    ) -> Result<ProcessOutput, ImagePipelineError>;
}
```

### 2) 分块算法接口（可复用 tile 处理）

```rust
pub trait TileAlgorithm: Send + Sync {
    fn process_tile(
        &self,
        source: &RgbaImage,
        rect: TileRect,
        plan: &ProcessPlan,
    ) -> Result<TileResult, ImagePipelineError>;
}
```

### 3) 进度上报接口

```rust
pub trait ProgressReporter: Send + Sync {
    fn emit(&self, event: ProgressEvent);
}
```

---

## Context 结构设计

```rust
pub struct ProcessContext {
    pub task_id: String,
    pub processor_key: String,
    pub input_path: PathBuf,
    pub output_path: PathBuf,
    pub output_format: Option<String>,
    pub params: serde_json::Value,
    pub limits: ProcessingLimits,
    pub tile: TileConfig,
}
```

关键原则：

- `params` 保持 JSON 扩展能力，处理器内部反序列化强类型参数
- `limits` 统一像素/边长/内存约束
- `tile` 统一分块策略，禁止处理器重复定义同类字段

---

## Progress 结构设计

状态集合固定：

- `pending / loading / processing / saving / done / failed / cancelled`

统一事件结构：

```rust
pub struct ProgressEvent {
    pub task_id: String,
    pub processor_key: String,
    pub progress: u8,         // 0..100
    pub stage: String,        // 上述状态之一
    pub backend: Option<String>, // cpu/gpu/ai
    pub message: Option<String>,
}
```

要求：

- 每个阶段至少上报一次
- `failed/cancelled/done` 必须终态上报
- 前端仅监听统一事件名，不依赖具体算法模块

---

## Error 结构设计

```rust
pub enum ImagePipelineError {
    InvalidInput(String),
    DecodeFailed(String),
    EncodeFailed(String),
    IoFailed(String),
    PlanFailed(String),
    TileProcessFailed(String),
    ProcessorNotFound(String),
    NotImplemented(String),
    Internal(String),
}
```

规则：

- command 层只做一次映射：`ImagePipelineError -> error_code + user_message`
- 不允许处理器直接返回裸 `String` 作为最终错误

---

## Task / Queue 调度设计

建议结构：

```rust
pub struct ImageTask {
    pub task_id: String,
    pub processor_key: String,
    pub context: ProcessContext,
}

pub struct TaskQueueConfig {
    pub max_concurrency: usize,
    pub throttle_ms_between_tasks: u64,
}
```

调度原则：

1. 支持单任务和批量任务
2. 所有耗时处理进入后台线程（`spawn_blocking`）
3. 支持取消（任务标记 + 处理阶段检查）
4. 并发由队列统一控制，处理器不可自行开无界线程

---

## Tile 分块处理设计

目标：统一支撑大图场景，避免高峰内存和长时间卡顿。

- 输入：`tile_size`、`tile_overlap`
- 产出：按 tile 执行，输出图逐块回写
- 适配模块：放大、压缩、去水印、滤镜、局部修复

执行约束：

1. overlap 由框架统一计算
2. 处理器只实现“单 tile 算法”
3. 分块进度由 `TileEngine` 汇总并上报

---

## 性能日志方案

统一记录耗时：

- `load / decode / process / encode / save / total`

建议输出字段：

- `task_id`
- `processor_key`
- `stage`
- `elapsed_ms`
- `input_size`
- `output_size`
- `backend`
- `error_code`（若失败）

统计结果统一放入 `PipelineSummary` 返回，供 UI/监控使用。

---

## 接入流程（Agent 必须遵循）

1. 新建处理器目录并实现 `ImageProcessor`
2. 定义参数结构并从 `ctx.params` 反序列化
3. 在 `image_processors/registry.rs` 注册处理器
4. 通过统一任务入口触发处理
5. 添加进度上报与错误映射
6. 接入性能日志与阶段耗时

---

## 示例一：图片压缩模块接入

### A. 实现处理器

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompressParams {
    quality: u8,         // 1..100
    target_format: Option<String>,
}

pub struct CompressProcessor;

impl ImageProcessor for CompressProcessor {
    fn key(&self) -> &'static str { "compress" }

    fn plan(&self, ctx: &ProcessContext, input: &LoadedImage) -> Result<ProcessPlan, ImagePipelineError> {
        let _params: CompressParams = serde_json::from_value(ctx.params.clone())
            .map_err(|e| ImagePipelineError::InvalidInput(e.to_string()))?;
        Ok(ProcessPlan {
            input_width: input.image.width(),
            input_height: input.image.height(),
            output_width: input.image.width(),
            output_height: input.image.height(),
            estimated_memory_mb: 64,
            total_steps: 100,
        })
    }

    fn process(
        &self,
        ctx: &ProcessContext,
        input: &LoadedImage,
        _plan: &ProcessPlan,
        runtime: &ProcessRuntime,
    ) -> Result<ProcessOutput, ImagePipelineError> {
        runtime.progress.emit(ProgressEvent::stage(&ctx.task_id, "compress", "processing", 40, Some("压缩中".to_string())));
        // TODO: 在此替换为真实压缩算法
        runtime.io.save(&input.image, &ctx.output_path, input.format.into())?;
        runtime.progress.emit(ProgressEvent::stage(&ctx.task_id, "compress", "saving", 90, Some("保存中".to_string())));
        Ok(ProcessOutput {
            output_path: ctx.output_path.clone(),
            output_width: input.image.width(),
            output_height: input.image.height(),
            backend_used: "cpu".to_string(),
            metadata: serde_json::json!({"module":"compress"}),
        })
    }
}
```

### B. 接入任务系统 + 进度监听

```rust
// registry.rs
registry.register(Arc::new(CompressProcessor));

// command payload
{
  "processorKey": "compress",
  "params": { "quality": 80, "targetFormat": "jpg" }
}
```

---

## 示例二：图片加水印模块接入

### A. 实现处理器（复用统一 Context）

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WatermarkParams {
    text: Option<String>,
    image_path: Option<String>,
    opacity: f32,
    position: String,
}

pub struct WatermarkProcessor;

impl ImageProcessor for WatermarkProcessor {
    fn key(&self) -> &'static str { "watermark" }

    fn plan(&self, ctx: &ProcessContext, input: &LoadedImage) -> Result<ProcessPlan, ImagePipelineError> {
        let _params: WatermarkParams = serde_json::from_value(ctx.params.clone())
            .map_err(|e| ImagePipelineError::InvalidInput(e.to_string()))?;
        Ok(ProcessPlan {
            input_width: input.image.width(),
            input_height: input.image.height(),
            output_width: input.image.width(),
            output_height: input.image.height(),
            estimated_memory_mb: 96,
            total_steps: 100,
        })
    }

    fn process(
        &self,
        ctx: &ProcessContext,
        input: &LoadedImage,
        _plan: &ProcessPlan,
        runtime: &ProcessRuntime,
    ) -> Result<ProcessOutput, ImagePipelineError> {
        runtime.progress.emit(ProgressEvent::stage(&ctx.task_id, "watermark", "processing", 45, Some("绘制水印".to_string())));
        // TODO: 在此替换为真实水印算法
        runtime.io.save(&input.image, &ctx.output_path, input.format.into())?;
        Ok(ProcessOutput {
            output_path: ctx.output_path.clone(),
            output_width: input.image.width(),
            output_height: input.image.height(),
            backend_used: "cpu".to_string(),
            metadata: serde_json::json!({"module":"watermark"}),
        })
    }
}
```

### B. 输出结果约束

- 所有结果统一走 `ProcessOutput`
- 前端统一依赖 `ProgressEvent + PipelineSummary`
- 禁止在水印模块定义独立“私有进度协议”

---

## 扩展指南（AI/GPU/视频帧）

- AI 推理：在 `runtime` 增加 `ai_backend` 能力接口，不修改 `ImageProcessor` 主签名
- GPU 加速：处理器内按 `backend_preference` 尝试 GPU，失败回退 CPU，并上报 `backend`
- 视频帧处理：把帧当作图片任务批量输入，复用同一任务框架和进度系统

---

## Agent 执行检查清单

- [ ] 是否优先复用了 `image-processing-core`
- [ ] 是否实现了 `ImageProcessor` 并注册
- [ ] 是否复用了统一进度状态与事件结构
- [ ] 是否在后台线程执行耗时流程
- [ ] 是否复用了统一 IO、错误、日志、统计
- [ ] 是否满足强制复用规则（2 项及以上能力）

