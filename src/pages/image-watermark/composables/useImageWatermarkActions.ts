import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  tauriClient,
  type StartImageWatermarkResult,
  type WatermarkMode,
  type WatermarkPosition
} from "@/bridge/tauriClient";
import { useSettingsStore } from "@/stores/settings.store";
import { useTaskStore } from "@/stores/task.store";
import { importDirectoryItems } from "@/pages/shared/directoryImport";
import { useTaskBatchNotification } from "@/pages/shared/useTaskBatchNotification";

type WatermarkStatus = "idle" | "running" | "completed" | "failed";
export type WatermarkOutputMode = "source" | "custom" | "overwrite";

const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp"];
const SUPPORTED_WATERMARK_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"];
const MAX_VISIBLE_ITEMS = 200;

interface WatermarkResultSummary {
  total: number;
  success: number;
  failed: number;
  elapsedMs: number;
}

type RequeueReason = "mode" | "settings";

interface WatermarkPreviewGeometry {
  baseWidthPx: number;
  baseHeightPx: number;
  overlayWidthPx: number;
  overlayHeightPx: number;
}

export interface WatermarkItem {
  id: string;
  fileName: string;
  inputPath: string;
  outputPath?: string;
  status: WatermarkStatus;
  progress: number;
  error?: string;
  originalSize?: string;
  outputSize?: string;
}

interface PreviewRect {
  width: number;
  height: number;
}

interface DragState {
  isActive: boolean;
  pointerId: number | null;
  offsetLeft: number;
  offsetTop: number;
}

const PREVIEW_BASE = {
  width: 920,
  height: 620
} as const;
const DEFAULT_WATERMARK_TEXT = "水印";
const DEFAULT_WATERMARK_FONT_SIZE = 100;
const WINDOWS_PATH_SEPARATOR = "\\";

/**
 * 从完整路径提取文件名，避免任务列表展示过长路径。
 */
function extractFileName(path: string): string {
  const chunks = path.split(/[/\\]/);
  const fileName = chunks.pop();
  return fileName || path;
}

/**
 * 将毫秒格式化为友好的耗时文案。
 */
function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${mins}m ${remain}s`;
}

/**
 * 将宽高拼成展示文案。
 */
function formatSize(width: number, height: number): string {
  return `${width} x ${height}`;
}

/**
 * 将原图像素中的覆盖层尺寸映射到预览画布坐标系。
 */
function mapOverlayToPreviewSize(
  geometry: WatermarkPreviewGeometry | null,
  previewSize: PreviewRect,
  fallbackSize: PreviewRect
): PreviewRect {
  if (!geometry || geometry.baseWidthPx <= 0 || geometry.baseHeightPx <= 0) {
    return fallbackSize;
  }
  return {
    width: Math.max(1, Math.round((geometry.overlayWidthPx * previewSize.width) / geometry.baseWidthPx)),
    height: Math.max(1, Math.round((geometry.overlayHeightPx * previewSize.height) / geometry.baseHeightPx))
  };
}

/**
 * 根据方位预设生成归一化拖拽坐标。
 */
function resolvePresetRatios(
  positionValue: WatermarkPosition,
  previewRect: PreviewRect,
  overlayRect: PreviewRect,
  marginPx: number
): { x: number; y: number } {
  const maxX = Math.max(0, previewRect.width - overlayRect.width);
  const maxY = Math.max(0, previewRect.height - overlayRect.height);
  const clampedMarginX = Math.min(marginPx, maxX);
  const clampedMarginY = Math.min(marginPx, maxY);

  let left: number;
  let top: number;
  switch (positionValue) {
    case "topLeft":
      left = clampedMarginX;
      top = clampedMarginY;
      break;
    case "topCenter":
      left = maxX / 2;
      top = clampedMarginY;
      break;
    case "topRight":
      left = maxX - clampedMarginX;
      top = clampedMarginY;
      break;
    case "middleLeft":
      left = clampedMarginX;
      top = maxY / 2;
      break;
    case "center":
      left = maxX / 2;
      top = maxY / 2;
      break;
    case "middleRight":
      left = maxX - clampedMarginX;
      top = maxY / 2;
      break;
    case "bottomLeft":
      left = clampedMarginX;
      top = maxY - clampedMarginY;
      break;
    case "bottomCenter":
      left = maxX / 2;
      top = maxY - clampedMarginY;
      break;
    case "bottomRight":
      left = maxX - clampedMarginX;
      top = maxY - clampedMarginY;
      break;
    default:
      left = maxX / 2;
      top = maxY / 2;
  }

  return {
    x: maxX > 0 ? left / maxX : 0,
    y: maxY > 0 ? top / maxY : 0
  };
}

/**
 * 图片加水印页核心动作：导入、参数校验、串行处理与结果汇总。
 */
export function useImageWatermarkActions() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const taskStore = useTaskStore();
  const { notifyTaskBatchCompleted } = useTaskBatchNotification();

  const items = ref<WatermarkItem[]>([]);
  const isProcessing = ref(false);
  const isDropActive = ref(false);
  const hintMessage = ref("");
  const outputDirectory = ref("");
  const outputMode = ref<WatermarkOutputMode>("source");
  const sourceDirectory = ref("");
  const mode = ref<WatermarkMode>("text");
  const text = ref(DEFAULT_WATERMARK_TEXT);
  const fontSize = ref(DEFAULT_WATERMARK_FONT_SIZE);
  const textColor = ref("#FFFFFF");
  const imagePath = ref("");
  const watermarkImageUrl = ref("");
  const textWatermarkPreviewUrl = ref("");
  const imageScalePercent = ref(15);
  const opacity = ref(80);
  const margin = ref(24);
  const rotation = ref(0);
  const position = ref<WatermarkPosition>("bottomRight");
  const previewImagePath = ref("");
  const previewImageUrl = ref("");
  const previewNaturalSize = ref<PreviewRect>({ width: 1600, height: 1000 });
  const previewGeometry = ref<WatermarkPreviewGeometry | null>(null);
  const previewDragRatio = ref({ x: 0.5, y: 0.5 });
  const dragState = ref<DragState>({
    isActive: false,
    pointerId: null,
    offsetLeft: 0,
    offsetTop: 0
  });
  const resultSummary = ref<WatermarkResultSummary | null>(null);
  const previewCanvasRef = ref<HTMLElement | null>(null);
  /** 预览舞台可用区域（client 尺寸），用于与 `previewRect` 同源缩放，避免 CSS max-* 与计算尺寸不一致 */
  const previewStageSize = ref<PreviewRect>({ width: PREVIEW_BASE.width, height: PREVIEW_BASE.height });
  let previewStageResizeObserver: ResizeObserver | null = null;
  let previewStageResizeRaf = 0;
  let previewStageMeasureTimer: ReturnType<typeof setTimeout> | null = null;
  let disposeDropListener: UnlistenFn | null = null;
  let disposeWatermarkProgressListener: UnlistenFn | null = null;
  let previewRequestId = 0;
  let watermarkPreviewRequestId = 0;
  let watermarkGeometryRequestId = 0;
  let textOverlayPreviewRequestId = 0;
  let textOverlayRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  const visibleItems = computed(() => items.value.slice(0, MAX_VISIBLE_ITEMS));
  const hiddenItemCount = computed(() => Math.max(0, items.value.length - visibleItems.value.length));
  const primaryPreviewItem = computed(() => items.value[0] ?? null);
  const previewRect = computed<PreviewRect>(() => {
    const naturalWidth = previewNaturalSize.value.width || PREVIEW_BASE.width;
    const naturalHeight = previewNaturalSize.value.height || PREVIEW_BASE.height;
    const capW = Math.min(PREVIEW_BASE.width, Math.max(1, previewStageSize.value.width));
    const capH = Math.min(PREVIEW_BASE.height, Math.max(1, previewStageSize.value.height));
    const ratio = Math.min(capW / naturalWidth, capH / naturalHeight);
    return {
      width: Math.max(1, Math.round(naturalWidth * ratio)),
      height: Math.max(1, Math.round(naturalHeight * ratio))
    };
  });
  const previewOverlaySize = computed(() =>
    mapOverlayToPreviewSize(previewGeometry.value, previewRect.value, {
      width: Math.max(72, Math.round((previewRect.value.width * imageScalePercent.value) / 100)),
      height: Math.max(48, Math.round((previewRect.value.height * imageScalePercent.value) / 100))
    })
  );
  const effectiveOutputDirectory = computed(() => {
    if (outputMode.value === "overwrite") return "";
    if (outputMode.value === "custom") return outputDirectory.value.trim();
    if (outputDirectory.value) return outputDirectory.value;
    const previewInputPath = primaryPreviewItem.value?.inputPath;
    if (!previewInputPath) return "";
    const segments = previewInputPath.split(/[/\\]/);
    segments.pop();
    if (segments.length === 0) return "";
    return `${segments.join(WINDOWS_PATH_SEPARATOR)}${WINDOWS_PATH_SEPARATOR}water`;
  });
  const previewStyle = computed(() => {
    const maxX = Math.max(0, previewRect.value.width - previewOverlaySize.value.width);
    const maxY = Math.max(0, previewRect.value.height - previewOverlaySize.value.height);
    const left = Math.min(maxX, Math.max(0, previewDragRatio.value.x * maxX));
    const top = Math.min(maxY, Math.max(0, previewDragRatio.value.y * maxY));
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${previewOverlaySize.value.width}px`,
      height: `${previewOverlaySize.value.height}px`,
      opacity: `${opacity.value / 100}`,
      transform: `rotate(${rotation.value}deg)`,
      color: textColor.value
    };
  });
  const canStart = computed(() => {
    if (isProcessing.value) return false;
    if (outputMode.value === "custom" && outputDirectory.value.trim().length === 0) return false;
    if (sourceDirectory.value.trim().length === 0 && !items.value.some((item) => item.status === "idle" || item.status === "failed")) return false;
    if (mode.value === "text") return true;
    return imagePath.value.trim().length > 0;
  });

  watch(mode, () => {
    requeueCompletedItems("mode");
  });

  watch([text, fontSize, textColor, imagePath, imageScalePercent, opacity, margin, rotation, position], () => {
    requeueCompletedItems("settings");
  });

  watch(
    [previewImagePath, mode, text, fontSize, textColor, imagePath, imageScalePercent, opacity, margin, rotation],
    () => {
      void refreshPreviewGeometry();
      scheduleTextOverlayPreviewRefresh();
    },
    { immediate: true }
  );

  watch(
    () => [previewRect.value.width, previewRect.value.height] as const,
    () => {
      void refreshPreviewGeometry();
      scheduleTextOverlayPreviewRefresh();
    },
    { flush: "post" }
  );

  watch(
    primaryPreviewItem,
    (item) => {
      if (!item) {
        previewImagePath.value = "";
        previewImageUrl.value = "";
        previewGeometry.value = null;
        previewRequestId += 1;
        return;
      }
      previewImagePath.value = item.inputPath;
      void loadPreviewDataUrl(item.inputPath, "main");
    },
    { immediate: true }
  );

  watch(
    imagePath,
    (value) => {
      if (!value) {
        watermarkImageUrl.value = "";
        watermarkPreviewRequestId += 1;
        return;
      }
      void loadPreviewDataUrl(value, "watermark");
    },
    { immediate: true }
  );

  watch(position, (value) => {
    if (value === "custom") {
      return;
    }
    previewDragRatio.value = resolvePresetRatios(value, previewRect.value, previewOverlaySize.value, margin.value);
  }, { immediate: true });

  watch(
    () =>
      [
        previewRect.value.width,
        previewRect.value.height,
        previewOverlaySize.value.width,
        previewOverlaySize.value.height,
        margin.value,
        position.value
      ] as const,
    () => {
      if (position.value === "custom") return;
      previewDragRatio.value = resolvePresetRatios(
        position.value,
        previewRect.value,
        previewOverlaySize.value,
        margin.value
      );
    },
    { flush: "post" }
  );

  /**
   * 打开系统选择器导入待处理图片。
   */
  async function pickImages(): Promise<void> {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp", "bmp"] }]
      });
      if (!selected) return;
      const imagePaths = Array.isArray(selected) ? selected : [selected];
      appendImagePaths(imagePaths);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message ? `选择图片失败：${message}` : "无法打开图片选择器";
    }
  }

  /**
   * 选择来源目录并递归扫描图片。
   */
  async function pickSourceDirectory(): Promise<void> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    sourceDirectory.value = selected;
    hintMessage.value = t("common.sourceDirectoryReady");
  }

  /**
   * 选择统一输出目录。
   */
  async function pickOutputDirectory(): Promise<void> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    outputDirectory.value = selected;
    outputMode.value = "custom";
  }

  /**
   * 打开当前生效的输出目录，便于用户直接查看结果。
   */
  async function openEffectiveOutputDirectory(): Promise<void> {
    if (!effectiveOutputDirectory.value) {
      hintMessage.value = "当前暂无可打开的输出目录";
      return;
    }
    try {
      await tauriClient.openDirectoryInFileManager({ directoryPath: effectiveOutputDirectory.value });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message ? `打开输出目录失败：${message}` : "打开输出目录失败";
    }
  }

  /**
   * 选择图片水印素材。
   */
  async function pickWatermarkImage(): Promise<void> {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Watermark Image", extensions: ["png", "webp", "jpg", "jpeg"] }]
      });
      if (!selected || Array.isArray(selected)) return;
      if (!SUPPORTED_WATERMARK_EXTENSIONS.some((ext) => selected.toLowerCase().endsWith(ext))) {
        hintMessage.value = "水印素材仅支持 PNG/WEBP/JPG/JPEG";
        return;
      }
      imagePath.value = selected;
      hintMessage.value = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message ? `选择水印图片失败：${message}` : "无法打开水印图片选择器";
    }
  }

  /**
   * 浏览器拖拽入口，兼容本地路径导入。
   */
  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    isDropActive.value = false;
    const fileList = event.dataTransfer?.files;
    if (!fileList || fileList.length === 0) return;
    const imagePaths: string[] = [];
    for (const file of Array.from(fileList)) {
      const path = (file as File & { path?: string }).path;
      if (path) imagePaths.push(path);
    }
    if (imagePaths.length === 0) {
      hintMessage.value = "拖拽未获取到有效本地路径，请点击“添加图片”";
      return;
    }
    appendImagePaths(imagePaths);
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    isDropActive.value = true;
  }

  function onDragLeave(): void {
    isDropActive.value = false;
  }

  /**
   * 预览图加载后同步真实宽高，保证拖拽比例更接近最终输出。
   */
  function handlePreviewImageLoad(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target?.naturalWidth || !target.naturalHeight) return;
    const w = target.naturalWidth;
    const h = target.naturalHeight;
    if (previewNaturalSize.value.width === w && previewNaturalSize.value.height === h) {
      return;
    }
    previewNaturalSize.value = { width: w, height: h };
  }

  /**
   * 读取本地图片并转换为稳定的 data URL 预览地址。
   */
  async function loadPreviewDataUrl(path: string, target: "main" | "watermark"): Promise<void> {
    const requestId = target === "main" ? ++previewRequestId : ++watermarkPreviewRequestId;
    try {
      const result = await tauriClient.getImagePreviewDataUrl({ filePath: path });
      const isLatest = target === "main" ? requestId === previewRequestId : requestId === watermarkPreviewRequestId;
      if (!isLatest) return;
      if (target === "main") {
        previewImageUrl.value = result.dataUrl;
        return;
      }
      watermarkImageUrl.value = result.dataUrl;
    } catch {
      const isLatest = target === "main" ? requestId === previewRequestId : requestId === watermarkPreviewRequestId;
      if (!isLatest) return;
      if (target === "main") {
        previewImageUrl.value = "";
        return;
      }
      watermarkImageUrl.value = "";
    }
  }

  /**
   * 将当前预览拖拽比例转换为原图像素坐标，作为导出和几何查询的统一基准。
   */
  function resolveOriginalOffsetPx(): { x: number; y: number } {
    const maxX = Math.max(0, previewRect.value.width - previewOverlaySize.value.width);
    const maxY = Math.max(0, previewRect.value.height - previewOverlaySize.value.height);
    const left = Math.min(maxX, Math.max(0, previewDragRatio.value.x * maxX));
    const top = Math.min(maxY, Math.max(0, previewDragRatio.value.y * maxY));
    const baseWidth = previewNaturalSize.value.width || PREVIEW_BASE.width;
    const baseHeight = previewNaturalSize.value.height || PREVIEW_BASE.height;
    return {
      x: Math.max(0, Math.round((left * baseWidth) / Math.max(1, previewRect.value.width))),
      y: Math.max(0, Math.round((top * baseHeight) / Math.max(1, previewRect.value.height)))
    };
  }

  /**
   * 向后端请求当前参数下的真实水印几何尺寸，保证预览和导出同源。
   */
  async function refreshPreviewGeometry(): Promise<void> {
    if (!previewImagePath.value) {
      previewGeometry.value = null;
      return;
    }
    if (mode.value === "image" && !imagePath.value.trim()) {
      previewGeometry.value = null;
      return;
    }
    const currentRequestId = ++watermarkGeometryRequestId;
    try {
      const offsetPx = resolveOriginalOffsetPx();
      const geometry = await tauriClient.getImageWatermarkPreviewGeometry({
        inputPath: previewImagePath.value,
        mode: mode.value,
        position: position.value,
        opacity: opacity.value,
        margin: margin.value,
        rotation: rotation.value,
        offsetXRatio: previewDragRatio.value.x,
        offsetYRatio: previewDragRatio.value.y,
        offsetXPxOnOriginal: offsetPx.x,
        offsetYPxOnOriginal: offsetPx.y,
        text: mode.value === "text" ? text.value.trim() : undefined,
        fontSize: mode.value === "text" ? fontSize.value : undefined,
        textColor: mode.value === "text" ? textColor.value : undefined,
        imagePath: mode.value === "image" ? imagePath.value.trim() : undefined,
        imageScalePercent: mode.value === "image" ? imageScalePercent.value : undefined
      });
      if (currentRequestId !== watermarkGeometryRequestId) {
        return;
      }
      previewGeometry.value = geometry;
    } catch {
      if (currentRequestId !== watermarkGeometryRequestId) {
        return;
      }
      previewGeometry.value = null;
    }
  }

  /**
   * 构建水印预览参数，确保几何查询和图层预览严格同源。
   */
  function buildOverlayPreviewPayload() {
    const offsetPx = resolveOriginalOffsetPx();
    return {
      inputPath: previewImagePath.value,
      mode: mode.value,
      position: position.value,
      opacity: opacity.value,
      margin: margin.value,
      rotation: rotation.value,
      offsetXRatio: previewDragRatio.value.x,
      offsetYRatio: previewDragRatio.value.y,
      offsetXPxOnOriginal: offsetPx.x,
      offsetYPxOnOriginal: offsetPx.y,
      text: mode.value === "text" ? text.value.trim() : undefined,
      fontSize: mode.value === "text" ? fontSize.value : undefined,
      textColor: mode.value === "text" ? textColor.value : undefined,
      imagePath: mode.value === "image" ? imagePath.value.trim() : undefined,
      imageScalePercent: mode.value === "image" ? imageScalePercent.value : undefined
    };
  }

  /**
   * 通过短防抖限制高频参数变更带来的预览请求，避免拖动时产生请求风暴。
   */
  function scheduleTextOverlayPreviewRefresh(): void {
    if (textOverlayRefreshTimer) {
      clearTimeout(textOverlayRefreshTimer);
      textOverlayRefreshTimer = null;
    }
    textOverlayRefreshTimer = setTimeout(() => {
      void refreshTextOverlayPreview();
    }, 80);
  }

  /**
   * 请求后端同源水印图层预览，保证预览与导出像素级一致。
   */
  async function refreshTextOverlayPreview(): Promise<void> {
    if (!previewImagePath.value || mode.value !== "text" || !text.value.trim()) {
      textWatermarkPreviewUrl.value = "";
      return;
    }
    const currentRequestId = ++textOverlayPreviewRequestId;
    try {
      const result = await tauriClient.getImageWatermarkOverlayPreviewDataUrl(buildOverlayPreviewPayload());
      if (currentRequestId !== textOverlayPreviewRequestId) return;
      textWatermarkPreviewUrl.value = result.dataUrl;
    } catch {
      if (currentRequestId !== textOverlayPreviewRequestId) return;
      textWatermarkPreviewUrl.value = "";
    }
  }

  /**
   * 预览主图加载失败时给出空态，等待用户重新选择。
   */
  function handlePreviewImageError(): void {
    previewImageUrl.value = "";
  }

  /**
   * 水印素材预览加载失败时清空异常地址。
   */
  function handleWatermarkImageError(): void {
    watermarkImageUrl.value = "";
  }

  /**
   * 保存当前预览画布元素，供拖拽时计算实际边界。
   */
  function setPreviewCanvasRef(element: Element | { $el?: Element | null } | null): void {
    const resolvedElement =
      element instanceof HTMLElement ? element : element && typeof element === "object" && "$el" in element ? element.$el : null;
    previewCanvasRef.value = resolvedElement instanceof HTMLElement ? resolvedElement : null;
  }

  function measurePreviewStage(el: HTMLElement): void {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w < 2 || h < 2) return;
    const prev = previewStageSize.value;
    if (prev.width === w && prev.height === h) {
      return;
    }
    previewStageSize.value = { width: w, height: h };
  }

  function scheduleMeasurePreviewStage(el: HTMLElement): void {
    if (previewStageMeasureTimer) {
      clearTimeout(previewStageMeasureTimer);
      previewStageMeasureTimer = null;
    }
    previewStageMeasureTimer = setTimeout(() => {
      previewStageMeasureTimer = null;
      measurePreviewStage(el);
    }, 48);
  }

  /**
   * 绑定预览舞台并监听尺寸，使 `previewRect` 与真实可视区域一致。
   */
  function setPreviewStageRef(element: Element | { $el?: Element | null } | null): void {
    if (previewStageResizeObserver) {
      previewStageResizeObserver.disconnect();
      previewStageResizeObserver = null;
    }
    if (previewStageResizeRaf) {
      cancelAnimationFrame(previewStageResizeRaf);
      previewStageResizeRaf = 0;
    }
    if (previewStageMeasureTimer) {
      clearTimeout(previewStageMeasureTimer);
      previewStageMeasureTimer = null;
    }
    if (!element) {
      return;
    }
    const resolved =
      element instanceof HTMLElement ? element : element && typeof element === "object" && "$el" in element ? element.$el : null;
    if (!(resolved instanceof HTMLElement)) {
      return;
    }
    const el = resolved;
    measurePreviewStage(el);
    previewStageResizeObserver = new ResizeObserver(() => {
      if (previewStageResizeRaf) cancelAnimationFrame(previewStageResizeRaf);
      previewStageResizeRaf = requestAnimationFrame(() => {
        previewStageResizeRaf = 0;
        scheduleMeasurePreviewStage(el);
      });
    });
    previewStageResizeObserver.observe(el);
  }

  /**
   * 在预览画布中直接拖动水印位置。
   */
  function movePreviewWatermark(clientX: number, clientY: number, bounds: DOMRect): void {
    const overlayWidth = previewOverlaySize.value.width;
    const overlayHeight = previewOverlaySize.value.height;
    const maxX = Math.max(0, bounds.width - overlayWidth);
    const maxY = Math.max(0, bounds.height - overlayHeight);
    const left = Math.min(maxX, Math.max(0, clientX - bounds.left - dragState.value.offsetLeft));
    const top = Math.min(maxY, Math.max(0, clientY - bounds.top - dragState.value.offsetTop));
    previewDragRatio.value = {
      x: maxX > 0 ? left / maxX : 0,
      y: maxY > 0 ? top / maxY : 0
    };
    position.value = "custom";
  }

  /**
   * 点击预览空白区时触发图片导入。
   */
  function handlePreviewStagePointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement | null)?.closest(".preview-overlay")) return;
    if (!previewImageUrl.value) {
      void pickImages();
    }
  }

  /**
   * 开始拖拽水印。
   */
  function handleOverlayPointerDown(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    dragState.value = {
      isActive: true,
      pointerId: event.pointerId,
      offsetLeft: event.clientX - rect.left,
      offsetTop: event.clientY - rect.top
    };
    globalThis.addEventListener("pointermove", handleWindowPointerMove);
    globalThis.addEventListener("pointerup", handleWindowPointerUp);
    globalThis.addEventListener("pointercancel", handleWindowPointerUp);
    event.stopPropagation();
    event.preventDefault();
  }

  /**
   * 在全局指针移动时同步拖拽位置，避免元素捕获导致丢事件。
   */
  function handleWindowPointerMove(event: PointerEvent): void {
    if (!dragState.value.isActive) return;
    const bounds = previewCanvasRef.value?.getBoundingClientRect();
    if (!bounds) return;
    movePreviewWatermark(event.clientX, event.clientY, bounds);
  }

  /**
   * 结束拖拽状态。
   */
  function handlePreviewPointerUp(): void {
    dragState.value = {
      isActive: false,
      pointerId: null,
      offsetLeft: 0,
      offsetTop: 0
    };
    globalThis.removeEventListener("pointermove", handleWindowPointerMove);
    globalThis.removeEventListener("pointerup", handleWindowPointerUp);
    globalThis.removeEventListener("pointercancel", handleWindowPointerUp);
  }

  /**
   * 复用给全局事件的拖拽结束处理器。
   */
  function handleWindowPointerUp(): void {
    handlePreviewPointerUp();
  }

  /**
   * 当切换模式或关键参数时，将已完成任务重新置为待处理，便于再次执行。
   */
  function requeueCompletedItems(reason: RequeueReason): void {
    if (isProcessing.value) return;
    let changed = false;
    items.value = items.value.map((item) => {
      if (item.status !== "completed") return item;
      changed = true;
      return {
        ...item,
        status: "idle",
        progress: 0,
        outputPath: undefined,
        outputSize: undefined,
        error: undefined
      };
    });
    if (!changed) return;
    resultSummary.value = null;
    if (reason === "mode") {
      hintMessage.value = "已切换水印模式，可重新执行当前任务";
    }
  }

  /**
   * 监听 Tauri 原生拖拽，保证桌面端获取绝对路径。
   */
  async function setupNativeDropListener(): Promise<void> {
    if (!isTauri()) return;
    const currentWindow = getCurrentWindow();
    disposeDropListener = await currentWindow.onDragDropEvent((event) => {
      if (event.payload.type === "over" || event.payload.type === "enter") {
        isDropActive.value = true;
        return;
      }
      if (event.payload.type === "leave") {
        isDropActive.value = false;
        return;
      }
      if (event.payload.type === "drop") {
        isDropActive.value = false;
        appendImagePaths(event.payload.paths);
      }
    });
  }

  /**
   * 清空待处理列表。
   */
  function clearItems(): void {
    if (isProcessing.value) return;
    items.value = [];
    resultSummary.value = null;
    hintMessage.value = "";
  }

  /**
   * 删除单条任务。
   */
  function removeItem(itemId: string): void {
    if (isProcessing.value) return;
    items.value = items.value.filter((item) => item.id !== itemId);
  }

  /**
   * 串行处理队列，避免批量任务抢占过多内存。
   */
  async function startWatermark(): Promise<void> {
    if (!canStart.value) return;
    if (mode.value === "text" && text.value.trim().length === 0) {
      hintMessage.value = "请输入水印文字后再开始处理";
      globalThis.alert("水印文字不能为空，请先输入内容。");
      return;
    }
    isProcessing.value = true;
    resultSummary.value = null;
    hintMessage.value = "";
    try {
      await ensureSourceDirectoryItemsLoaded();

      const pendingItems = items.value.filter((item) => item.status === "idle" || item.status === "failed");
      if (pendingItems.length === 0) return;

      const startedAt = performance.now();
      let success = 0;
      let failed = 0;

      await ensureProgressListener();

      for (const current of pendingItems) {
        const outcome = await processSingleWatermarkItem(current);
        success += outcome.successCount;
        failed += outcome.failedCount;
      }

      resultSummary.value = {
        total: pendingItems.length,
        success,
        failed,
        elapsedMs: Math.round(performance.now() - startedAt)
      };
      notifyTaskBatchCompleted("pages.imageWatermark.title", resultSummary.value, formatElapsed(resultSummary.value.elapsedMs));
    } finally {
      isProcessing.value = false;
    }
  }

  /**
   * 保证进度监听器只注册一次。
   */
  async function ensureProgressListener(): Promise<void> {
    if (disposeWatermarkProgressListener) return;
    disposeWatermarkProgressListener = await tauriClient.onImageWatermarkProgress((event) => {
      if (!event.taskId) return;
      const progressPatch: Partial<WatermarkItem> = {
        progress: Math.max(0, Math.min(100, Math.round(event.progress)))
      };
      if (event.stage === "failed") {
        progressPatch.status = "failed";
        progressPatch.error = event.message || "处理失败";
      }
      updateItem(event.taskId, progressPatch);
    });
  }

  /**
   * 执行单条图片水印任务，返回统计增量。
   */
  async function processSingleWatermarkItem(current: WatermarkItem): Promise<{ successCount: number; failedCount: number }> {
    const task = taskStore.createTask("image-watermark", "image-watermark");
    updateItem(current.id, { status: "running", progress: 0, error: undefined });
    taskStore.updateTaskProgress(task.id, 1, "图片加水印中");
    try {
      const result = await tauriClient.startImageWatermark(buildWatermarkPayload(current));
      applyResult(current.id, result);
      if (result.success) {
        taskStore.completeTask(task.id, "处理完成");
        try {
          await tauriClient.recordToolUsage({
            toolKey: "image-watermark",
            fileName: current.fileName
          });
        } catch {
          // 统计失败不影响主流程。
        }
        return { successCount: 1, failedCount: 0 };
      }
      taskStore.failTask(task.id, result.error || "处理失败");
      return { successCount: 0, failedCount: 1 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "处理失败";
      updateItem(current.id, { status: "failed", progress: 100, error: message });
      taskStore.failTask(task.id, message);
      return { successCount: 0, failedCount: 1 };
    }
  }

  /**
   * 组装加水印任务参数，确保预览拖拽位置能同步到实际处理。
   */
  function buildWatermarkPayload(current: WatermarkItem) {
    const offsetPx = resolveOriginalOffsetPx();
    return {
      taskId: current.id,
      inputPath: current.inputPath,
      outputMode: outputMode.value === "overwrite" ? ("overwrite" as const) : ("directory" as const),
      outputDirectory: outputMode.value === "custom" ? outputDirectory.value || undefined : undefined,
      mode: mode.value,
      position: position.value,
      opacity: opacity.value,
      margin: margin.value,
      rotation: rotation.value,
      offsetXRatio: previewDragRatio.value.x,
      offsetYRatio: previewDragRatio.value.y,
      offsetXPxOnOriginal: offsetPx.x,
      offsetYPxOnOriginal: offsetPx.y,
      text: mode.value === "text" ? text.value.trim() : undefined,
      fontSize: mode.value === "text" ? fontSize.value : undefined,
      textColor: mode.value === "text" ? textColor.value : undefined,
      imagePath: mode.value === "image" ? imagePath.value.trim() : undefined,
      imageScalePercent: mode.value === "image" ? imageScalePercent.value : undefined
    };
  }

  function applyResult(itemId: string, result: StartImageWatermarkResult): void {
    if (result.success) {
      updateItem(itemId, {
        status: "completed",
        progress: 100,
        outputPath: result.outputPath,
        originalSize: formatSize(result.originalWidth, result.originalHeight),
        outputSize: formatSize(result.outputWidth, result.outputHeight),
        error: undefined
      });
      return;
    }
    updateItem(itemId, {
      status: "failed",
      progress: 100,
      outputPath: undefined,
      originalSize: formatSize(result.originalWidth, result.originalHeight),
      outputSize: formatSize(result.outputWidth, result.outputHeight),
      error: result.error || "处理失败"
    });
  }

  function updateItem(itemId: string, patch: Partial<WatermarkItem>): void {
    items.value = items.value.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
  }

  /**
   * 追加路径并去重，同时过滤非图片扩展。
   */
  function appendImagePaths(filePaths: string[]): void {
    const normalized = filePaths
      .map((path) => path.trim())
      .filter((path) => path.length > 0)
      .filter((path) => SUPPORTED_IMAGE_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext)));
    if (normalized.length === 0) {
      hintMessage.value = "仅支持 PNG/JPG/JPEG/WEBP/BMP 格式";
      return;
    }
    const existing = new Set(items.value.map((item) => item.inputPath.toLowerCase()));
    const unique = normalized.filter((path) => !existing.has(path.toLowerCase()));
    if (unique.length === 0) {
      hintMessage.value = "文件已在任务列表中";
      return;
    }
    const newItems: WatermarkItem[] = unique.map((path) => ({
      id: crypto.randomUUID(),
      fileName: extractFileName(path),
      inputPath: path,
      status: "idle",
      progress: 0
    }));
    items.value = [...items.value, ...newItems];
    hintMessage.value = "";
  }

  /**
   * 开始执行前补扫目录，并将新增图片合并到当前列表。
   */
  async function ensureSourceDirectoryItemsLoaded(): Promise<void> {
    if (!sourceDirectory.value.trim()) return;
    try {
      const result = await importDirectoryItems({
        directoryPath: sourceDirectory.value,
        supportedExtensions: SUPPORTED_IMAGE_EXTENSIONS,
        existingPaths: items.value.map((item) => item.inputPath),
        createItem: createWatermarkItem
      });
      if (result.addedItems.length > 0) {
        items.value = [...items.value, ...result.addedItems];
        hintMessage.value = "";
        return;
      }
      hintMessage.value =
        result.matchedCount === 0 ? t("common.sourceDirectoryNoMatch") : t("common.sourceDirectoryNoNewFiles");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message ? `扫描目录失败：${message}` : "扫描目录失败";
    }
  }

  /**
   * 基于路径创建水印任务项，供目录导入复用。
   */
  function createWatermarkItem(path: string): WatermarkItem {
    return {
      id: crypto.randomUUID(),
      fileName: extractFileName(path),
      inputPath: path,
      status: "idle",
      progress: 0
    };
  }

  onMounted(async () => {
    outputDirectory.value = settingsStore.defaultOutputDirectory || "";
    outputMode.value = outputDirectory.value ? "custom" : "source";
    await setupNativeDropListener();
  });

  onBeforeUnmount(() => {
    if (previewStageResizeObserver) {
      previewStageResizeObserver.disconnect();
      previewStageResizeObserver = null;
    }
    if (previewStageResizeRaf) {
      cancelAnimationFrame(previewStageResizeRaf);
      previewStageResizeRaf = 0;
    }
    if (previewStageMeasureTimer) {
      clearTimeout(previewStageMeasureTimer);
      previewStageMeasureTimer = null;
    }
    if (textOverlayRefreshTimer) {
      clearTimeout(textOverlayRefreshTimer);
      textOverlayRefreshTimer = null;
    }
    if (disposeDropListener) {
      disposeDropListener();
      disposeDropListener = null;
    }
    if (disposeWatermarkProgressListener) {
      disposeWatermarkProgressListener();
      disposeWatermarkProgressListener = null;
    }
    handlePreviewPointerUp();
  });

  return {
    items,
    visibleItems,
    hiddenItemCount,
    isProcessing,
    isDropActive,
    hintMessage,
    outputDirectory,
    outputMode,
    effectiveOutputDirectory,
    sourceDirectory,
    mode,
    text,
    fontSize,
    textColor,
    imagePath,
    watermarkImageUrl,
    textWatermarkPreviewUrl,
    imageScalePercent,
    opacity,
    margin,
    rotation,
    position,
    resultSummary,
    canStart,
    formatElapsed,
    primaryPreviewItem,
    previewImageUrl,
    previewRect,
    previewStyle,
    setPreviewCanvasRef,
    setPreviewStageRef,
    pickImages,
    pickSourceDirectory,
    pickOutputDirectory,
    openEffectiveOutputDirectory,
    pickWatermarkImage,
    handlePreviewImageLoad,
    handlePreviewImageError,
    handleWatermarkImageError,
    handlePreviewStagePointerDown,
    handleOverlayPointerDown,
    handlePreviewPointerUp,
    startWatermark,
    clearItems,
    removeItem,
    handleDrop,
    onDragOver,
    onDragLeave
  };
}
