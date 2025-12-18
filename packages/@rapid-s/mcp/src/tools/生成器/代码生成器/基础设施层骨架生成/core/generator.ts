/**
 * 核心生成器
 *
 * 编排分析器和模板渲染器，生成仓储实现骨架代码
 */
import * as fs from "node:fs";
import * as path from "node:path";

import {
  renderBarrelTemplate,
  renderMapperTemplate,
  renderMutationTemplate,
  renderQueryTemplate,
  renderRepositoryTemplate,
} from "../templates";
import type {
  GeneratedFileInfo,
  GeneratorOptionsType,
  OutputType,
  TableMappingType,
} from "../types";
import { GeneratorError } from "./errors";
import { type FileToWrite, type WriteOptions, writeFiles } from "./file-writer";
import { createLogger } from "@/shared";

const log = createLogger("generator:repository-implementation");

// ============================================================================
// 生成器上下文
// ============================================================================

/**
 * 方法信息（从领域分析器获取）
 */
export interface MethodInfo {
  /** 方法名 */
  methodName: string;
  /** 操作名（kebab-case） */
  operationName: string;
  /** 描述 */
  description?: string;
  /** 参数列表 */
  parameters: Array<{
    name: string;
    type: string;
    isOptional: boolean;
  }>;
  /** 返回类型 */
  returnType: string;
  /** 是否异步 */
  isAsync: boolean;
}

/**
 * 生成器上下文
 */
export interface GeneratorContext {
  /** 聚合名称（PascalCase） */
  aggregateName: string;
  /** 聚合名称（kebab-case） */
  aggregateKebab: string;
  /** 聚合名称（camelCase） */
  aggregateCamel: string;
  /** Mutation 方法列表 */
  mutations: MethodInfo[];
  /** Query 方法列表 */
  queries: MethodInfo[];
  /** 表映射 */
  tableMapping: TableMappingType[];
  /** 领域层相对路径 */
  domainRelativePath: string;
  /** 输出目录 */
  outputPath: string;
}

// ============================================================================
// 命名工具
// ============================================================================

/**
 * PascalCase 转 kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * PascalCase 转 camelCase
 */
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * 从目录路径推断聚合名称
 */
function inferAggregateName(domainPath: string): string {
  // 获取目录名
  const dirName = path.basename(domainPath);

  // 转换为 PascalCase
  return dirName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * 从仓储接口文件路径推断聚合名称
 */
function inferAggregateNameFromFile(filePath: string): string {
  const fileName = path.basename(filePath);
  // user.repository.interface.ts -> User
  // IUserRepository.ts -> User
  let name = fileName
    .replace(".repository.interface.ts", "")
    .replace("Repository.ts", "")
    .replace(/^I/, "");

  // 转换为 PascalCase
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

// ============================================================================
// 仓储接口解析
// ============================================================================

/**
 * 递归查找仓储接口文件
 *
 * @param dirPath 要搜索的目录
 * @returns 找到的所有仓储接口文件路径
 */
function findRepositoryInterfacesRecursive(dirPath: string): string[] {
  const results: string[] = [];

  function scanDir(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // 跳过 node_modules 和隐藏目录
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          scanDir(fullPath);
        }
      } else if (entry.isFile()) {
        // 匹配仓储接口文件
        if (
          entry.name.endsWith(".repository.interface.ts") ||
          (entry.name.startsWith("I") && entry.name.endsWith("Repository.ts"))
        ) {
          results.push(fullPath);
        }
      }
    }
  }

  scanDir(dirPath);
  return results;
}

/**
 * 查找仓储接口文件（支持递归）
 *
 * @param domainPath 领域目录路径
 * @returns 找到的仓储接口文件列表，每个包含文件路径和推断的聚合名
 */
function findRepositoryInterfaces(domainPath: string): Array<{
  filePath: string;
  aggregateName: string;
  aggregateDir: string;
}> {
  const files = findRepositoryInterfacesRecursive(domainPath);

  return files.map((filePath) => ({
    filePath,
    aggregateName: inferAggregateNameFromFile(filePath),
    aggregateDir: path.dirname(filePath),
  }));
}

/**
 * 查找单个仓储接口文件（向后兼容）
 */
function findRepositoryInterface(domainPath: string): string | null {
  // 先尝试直接在目录中查找
  try {
    const files = fs.readdirSync(domainPath);
    const repoFile = files.find(
      (f) =>
        f.endsWith(".repository.interface.ts") ||
        (f.startsWith("I") && f.endsWith("Repository.ts"))
    );

    if (repoFile) {
      return path.join(domainPath, repoFile);
    }
  } catch {
    // 目录读取失败，继续尝试递归
  }

  // 递归查找
  const found = findRepositoryInterfacesRecursive(domainPath);
  return found.length > 0 ? found[0] : null;
}

/**
 * 简单解析仓储接口方法
 * 使用正则表达式快速提取方法签名
 */
function parseRepositoryMethods(filePath: string): {
  mutations: MethodInfo[];
  queries: MethodInfo[];
} {
  const content = fs.readFileSync(filePath, "utf-8");
  const mutations: MethodInfo[] = [];
  const queries: MethodInfo[] = [];

  // 匹配接口方法签名的正则
  // 格式: methodName(params): ReturnType;
  const methodRegex =
    /\/\*\*\s*([\s\S]*?)\*\/\s*(\w+)\s*\(([^)]*)\)\s*:\s*([^;]+);/g;

  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const [, jsDoc, methodName, paramsStr, returnType] = match;

    // 解析描述
    const descMatch = jsDoc?.match(/@description\s+(.+)|^\s*\*\s+([^@\n]+)/m);
    const description = descMatch
      ? (descMatch[1] || descMatch[2])?.trim()
      : undefined;

    // 解析参数
    const parameters = parseParameters(paramsStr);

    // 判断是否异步
    const isAsync = returnType.trim().startsWith("Promise");

    // 生成操作名
    const operationName = toKebabCase(methodName);

    const methodInfo: MethodInfo = {
      methodName,
      operationName,
      description,
      parameters,
      returnType: returnType.trim(),
      isAsync,
    };

    // 分类：Mutation vs Query
    if (isMutationMethod(methodName)) {
      mutations.push(methodInfo);
    } else {
      queries.push(methodInfo);
    }
  }

  return { mutations, queries };
}

/**
 * 解析参数字符串
 */
function parseParameters(
  paramsStr: string
): Array<{ name: string; type: string; isOptional: boolean }> {
  if (!paramsStr.trim()) return [];

  const params: Array<{ name: string; type: string; isOptional: boolean }> = [];
  const paramParts = paramsStr.split(",").map((p) => p.trim());

  for (const part of paramParts) {
    if (!part) continue;

    // 格式: name: Type 或 name?: Type
    const paramMatch = part.match(/(\w+)(\?)?\s*:\s*(.+)/);
    if (paramMatch) {
      params.push({
        name: paramMatch[1],
        type: paramMatch[3].trim(),
        isOptional: !!paramMatch[2],
      });
    }
  }

  return params;
}

/**
 * 判断是否为 Mutation 方法
 */
function isMutationMethod(methodName: string): boolean {
  const mutationPrefixes = [
    "save",
    "create",
    "insert",
    "upsert",
    "update",
    "patch",
    "modify",
    "delete",
    "remove",
    "softDelete",
  ];

  const lowerName = methodName.toLowerCase();
  return mutationPrefixes.some((prefix) => lowerName.startsWith(prefix));
}

// ============================================================================
// 核心生成器
// ============================================================================

/**
 * 生成仓储实现骨架
 */
export async function generateRepositoryImplementation(
  domainPath: string,
  outputPath: string,
  options?: {
    schemaPath?: string;
    aggregateName?: string;
    domainImportPath?: string;
    tableMapping?: TableMappingType[];
    options?: GeneratorOptionsType;
  }
): Promise<OutputType> {
  log.info(`开始生成仓储实现: ${domainPath} → ${outputPath}`);

  // 1. 验证领域目录
  if (!fs.existsSync(domainPath)) {
    throw new GeneratorError(
      `领域目录不存在: ${domainPath}`,
      "DOMAIN_PATH_NOT_FOUND"
    );
  }

  // 2. 递归查找所有仓储接口
  const repoInterfaces = findRepositoryInterfaces(domainPath);
  if (repoInterfaces.length === 0) {
    throw new GeneratorError(
      `在领域目录及其子目录中未找到仓储接口文件 (*.repository.interface.ts): ${domainPath}`,
      "REPOSITORY_INTERFACE_NOT_FOUND"
    );
  }

  log.info(`找到 ${repoInterfaces.length} 个仓储接口`);

  // 3. 为每个仓储接口生成实现
  const allGeneratedFiles: GeneratedFileInfo[] = [];
  let totalMutations = 0;
  let totalQueries = 0;

  for (const repoInfo of repoInterfaces) {
    log.debug(`处理仓储接口: ${repoInfo.filePath}`);

    // 解析仓储方法
    const { mutations, queries } = parseRepositoryMethods(repoInfo.filePath);
    log.info(
      `  [${repoInfo.aggregateName}] ${mutations.length} Mutations, ${queries.length} Queries`
    );

    totalMutations += mutations.length;
    totalQueries += queries.length;

    // 确定聚合名称（优先用户提供，其次从文件推断）
    const aggregateName = options?.aggregateName || repoInfo.aggregateName;

    // 确定输出目录（如果有多个仓储，按聚合名分目录）
    const aggregateOutputPath =
      repoInterfaces.length > 1
        ? path.join(outputPath, `${toKebabCase(aggregateName)}-repository`)
        : outputPath;

    // 确定领域导入路径
    // 优先使用用户提供的路径，否则自动计算相对路径
    const domainRelativePath =
      options?.domainImportPath ||
      computeRelativePath(aggregateOutputPath, repoInfo.aggregateDir);

    // 构建生成上下文
    const context: GeneratorContext = {
      aggregateName,
      aggregateKebab: toKebabCase(aggregateName),
      aggregateCamel: toCamelCase(aggregateName),
      mutations,
      queries,
      tableMapping: options?.tableMapping || [],
      domainRelativePath,
      outputPath: aggregateOutputPath,
    };

    // 生成文件
    const filesToWrite = generateFiles(context);

    // 写入文件
    const writeOptions: Partial<WriteOptions> = {
      overwrite: options?.options?.overwrite ?? false,
      suffix: options?.options?.suffix ?? ".keep",
      dryRun: options?.options?.dryRun ?? false,
    };

    const generatedFiles = writeFiles(aggregateOutputPath, filesToWrite, writeOptions);
    allGeneratedFiles.push(...generatedFiles);
  }

  // 4. 统计
  const summary = {
    mutations: totalMutations,
    queries: totalQueries,
    totalFiles: allGeneratedFiles.length,
    skipped: allGeneratedFiles.filter((f) => f.status === "skipped").length,
  };

  // 返回第一个聚合的名称（向后兼容）
  const primaryAggregateName =
    options?.aggregateName || repoInterfaces[0].aggregateName;

  return {
    aggregateName: primaryAggregateName,
    outputPath,
    generatedFiles: allGeneratedFiles,
    summary,
  };
}

/**
 * 计算相对路径
 */
function computeRelativePath(from: string, to: string): string {
  const relative = path.relative(from, to);
  // 确保以 ./ 或 ../ 开头
  if (!relative.startsWith(".")) {
    return "./" + relative;
  }
  return relative;
}

/**
 * 生成所有文件
 */
function generateFiles(context: GeneratorContext): FileToWrite[] {
  const files: FileToWrite[] = [];

  // 1. 生成 Mutation 文件
  for (const mutation of context.mutations) {
    files.push({
      relativePath: `mutations/${mutation.operationName}.mutation.ts`,
      content: renderMutationTemplate(mutation, context),
      type: "mutation",
      methodName: mutation.methodName,
    });
  }

  // 2. 生成 mutations/index.ts
  if (context.mutations.length > 0) {
    files.push({
      relativePath: "mutations/index.ts",
      content: renderBarrelTemplate(context.mutations, "mutation"),
      type: "barrel",
    });
  }

  // 3. 生成 Query 文件
  for (const query of context.queries) {
    files.push({
      relativePath: `queries/${query.operationName}.query.ts`,
      content: renderQueryTemplate(query, context),
      type: "query",
      methodName: query.methodName,
    });
  }

  // 4. 生成 queries/index.ts
  if (context.queries.length > 0) {
    files.push({
      relativePath: "queries/index.ts",
      content: renderBarrelTemplate(context.queries, "query"),
      type: "barrel",
    });
  }

  // 5. 生成 Mapper 文件
  files.push({
    relativePath: `${context.aggregateKebab}.mapper.ts`,
    content: renderMapperTemplate(context),
    type: "mapper",
  });

  // 6. 生成 Repository 实现文件
  files.push({
    relativePath: `${context.aggregateKebab}.repository.ts`,
    content: renderRepositoryTemplate(context),
    type: "repository",
  });

  // 7. 生成根 index.ts
  files.push({
    relativePath: "index.ts",
    content: renderRootBarrel(context),
    type: "barrel",
  });

  return files;
}

/**
 * 渲染根 Barrel 导出
 */
function renderRootBarrel(context: GeneratorContext): string {
  const lines: string[] = [
    "/**",
    ` * ${context.aggregateName} Repository 实现`,
    " *",
    " * @generated by repository-implementation-generator",
    " */",
    "",
  ];

  if (context.mutations.length > 0) {
    lines.push(`export * from "./mutations";`);
  }

  if (context.queries.length > 0) {
    lines.push(`export * from "./queries";`);
  }

  lines.push(`export { ${context.aggregateName}Mapper } from "./${context.aggregateKebab}.mapper";`);
  lines.push(`export { ${context.aggregateName}Repository } from "./${context.aggregateKebab}.repository";`);
  lines.push("");

  return lines.join("\n");
}

/**
 * 计算统计摘要
 */
function computeSummary(files: GeneratedFileInfo[]): OutputType["summary"] {
  return {
    mutations: files.filter((f) => f.type === "mutation").length,
    queries: files.filter((f) => f.type === "query").length,
    totalFiles: files.length,
    skipped: files.filter((f) => f.status === "skipped").length,
  };
}
