import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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

type WatermarkStatus = "idle" | "running" | "completed" | "failed";

const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp"];
const SUPPORTED_WATERMARK_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"];
const SAVED_SECONDS_PER_USAGE = 75;
const MAX_VISIBLE_ITEMS = 200;

interface WatermarkResultSummary {
  total: number;
  success: number;
  failed: number;
  elapsedMs: number;
}

type RequeueReason = "mode" | "settings";

interface TextPreviewAsset {
  dataUrl: string;
  width: number;
  height: number;
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

type GlyphMap = Record<string, readonly string[]>;

const PREVIEW_BASE = {
  width: 920,
  height: 620
} as const;
const CHAR_WIDTH = 5;
const CHAR_HEIGHT = 7;
const CHAR_SPACING = 1;
const LINE_SPACING = 2;
const WINDOWS_PATH_SEPARATOR = "\\";
const GLYPH_MAP: GlyphMap = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00001", "00001", "00001", "00001", "10001", "10001", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  6: ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "00110", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  "\\": ["10000", "01000", "00100", "00010", "00001", "00000", "00000"]
};

/**
 * 根据后端同款点阵字形返回单个字符图案。
 */
function resolveGlyphPattern(char: string): readonly string[] {
  return GLYPH_MAP[char.toUpperCase()] || ["11111", "10001", "00010", "00100", "00100", "00000", "00100"];
}

/**
 * 将文字颜色安全地编码进 SVG data URL。
 */
function encodeSvgColor(color: string): string {
  return color.replace("#", "%23");
}

/**
 * 生成与 Rust 最终导出结果一致的文字水印预览资源。
 */
function createTextPreviewAsset(
  textValue: string,
  fontSizeValue: number,
  textColorValue: string,
  previewRect: PreviewRect
): TextPreviewAsset {
  const safeText = textValue.trim() || "Vibe Coding";
  const scale = Math.max(1, Math.floor(fontSizeValue / CHAR_HEIGHT));
  const lines = safeText.split(/\r?\n/);
  const rawWidth = Math.max(1, Math.max(...lines.map((line) => Array.from(line).length), 1) * (CHAR_WIDTH + CHAR_SPACING) * scale);
  const rawHeight = Math.max(1, lines.length * (CHAR_HEIGHT + LINE_SPACING) * scale);
  const maxOverlayWidth = Math.max(1, Math.floor((previewRect.width * 80) / 100));
  const targetWidth = rawWidth > maxOverlayWidth ? maxOverlayWidth : rawWidth;
  const targetHeight = rawWidth > maxOverlayWidth ? Math.max(1, Math.floor((rawHeight * maxOverlayWidth) / rawWidth)) : rawHeight;
  const resizeRatio = rawWidth > 0 ? targetWidth / rawWidth : 1;
  const rects: string[] = [];

  lines.forEach((line, lineIndex) => {
    const startY = lineIndex * (CHAR_HEIGHT + LINE_SPACING) * scale;
    Array.from(line).forEach((char, charIndex) => {
      const glyph = resolveGlyphPattern(char);
      const startX = charIndex * (CHAR_WIDTH + CHAR_SPACING) * scale;
      glyph.forEach((row, rowIndex) => {
        Array.from(row).forEach((bit, colIndex) => {
          if (bit !== "1") return;
          rects.push(
            `<rect x="${(startX + colIndex * scale) * resizeRatio}" y="${(startY + rowIndex * scale) * resizeRatio}" width="${
              scale * resizeRatio
            }" height="${scale * resizeRatio}" />`
          );
        });
      });
    });
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${targetWidth} ${targetHeight}" width="${targetWidth}" height="${targetHeight}" fill="${encodeSvgColor(
    textColorValue
  )}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
  return {
    dataUrl: `data:image/svg+xml;utf8,${svg}`,
    width: targetWidth,
    height: targetHeight
  };
}

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
 * 根据水印模式生成预览覆盖层的基础尺寸。
 */
function resolvePreviewOverlaySize(
  mode: WatermarkMode,
  textValue: string,
  fontSizeValue: number,
  imageScalePercentValue: number,
  previewRect: PreviewRect
): PreviewRect {
  if (mode === "image") {
    const width = Math.max(72, Math.round((previewRect.width * imageScalePercentValue) / 100));
    const height = Math.max(48, Math.round(width * 0.56));
    return { width, height };
  }
  const safeText = textValue.trim() || "Vibe Coding";
  const scale = Math.max(1, Math.floor(fontSizeValue / CHAR_HEIGHT));
  const lines = safeText.split(/\r?\n/);
  const maxLineChars = Math.max(...lines.map((line) => line.length), 1);
  const rawWidth = Math.max(48, maxLineChars * (CHAR_WIDTH + CHAR_SPACING) * scale);
  const rawHeight = Math.max(24, lines.length * (CHAR_HEIGHT + LINE_SPACING) * scale);
  const maxOverlayWidth = Math.max(1, Math.floor((previewRect.width * 80) / 100));
  const resizeRatio = rawWidth > maxOverlayWidth ? maxOverlayWidth / rawWidth : 1;
  const width = Math.max(1, Math.round(rawWidth * resizeRatio));
  const height = Math.max(1, Math.round(rawHeight * resizeRatio));
  return {
    width,
    height
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
  const left =
    positionValue === "topLeft"
      ? clampedMarginX
      : positionValue === "topRight"
        ? maxX - clampedMarginX
        : positionValue === "center"
          ? maxX / 2
          : positionValue === "bottomLeft"
            ? clampedMarginX
            : positionValue === "bottomRight"
              ? maxX - clampedMarginX
              : maxX / 2;
  const top =
    positionValue === "topLeft"
      ? clampedMarginY
      : positionValue === "topRight"
        ? clampedMarginY
        : positionValue === "center"
          ? maxY / 2
          : positionValue === "bottomLeft"
            ? maxY - clampedMarginY
            : positionValue === "bottomRight"
              ? maxY - clampedMarginY
              : maxY / 2;

  return {
    x: maxX > 0 ? left / maxX : 0,
    y: maxY > 0 ? top / maxY : 0
  };
}

/**
 * 图片加水印页核心动作：导入、参数校验、串行处理与结果汇总。
 */
export function useImageWatermarkActions() {
  const settingsStore = useSettingsStore();
  const taskStore = useTaskStore();

  const items = ref<WatermarkItem[]>([]);
  const isProcessing = ref(false);
  const isDropActive = ref(false);
  const hintMessage = ref("");
  const outputDirectory = ref(settingsStore.defaultOutputDirectory || "");
  const sourceDirectory = ref("");
  const mode = ref<WatermarkMode>("text");
  const text = ref("Vibe Coding");
  const fontSize = ref(24);
  const textColor = ref("#FFFFFF");
  const imagePath = ref("");
  const watermarkImageUrl = ref("");
  const textPreviewAsset = ref<TextPreviewAsset>({
    dataUrl: "",
    width: 120,
    height: 42
  });
  const imageScalePercent = ref(15);
  const opacity = ref(80);
  const margin = ref(24);
  const rotation = ref(0);
  const position = ref<WatermarkPosition>("bottomRight");
  const previewImagePath = ref("");
  const previewImageUrl = ref("");
  const previewNaturalSize = ref<PreviewRect>({ width: 1600, height: 1000 });
  const previewDragRatio = ref({ x: 0.5, y: 0.5 });
  const dragState = ref<DragState>({
    isActive: false,
    pointerId: null,
    offsetLeft: 0,
    offsetTop: 0
  });
  const resultSummary = ref<WatermarkResultSummary | null>(null);
  const previewCanvasRef = ref<HTMLElement | null>(null);
  let disposeDropListener: UnlistenFn | null = null;
  let disposeWatermarkProgressListener: UnlistenFn | null = null;
  let previewRequestId = 0;
  let watermarkPreviewRequestId = 0;

  const visibleItems = computed(() => items.value.slice(0, MAX_VISIBLE_ITEMS));
  const hiddenItemCount = computed(() => Math.max(0, items.value.length - visibleItems.value.length));
  const primaryPreviewItem = computed(() => items.value[0] ?? null);
  const previewRect = computed<PreviewRect>(() => {
    const naturalWidth = previewNaturalSize.value.width || PREVIEW_BASE.width;
    const naturalHeight = previewNaturalSize.value.height || PREVIEW_BASE.height;
    const ratio = Math.min(PREVIEW_BASE.width / naturalWidth, PREVIEW_BASE.height / naturalHeight);
    return {
      width: Math.max(220, Math.round(naturalWidth * ratio)),
      height: Math.max(180, Math.round(naturalHeight * ratio))
    };
  });
  const previewOverlaySize = computed(() =>
    mode.value === "text"
      ? {
          width: textPreviewAsset.value.width,
          height: textPreviewAsset.value.height
        }
      : resolvePreviewOverlaySize(mode.value, text.value, fontSize.value, imageScalePercent.value, previewRect.value)
  );
  const effectiveOutputDirectory = computed(() => {
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
    if (!items.value.some((item) => item.status === "idle" || item.status === "failed")) return false;
    if (mode.value === "text") return text.value.trim().length > 0;
    return imagePath.value.trim().length > 0;
  });

  watch([text, fontSize, textColor, previewRect], ([textValue, fontSizeValue, textColorValue, currentPreviewRect]) => {
    textPreviewAsset.value = createTextPreviewAsset(textValue, fontSizeValue, textColorValue, currentPreviewRect);
  }, { immediate: true });

  watch(mode, () => {
    requeueCompletedItems("mode");
  });

  watch([text, fontSize, textColor, imagePath, imageScalePercent, opacity, margin, rotation, position], () => {
    requeueCompletedItems("settings");
  });

  watch(
    primaryPreviewItem,
    (item) => {
      if (!item) {
        previewImagePath.value = "";
        previewImageUrl.value = "";
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

  watch([previewRect, previewOverlaySize, margin], () => {
    if (position.value === "custom") return;
    previewDragRatio.value = resolvePresetRatios(position.value, previewRect.value, previewOverlaySize.value, margin.value);
  });

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
    try {
      const result = await tauriClient.listImagesFromDirectory({ directoryPath: selected });
      appendImagePaths(result.images);
      hintMessage.value = result.images.length > 0 ? "" : "目录中未找到可处理图片";
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      hintMessage.value = message ? `扫描目录失败：${message}` : "扫描目录失败";
    }
  }

  /**
   * 选择统一输出目录。
   */
  async function pickOutputDirectory(): Promise<void> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    outputDirectory.value = selected;
    settingsStore.setDefaultOutputDirectory(selected);
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
    previewNaturalSize.value = {
      width: target.naturalWidth,
      height: target.naturalHeight
    };
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
    const pendingItems = items.value.filter((item) => item.status === "idle" || item.status === "failed");
    if (pendingItems.length === 0) return;

    isProcessing.value = true;
    resultSummary.value = null;
    hintMessage.value = "";
    const startedAt = performance.now();
    let success = 0;
    let failed = 0;

    await ensureProgressListener();

    for (const current of pendingItems) {
      const outcome = await processSingleWatermarkItem(current);
      success += outcome.successCount;
      failed += outcome.failedCount;
    }

    isProcessing.value = false;
    resultSummary.value = {
      total: pendingItems.length,
      success,
      failed,
      elapsedMs: Math.round(performance.now() - startedAt)
    };
  }

  /**
   * 保证进度监听器只注册一次。
   */
  async function ensureProgressListener(): Promise<void> {
    if (disposeWatermarkProgressListener) return;
    disposeWatermarkProgressListener = await tauriClient.onImageWatermarkProgress((event) => {
      if (!event.taskId) return;
      updateItem(event.taskId, {
        progress: Math.max(0, Math.min(100, Math.round(event.progress))),
        status: event.stage === "failed" ? "failed" : undefined,
        error: event.stage === "failed" ? event.message || "处理失败" : undefined
      });
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
            fileName: current.fileName,
            savedSeconds: SAVED_SECONDS_PER_USAGE
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
    return {
      taskId: current.id,
      inputPath: current.inputPath,
      outputDirectory: outputDirectory.value || undefined,
      mode: mode.value,
      position: position.value,
      opacity: opacity.value,
      margin: margin.value,
      rotation: rotation.value,
      offsetXRatio: previewDragRatio.value.x,
      offsetYRatio: previewDragRatio.value.y,
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

  onMounted(async () => {
    await setupNativeDropListener();
  });

  onBeforeUnmount(() => {
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
    effectiveOutputDirectory,
    sourceDirectory,
    mode,
    text,
    fontSize,
    textColor,
    imagePath,
    watermarkImageUrl,
    textWatermarkPreviewUrl: computed(() => textPreviewAsset.value.dataUrl),
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
