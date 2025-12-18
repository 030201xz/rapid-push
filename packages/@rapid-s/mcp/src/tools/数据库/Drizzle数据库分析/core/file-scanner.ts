/**
 * 文件扫描器
 * 发现和读取 Drizzle Schema 文件
 */
import fs from "node:fs/promises";
import path from "node:path";

// ============================================================================
// 文件系统工具
// ============================================================================

/**
 * 检查路径是否为目录
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * 检查路径是否为文件
 */
export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * 读取文件内容
 */
export async function readFileContent(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}

// ============================================================================
// Schema 文件扫描
// ============================================================================

/**
 * 递归扫描目录中的所有 .schema.ts 文件
 */
export async function scanSchemaFiles(dirPath: string): Promise<string[]> {
  const schemaFiles: string[] = [];

  async function scanRecursive(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // 递归扫描子目录
        await scanRecursive(fullPath);
      } else if (entry.isFile()) {
        // 匹配 *.schema.ts 文件
        if (entry.name.endsWith(".schema.ts")) {
          schemaFiles.push(fullPath);
        }
      }
    }
  }

  await scanRecursive(dirPath);

  // 按路径排序，保证稳定顺序
  return schemaFiles.sort();
}

/**
 * 扫描结果
 */
export interface ScanResult {
  /** Schema 文件列表 */
  schemaFiles: string[];
  /** 是否为单文件模式 */
  isSingleFile: boolean;
}

/**
 * 智能扫描 Schema 路径
 * 支持单文件和目录两种模式
 */
export async function scanSchemaPath(schemaPath: string): Promise<ScanResult> {
  if (await isFile(schemaPath)) {
    // 单文件模式
    return {
      schemaFiles: [schemaPath],
      isSingleFile: true,
    };
  }

  if (await isDirectory(schemaPath)) {
    // 目录模式：递归扫描
    const schemaFiles = await scanSchemaFiles(schemaPath);
    return {
      schemaFiles,
      isSingleFile: false,
    };
  }

  // 路径不存在
  return {
    schemaFiles: [],
    isSingleFile: false,
  };
}
