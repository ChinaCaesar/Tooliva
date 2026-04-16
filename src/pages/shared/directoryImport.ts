import { tauriClient } from "@/bridge/tauriClient";

/**
 * 目录导入结果，便于页面根据扫描结果给出不同提示。
 */
export interface DirectoryImportResult<Item> {
  scannedCount: number;
  matchedCount: number;
  addedItems: Item[];
}

interface ImportDirectoryItemsOptions<Item> {
  directoryPath: string;
  supportedExtensions: readonly string[];
  existingPaths: readonly string[];
  createItem: (path: string) => Item;
}

/**
 * 扫描目录、按扩展名过滤并去重后返回新增任务项。
 */
export async function importDirectoryItems<Item>(
  options: ImportDirectoryItemsOptions<Item>
): Promise<DirectoryImportResult<Item>> {
  const result = await tauriClient.listImagesFromDirectory({ directoryPath: options.directoryPath });
  const normalizedExtensions = options.supportedExtensions.map((extension) => extension.toLowerCase());
  const existingPathSet = new Set(options.existingPaths.map((path) => path.trim().toLowerCase()));
  const normalizedPaths = result.images.map((path) => path.trim()).filter((path) => path.length > 0);
  const matchedPaths = normalizedPaths.filter((path) =>
    normalizedExtensions.some((extension) => path.toLowerCase().endsWith(extension))
  );
  const uniquePaths = matchedPaths.filter((path) => !existingPathSet.has(path.toLowerCase()));

  return {
    scannedCount: normalizedPaths.length,
    matchedCount: matchedPaths.length,
    addedItems: uniquePaths.map((path) => options.createItem(path))
  };
}
