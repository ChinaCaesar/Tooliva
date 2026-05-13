/**
 * 批量任务调度公共层 - 简单调用示例。
 *
 * 本文件仅作为参考代码，**不会被任何路由或入口引用**，可放心删除或修改。
 * 复制以下代码到任意 `.vue` 的 `<script setup lang="ts">` 中即可运行。
 *
 * 示例覆盖：提交任务 → 监听进度 → 终态后读取失败列表 / 打开输出目录。
 *
 * ---
 *
 * ```ts
 * import { onMounted } from "vue";
 * import { useBatchTask } from "@/modules/batch";
 *
 * const { submit, pause, resume, cancel, progress, isRunning, isPaused, failures, successOutputs, openOutputDirectory } = useBatchTask();
 *
 * onMounted(() => {
 *   // 演示：选择 3 张图片做水印批处理
 *   void submit({
 *     taskType: "IMAGE_WATERMARK",
 *     inputFiles: [
 *       "C:/path/to/a.jpg",
 *       "C:/path/to/b.png",
 *       "C:/path/to/c.webp"
 *     ],
 *     outputDir: "C:/path/to/output",
 *     concurrencyPreset: "balanced",
 *     options: {
 *       mode: "text",
 *       position: "bottomRight",
 *       opacity: 60,
 *       margin: 24,
 *       rotation: 0,
 *       text: "Demo Watermark",
 *       fontSize: 28,
 *       textColor: "#FFFFFF"
 *     }
 *   });
 * });
 *
 * // 模板里直接绑定响应式状态：
 * // <div>已完成 {{ progress?.finished }} / {{ progress?.total }}</div>
 * // <button @click="pause" :disabled="!isRunning">暂停</button>
 * // <button @click="resume" :disabled="!isPaused">继续</button>
 * // <button @click="cancel">取消</button>
 * // <button @click="openOutputDirectory()">打开输出目录</button>
 * // <ul>
 * //   <li v-for="f in failures" :key="f.inputPath">{{ f.inputPath }} - {{ f.errorMessage }}</li>
 * // </ul>
 * ```
 *
 * ---
 *
 * 视频转 GIF 示例：
 *
 * ```ts
 * await submit({
 *   taskType: "VIDEO_TO_GIF",
 *   inputFiles: ["C:/path/to/clip.mp4"],
 *   outputDir: "C:/path/to/output",
 *   concurrencyPreset: "lowUsage", // 视频默认即为 1
 *   options: {
 *     sizePreset: "p480",
 *     fps: 12,
 *     quality: "medium",
 *     loopPlayback: true
 *   }
 * });
 * ```
 */
export const BATCH_USAGE_EXAMPLE_NAME = "batch-task-usage-example" as const;
