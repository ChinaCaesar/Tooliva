import type { ToolMeta } from "@/types/tool";

export const videoTools: ToolMeta[] = [
  {
    id: "video-watermark-removal",
    category: "video",
    nameKey: "tools.videoWatermarkRemoval.name",
    descriptionKey: "tools.videoWatermarkRemoval.description",
    tags: ["video", "watermark"],
    routePath: "/video-watermark-removal",
    enabled: true
  }
];
