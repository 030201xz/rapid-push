/**
 * 目录扫描器
 *
 * 递归扫描目录结构，发现领域目录和限界上下文
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { BoundedContext, SubdomainInfo } from "../types";
import { DomainAnalysisError } from "./errors";

/**
 * 扫描选项类型
 */
export interface ScanOptions {
  maxDepth: number;
  excludePatterns: string[];
  outputFormat: "full" | "compact";
  includeRelations: boolean;
  includeMethodDetails: boolean;
}

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 发现的领域目录
 */
export interface DiscoveredDomain {
  /** 领域目录路径 */
  path: string;
  /** 所属限界上下文 ID */
  contextId: string;
  /** 所属子域名称 */
  subdomainName: string;
  /** 包含的文件列表（.ts 文件） */
  files: string[];
}

/**
 * 扫描结果
 */
export interface ScanResult {
  /** 发现的限界上下文 */
  contexts: BoundedContext[];
  /** 发现的领域目录 */
  domains: DiscoveredDomain[];
  /** 扫描统计 */
  stats: {
    totalDirs: number;
    totalFiles: number;
    scanDuration: number;
  };
}

/**
 * 目录类型
 */
type DirectoryType =
  | "context" // 限界上下文 (context-*)
  | "subdomain" // 子域
  | "domain" // 领域目录
  | "normal"; // 普通目录

// ============================================================================
// 模式配置
// ============================================================================

/**
 * 目录命名模式配置
 */
const DIRECTORY_PATTERNS = {
  /** 限界上下文目录模式 */
  context: /^context-/,
  /** 领域目录名 */
  domain: ["domain", "domains"],
  /** 忽略的目录名 */
  ignored: [
    "node_modules",
    "dist",
    "build",
    ".git",
    "__test__",
    "__tests__",
    "test",
    "tests",
  ],
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 判断路径是否存在且是目录
 */
function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 读取目录内容
 */
function readDirectory(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath);
  } catch (error) {
    throw DomainAnalysisError.fileReadError(dirPath, error);
  }
}

/**
 * 判断目录类型
 */
function getDirectoryType(dirName: string, parentType: DirectoryType): DirectoryType {
  // 检查是否是限界上下文
  if (DIRECTORY_PATTERNS.context.test(dirName)) {
    return "context";
  }

  // 检查是否是领域目录
  if (DIRECTORY_PATTERNS.domain.includes(dirName)) {
    return "domain";
  }

  // 如果父级是上下文，则当前可能是子域
  if (parentType === "context") {
    return "subdomain";
  }

  return "normal";
}

/**
 * 判断是否应该忽略该目录
 */
function shouldIgnore(name: string, excludePatterns: string[]): boolean {
  // 检查内置忽略列表
  if (DIRECTORY_PATTERNS.ignored.includes(name)) {
    return true;
  }

  // 检查用户配置的排除模式
  for (const pattern of excludePatterns) {
    // 简单的 glob 匹配（支持 * 通配符）
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      if (regex.test(name)) {
        return true;
      }
    } else if (name === pattern) {
      return true;
    }
  }

  return false;
}

/**
 * 收集目录下的 TypeScript 文件
 */
function collectTsFiles(dirPath: string): string[] {
  const files: string[] = [];
  const entries = readDirectory(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);

    try {
      const stat = fs.statSync(fullPath);

      if (stat.isFile() && entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
        // 排除测试文件
        if (!entry.includes(".spec.") && !entry.includes(".test.")) {
          files.push(fullPath);
        }
      } else if (stat.isDirectory()) {
        // 递归子目录（如 value-objects, events 等）
        files.push(...collectTsFiles(fullPath));
      }
    } catch {
      // 忽略无法访问的文件
    }
  }

  return files;
}

/**
 * 生成唯一 ID
 */
function generateId(prefix: string, name: string): string {
  return `${prefix}:${name}`;
}

// ============================================================================
// 扫描器实现
// ============================================================================

/**
 * 扫描器内部状态
 */
interface ScannerState {
  contexts: Map<string, BoundedContext>;
  domains: DiscoveredDomain[];
  totalDirs: number;
  totalFiles: number;
  currentContextId: string | null;
  currentSubdomain: string | null;
}

/**
 * 递归扫描目录
 */
function scanRecursive(
  dirPath: string,
  options: ScanOptions,
  state: ScannerState,
  parentType: DirectoryType,
  depth: number
): void {
  // 检查深度限制
  const maxDepth = options.maxDepth ?? 10;
  if (depth > maxDepth) {
    return;
  }

  const dirName = path.basename(dirPath);
  const excludePatterns = options.excludePatterns ?? [];

  // 检查是否应该忽略
  if (shouldIgnore(dirName, excludePatterns)) {
    return;
  }

  state.totalDirs++;

  // 判断当前目录类型
  const dirType = getDirectoryType(dirName, parentType);

  // 处理限界上下文
  if (dirType === "context") {
    const contextId = generateId("context", dirName);
    const context: BoundedContext = {
      id: contextId,
      name: dirName.replace(/^context-/, ""),
      path: dirPath,
      subdomains: [],
      description: undefined,
    };
    state.contexts.set(contextId, context);
    state.currentContextId = contextId;
  }

  // 处理子域
  if (dirType === "subdomain" && state.currentContextId) {
    state.currentSubdomain = dirName;

    // 检查是否包含 domain 目录
    const domainPath = path.join(dirPath, "domain");
    const hasDomain = isDirectory(domainPath);

    const subdomain: SubdomainInfo = {
      name: dirName,
      path: dirPath,
      hasDomain,
    };

    const context = state.contexts.get(state.currentContextId);
    if (context) {
      context.subdomains.push(subdomain);
    }
  }

  // 处理领域目录
  if (dirType === "domain") {
    const contextId = state.currentContextId ?? generateId("context", "unknown");
    const subdomainName = state.currentSubdomain ?? "unknown";

    // 确保有上下文
    if (!state.contexts.has(contextId)) {
      state.contexts.set(contextId, {
        id: contextId,
        name: "unknown",
        path: path.dirname(path.dirname(dirPath)),
        subdomains: [],
      });
    }

    // 收集领域目录下的所有 TS 文件
    const files = collectTsFiles(dirPath);
    state.totalFiles += files.length;

    state.domains.push({
      path: dirPath,
      contextId,
      subdomainName,
      files,
    });

    // 领域目录不再递归（内部文件已收集）
    return;
  }

  // 递归子目录
  const entries = readDirectory(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);

    if (isDirectory(fullPath)) {
      scanRecursive(
        fullPath,
        options,
        state,
        dirType === "context" ? "context" : dirType,
        depth + 1
      );
    }
  }

  // 退出子域时清理状态
  if (dirType === "subdomain") {
    state.currentSubdomain = null;
  }

  // 退出上下文时清理状态
  if (dirType === "context") {
    state.currentContextId = null;
  }
}

/**
 * 扫描入口路径，发现所有领域目录
 *
 * @param entryPath 入口路径
 * @param options 扫描选项
 * @returns 扫描结果
 */
export function scanDomains(
  entryPath: string,
  options: ScanOptions
): ScanResult {
  const startTime = Date.now();

  // 验证入口路径
  if (!fs.existsSync(entryPath)) {
    throw DomainAnalysisError.pathNotFound(entryPath);
  }

  if (!isDirectory(entryPath)) {
    throw DomainAnalysisError.notADirectory(entryPath);
  }

  // 初始化扫描状态
  const state: ScannerState = {
    contexts: new Map(),
    domains: [],
    totalDirs: 0,
    totalFiles: 0,
    currentContextId: null,
    currentSubdomain: null,
  };

  // 判断入口类型并设置初始状态
  const entryName = path.basename(entryPath);
  const entryType = getDirectoryType(entryName, "normal");

  // 如果入口本身就是 domain 目录
  if (entryType === "domain") {
    const contextId = generateId("context", "inferred");
    state.contexts.set(contextId, {
      id: contextId,
      name: "inferred",
      path: path.dirname(path.dirname(entryPath)),
      subdomains: [
        {
          name: path.basename(path.dirname(entryPath)),
          path: path.dirname(entryPath),
          hasDomain: true,
        },
      ],
    });
    state.currentContextId = contextId;
    state.currentSubdomain = path.basename(path.dirname(entryPath));

    // 直接收集文件
    const files = collectTsFiles(entryPath);
    state.totalFiles = files.length;
    state.totalDirs = 1;

    state.domains.push({
      path: entryPath,
      contextId,
      subdomainName: state.currentSubdomain,
      files,
    });
  } else if (entryType === "context") {
    // 如果入口是限界上下文目录，正常递归
    scanRecursive(entryPath, options, state, "normal", 0);
  } else {
    // 入口是普通目录（如 identity-access），检查是否包含 domain 子目录
    // 先检查是否直接包含 domain 目录或子目录包含 domain
    const hasDomainPattern = containsDomainPattern(entryPath, options.excludePatterns ?? [], 2);
    
    if (hasDomainPattern) {
      // 将入口目录视为一个限界上下文
      const contextId = generateId("context", entryName);
      state.contexts.set(contextId, {
        id: contextId,
        name: entryName,
        path: entryPath,
        subdomains: [],
      });
      state.currentContextId = contextId;
      
      // 递归时将当前视为 context 类型，这样子目录会被识别为 subdomain
      scanRecursive(entryPath, options, state, "context", 0);
    } else {
      // 正常递归扫描
      scanRecursive(entryPath, options, state, "normal", 0);
    }
  }

  // 检查是否发现任何领域
  if (state.domains.length === 0) {
    throw DomainAnalysisError.noDomainFound(entryPath);
  }

  const duration = Date.now() - startTime;

  return {
    contexts: Array.from(state.contexts.values()),
    domains: state.domains,
    stats: {
      totalDirs: state.totalDirs,
      totalFiles: state.totalFiles,
      scanDuration: duration,
    },
  };
}

/**
 * 检查目录是否包含 domain 模式（递归检查指定深度）
 */
function containsDomainPattern(
  dirPath: string,
  excludePatterns: string[],
  maxDepth: number,
  currentDepth = 0
): boolean {
  if (currentDepth > maxDepth) {
    return false;
  }

  try {
    const entries = fs.readdirSync(dirPath);
    
    for (const entry of entries) {
      // 检查是否是 domain 目录
      if (DIRECTORY_PATTERNS.domain.includes(entry)) {
        const fullPath = path.join(dirPath, entry);
        if (isDirectory(fullPath)) {
          return true;
        }
      }
      
      // 递归检查子目录
      if (!shouldIgnore(entry, excludePatterns)) {
        const fullPath = path.join(dirPath, entry);
        if (isDirectory(fullPath)) {
          if (containsDomainPattern(fullPath, excludePatterns, maxDepth, currentDepth + 1)) {
            return true;
          }
        }
      }
    }
  } catch {
    // 忽略无法访问的目录
  }
  
  return false;
}
