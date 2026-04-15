export type ToolCategory = "image" | "video" | "document" | "ocr";

export interface ToolMeta {
  id: string;
  category: ToolCategory;
  nameKey: string;
  descriptionKey: string;
  tags: string[];
  routePath: string;
  enabled: boolean;
}
