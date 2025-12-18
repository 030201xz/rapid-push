/**
 * 代码格式化工具
 *
 * 使用 Prettier 格式化 TypeScript 代码
 */

import { createLogger } from "@/shared";


const log = createLogger("tool:dto-generator:formatter");

// ============================================================================
// 配置
// ============================================================================

/** Prettier 默认配置 */
const PRETTIER_CONFIG = {
  parser: "typescript",
  semi: true,
  singleQuote: true,
  trailingComma: "es5" as const,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
};

/** 文件扩展名到 Prettier parser 的映射 */
const PARSER_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "babel",
  jsx: "babel",
  json: "json",
  md: "markdown",
};

// ============================================================================
// Prettier 模块缓存
// ============================================================================

/** 缓存 Prettier 模块引用 */
let prettierModule: typeof import("prettier") | null = null;

/**
 * 获取 Prettier 模块（懒加载）
 */
async function getPrettier(): Promise<typeof import("prettier") | null> {
  if (prettierModule) {
    return prettierModule;
  }

  try {
    prettierModule = await import("prettier");
    return prettierModule;
  } catch {
    log.warn("Prettier 不可用，将跳过格式化");
    return null;
  }
}

/**
 * 根据文件扩展名获取 Prettier parser
 */
function getParserByExtension(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return PARSER_MAP[ext] ?? "typescript";
}

// ============================================================================
// 导出函数
// ============================================================================

/**
 * 格式化代码
 *
 * @param content - 原始代码内容
 * @param filePath - 文件路径（用于推断 parser）
 * @returns 格式化后的代码，如果格式化失败则返回原始内容
 */
export async function formatCode(
  content: string,
  filePath: string
): Promise<string> {
  const prettier = await getPrettier();

  if (!prettier) {
    return content;
  }

  try {
    const parser = getParserByExtension(filePath);
    const formatted = await prettier.format(content, {
      ...PRETTIER_CONFIG,
      parser,
    });
    return formatted;
  } catch (error) {
    log.warn(`格式化失败 ${filePath}: ${error}，使用原始内容`);
    return content;
  }
}
