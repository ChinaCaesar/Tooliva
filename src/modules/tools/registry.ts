import type { ToolMeta } from "@/types/tool";
import { imageTools } from "@/modules/image-tools";
import { videoTools } from "@/modules/video-tools";
import { docTools } from "@/modules/doc-tools";
import { ocrTools } from "@/modules/ocr-tools";

const toolRegistry: ToolMeta[] = [...imageTools, ...videoTools, ...docTools, ...ocrTools];

/**
 * 统一工具注册中心，后续新增工具时仅需扩展各模块并合并到此处。
 */
export function getRegisteredTools(): ToolMeta[] {
  return toolRegistry;
}
