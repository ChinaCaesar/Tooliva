import type { ToolMeta } from "@/types/tool";

export const imageTools: ToolMeta[] = [
  {
    id: "image-resize",
    category: "image",
    nameKey: "tools.imageResize.name",
    descriptionKey: "tools.imageResize.description",
    tags: ["image", "resize"],
    routePath: "/tools/image-resize",
    enabled: true
  },
  {
    id: "image-upscale",
    category: "image",
    nameKey: "tools.imageUpscale.name",
    descriptionKey: "tools.imageUpscale.description",
    tags: ["image", "upscale"],
    routePath: "/image-upscale",
    enabled: true
  },
  {
    id: "image-watermark-removal",
    category: "image",
    nameKey: "tools.imageWatermarkRemoval.name",
    descriptionKey: "tools.imageWatermarkRemoval.description",
    tags: ["image", "watermark", "inpaint"],
    routePath: "/image-watermark-removal",
    enabled: true
  }
];
