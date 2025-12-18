/**
 * 核心分析器
 * 组合文件扫描和解析器，执行完整的 Schema 分析
 *
 * 采用两轮解析策略：
 * 1. 第一轮：扫描所有表，注册到 Store（建立变量名→表名映射）
 * 2. 第二轮：解析字段详情，注册外键引用
 * 3. 解析完成后：解析外键引用，填充实际表名
 */
import ts from "typescript";

import { createLogger } from "@/shared";

import { parseTablesFromSource } from "../parsers";
import type { AnalysisResult, AnalysisSummary, TableInfo } from "../types";
import {
  createAnalysisStore,
  resolveReferences,
  type AnalysisStore,
} from "./analysis-store";
import { readFileContent, scanSchemaPath } from "./file-scanner";

const log = createLogger("analyzer:drizzle-schema");

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 分析错误码
 */
export type AnalysisErrorCode =
  | "PATH_NOT_FOUND"
  | "NO_SCHEMA_FILES"
  | "PARSE_ERROR";

/**
 * 分析错误
 */
export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: AnalysisErrorCode
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

// ============================================================================
// 分析选项
// ============================================================================

/**
 * 分析选项
 */
export interface AnalyzeOptions {
  /** 是否包含空表（无字段定义） */
  includeEmptyTables?: boolean;
}

// ============================================================================
// 核心分析函数
// ============================================================================

/**
 * 创建 TypeScript SourceFile
 */
function createSourceFile(filePath: string, content: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true, // setParentNodes
    ts.ScriptKind.TS
  );
}

/**
 * 解析单个 Schema 文件（带 Store 支持）
 */
async function parseSchemaFile(
  filePath: string,
  store: AnalysisStore
): Promise<TableInfo[]> {
  const content = await readFileContent(filePath);
  const sourceFile = createSourceFile(filePath, content);

  return parseTablesFromSource(sourceFile, filePath, { store });
}

/**
 * 计算分析统计摘要
 */
function calculateSummary(
  tables: TableInfo[],
  filesAnalyzed: number
): AnalysisSummary {
  let totalColumns = 0;
  let totalIndexes = 0;

  for (const table of tables) {
    totalColumns += table.columns.length;
    totalIndexes += table.indexes.length;
  }

  return {
    totalTables: tables.length,
    totalColumns,
    totalIndexes,
    filesAnalyzed,
  };
}

/**
 * 分析 Drizzle Schema
 *
 * 两轮解析策略：
 * 1. 解析所有表，注册到 Store，同时收集外键引用
 * 2. 解析完成后，解析外键引用（将变量名替换为实际表名）
 *
 * @param schemaPath Schema 目录或文件路径
 * @param options 分析选项
 * @returns 分析结果
 * @throws AnalysisError 分析失败时抛出
 */
export async function analyzeDrizzleSchema(
  schemaPath: string,
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  const { includeEmptyTables = false } = options;

  log.info(`开始分析 Drizzle Schema：${schemaPath}`);

  // 创建分析 Store
  const store = createAnalysisStore();

  // 1. 扫描 Schema 文件
  const scanResult = await scanSchemaPath(schemaPath);

  if (scanResult.schemaFiles.length === 0) {
    throw new AnalysisError(
      `未找到 Schema 文件（*.schema.ts）：${schemaPath}`,
      "NO_SCHEMA_FILES"
    );
  }

  log.info(`发现 ${scanResult.schemaFiles.length} 个 Schema 文件`);

  // 2. 解析所有文件（同时注册表和收集外键引用）
  for (const filePath of scanResult.schemaFiles) {
    try {
      const tables = await parseSchemaFile(filePath, store);

      // 将表信息添加到 Store
      for (const table of tables) {
        // 注册表（用于外键引用解析）
        store.registerTable({
          tableName: table.tableName,
          variableName: table.variableName,
          filePath: table.filePath,
          columnNames: table.columns.map((c) => c.columnName),
        });

        // 添加完整表信息
        store.addTableInfo(table);
      }

      log.debug(`解析 ${filePath}：${tables.length} 个表`);
    } catch (error) {
      log.warn(`解析文件失败：${filePath}`, error);
      // 继续处理其他文件
    }
  }

  // 3. 解析外键引用（将变量名替换为实际表名）
  const pendingRefs = store.getPendingReferences();
  if (pendingRefs.length > 0) {
    log.info(`解析 ${pendingRefs.length} 个外键引用`);
    resolveReferences(store);
  }

  // 4. 收集结果
  let allTables = store.getAllTableInfos();

  // 根据选项过滤空表
  if (!includeEmptyTables) {
    allTables = allTables.filter((t) => t.columns.length > 0);
  }

  // 5. 计算统计
  const summary = calculateSummary(allTables, scanResult.schemaFiles.length);

  log.info(
    `分析完成：${summary.totalTables} 表, ${summary.totalColumns} 字段, ${summary.totalIndexes} 索引`
  );

  return {
    schemaPath,
    tables: allTables,
    summary,
  };
}
