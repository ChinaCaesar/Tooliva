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
  }
];
