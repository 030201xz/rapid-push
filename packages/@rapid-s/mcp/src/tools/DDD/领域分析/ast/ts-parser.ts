/**
 * TypeScript AST 解析封装
 *
 * 提供统一的 AST 解析接口，隐藏 ts-morph 细节
 */

import { Project, SourceFile, SyntaxKind } from "ts-morph";
import * as fs from "node:fs";
import * as path from "node:path";
import { DomainAnalysisError } from "../core/errors";

// ============================================================================
// tsconfig 查找与缓存
// ============================================================================

/**
 * 缓存已查找的 tsconfig 路径
 * key: 文件路径, value: tsconfig 路径或 null
 */
const tsconfigCache = new Map<string, string | null>();

/**
 * 向上查找 tsconfig.json
 *
 * @param startPath 起始路径（文件或目录）
 * @returns tsconfig.json 的绝对路径，或 null（未找到）
 */
function findTsConfig(startPath: string): string | null {
  // 先检查缓存
  const cached = tsconfigCache.get(startPath);
  if (cached !== undefined) {
    return cached;
  }

  let currentDir = fs.statSync(startPath).isDirectory()
    ? startPath
    : path.dirname(startPath);

  // 向上查找，最多 20 层
  for (let i = 0; i < 20; i++) {
    const tsconfigPath = path.join(currentDir, "tsconfig.json");
    if (fs.existsSync(tsconfigPath)) {
      tsconfigCache.set(startPath, tsconfigPath);
      return tsconfigPath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // 已到根目录
      break;
    }
    currentDir = parentDir;
  }

  tsconfigCache.set(startPath, null);
  return null;
}

// ============================================================================
// Project 实例管理（按 tsconfig 缓存）
// ============================================================================

/**
 * 缓存不同 tsconfig 对应的 Project 实例
 * key: tsconfig 路径（或 "default" 表示无 tsconfig）
 */
const projectCache = new Map<string, Project>();

/**
 * 获取或创建 Project 实例
 *
 * @param tsconfigPath tsconfig.json 路径，null 表示使用默认配置
 * @returns Project 实例
 */
function getOrCreateProject(tsconfigPath: string | null): Project {
  const cacheKey = tsconfigPath ?? "default";

  let project = projectCache.get(cacheKey);
  if (project) {
    return project;
  }

  // 创建新 Project
  if (tsconfigPath) {
    // 使用 tsconfig 配置，启用类型解析
    project = new Project({
      tsConfigFilePath: tsconfigPath,
      skipAddingFilesFromTsConfig: true, // 不自动加载所有文件，按需加载
    });
  } else {
    // 无 tsconfig，使用基础配置
    project = new Project({
      skipFileDependencyResolution: true,
      skipAddingFilesFromTsConfig: true,
    });
  }

  projectCache.set(cacheKey, project);
  return project;
}

/**
 * 清理所有 Project 实例（用于测试或重置）
 */
export function resetProject(): void {
  projectCache.clear();
  tsconfigCache.clear();
}

// ============================================================================
// 解析接口
// ============================================================================

/**
 * 解析 TypeScript 文件
 *
 * 自动查找并使用对应的 tsconfig.json 以正确解析类型
 *
 * @param filePath 文件绝对路径
 * @returns SourceFile AST
 */
export function parseFile(filePath: string): SourceFile {
  try {
    // 查找对应的 tsconfig.json
    const tsconfigPath = findTsConfig(filePath);
    const project = getOrCreateProject(tsconfigPath);

    // 检查是否已加载
    let sourceFile = project.getSourceFile(filePath);

    if (!sourceFile) {
      // 通过 addSourceFileAtPath 加载，以便正确解析类型
      if (tsconfigPath) {
        sourceFile = project.addSourceFileAtPath(filePath);
      } else {
        // 无 tsconfig，直接读取内容创建
        const content = fs.readFileSync(filePath, "utf-8");
        sourceFile = project.createSourceFile(filePath, content, {
          overwrite: true,
        });
      }
    }

    return sourceFile;
  } catch (error) {
    throw DomainAnalysisError.astParseError(filePath, error);
  }
}

/**
 * 解析代码字符串（用于测试）
 *
 * @param code TypeScript 代码
 * @param fileName 虚拟文件名
 * @returns SourceFile AST
 */
export function parseCode(code: string, fileName = "temp.ts"): SourceFile {
  const project = getOrCreateProject(null);
  return project.createSourceFile(fileName, code, { overwrite: true });
}

// ============================================================================
// JSDoc 工具
// ============================================================================

/**
 * 获取节点的 JSDoc 描述
 */
export function getJsDocDescription(
  node: { getJsDocs?: () => { getDescription: () => string }[] }
): string | undefined {
  if (!node.getJsDocs) {
    return undefined;
  }

  const jsDocs = node.getJsDocs();
  if (jsDocs.length === 0) {
    return undefined;
  }

  const description = jsDocs[0].getDescription().trim();
  return description || undefined;
}

/**
 * 获取 JSDoc 标签值
 */
export function getJsDocTag(
  node: { getJsDocs?: () => { getTags: () => { getTagName: () => string; getCommentText: () => string | undefined }[] }[] },
  tagName: string
): string | undefined {
  if (!node.getJsDocs) {
    return undefined;
  }

  const jsDocs = node.getJsDocs();
  if (jsDocs.length === 0) {
    return undefined;
  }

  const tags = jsDocs[0].getTags();
  const tag = tags.find((t) => t.getTagName() === tagName);

  return tag?.getCommentText()?.trim();
}

// ============================================================================
// 类型工具
// ============================================================================

/**
 * 获取类型的字符串表示
 */
export function getTypeText(
  node: { getType: () => { getText: (...args: unknown[]) => string } },
  simplify = true
): string {
  try {
    let text = node.getType().getText();

    if (simplify) {
      // 简化导入路径
      text = text.replace(/import\([^)]+\)\./g, "");
    }

    return text;
  } catch {
    return "unknown";
  }
}

// ============================================================================
// 导出常用 SyntaxKind
// ============================================================================

export { SyntaxKind };
