/**
 * Compact Formatter - 压缩格式转换器
 *
 * 将完整的分析结果转换为压缩格式，节省约 70% Token
 *
 * 压缩策略：
 * 1. 使用常见词作为 key（table, file, line 等常见词通常是 1 token）
 * 2. 合并简单字段：使用 | 分隔符
 * 3. 只输出 true 的约束：pk, nn, uq, def
 * 4. 移除冗余：省略 columnOptions、完整 filePath
 */
import type { IncludeOptionsType } from "../types/input.schema";
import type {
  AnalysisResult,
  ColumnInfo,
  ForeignKeyInfo,
  IndexInfo,
  TableInfo,
  TypeExportInfo,
} from "../types/domain-models";
import type {
  CompactAnalysisResult,
  CompactColumnInfo,
  CompactSummary,
  CompactTableInfo,
} from "../types/compact-models";
import { buildConstraintFlags } from "../types/compact-models";

// ============================================================================
// 默认配置
// ============================================================================

/** 默认输出控制配置 */
const DEFAULT_INCLUDE_OPTIONS: Required<NonNullable<IncludeOptionsType>> = {
  idx: true,
  types: true,
  fk: true,
  doc: true,
};

// ============================================================================
// 字段压缩
// ============================================================================

/**
 * 构建字段 info 字符串
 * 格式: "dataType|tsType|lineNumber|constraints"
 */
function buildColumnInfo(column: ColumnInfo): string {
  const parts = [
    column.dataType,
    column.tsType,
    String(column.lineNumber),
  ];

  // 构建约束标记
  const constraintFlags = buildConstraintFlags(column.constraints);
  if (constraintFlags) {
    parts.push(constraintFlags);
  }

  return parts.join("|");
}

/**
 * 构建外键引用字符串
 * 格式: "tableName.columnName:onDelete:onUpdate"
 */
function buildForeignKeyRef(fk: ForeignKeyInfo): string {
  const parts = [`${fk.referencedTable}.${fk.referencedColumn}`];

  if (fk.onDelete) {
    parts.push(fk.onDelete);
  }
  if (fk.onUpdate) {
    parts.push(fk.onUpdate);
  }

  return parts.join(":");
}

/**
 * 压缩字段信息
 */
function compactColumn(
  column: ColumnInfo,
  options: Required<NonNullable<IncludeOptionsType>>
): CompactColumnInfo {
  const result: CompactColumnInfo = {
    col: column.columnName,
    info: buildColumnInfo(column),
  };

  // JSDoc（如果启用且存在）
  if (options.doc && column.jsDoc) {
    result.doc = column.jsDoc;
  }

  // 外键引用（如果启用且存在）
  if (options.fk && column.constraints.references) {
    result.fk = buildForeignKeyRef(column.constraints.references);
  }

  return result;
}

// ============================================================================
// 索引压缩
// ============================================================================

/**
 * 压缩索引信息为字符串
 * 格式: "indexName(col1,col2):uq"
 */
function compactIndex(index: IndexInfo): string {
  const name = index.indexName ?? "unnamed";
  const cols = index.columns.join(",");
  const suffix = index.isUnique ? ":uq" : "";

  return `${name}(${cols})${suffix}`;
}

// ============================================================================
// 类型导出压缩
// ============================================================================

/**
 * 压缩类型导出信息为字符串
 * 格式: "TypeName:kind"
 */
function compactTypeExport(typeExport: TypeExportInfo): string {
  return `${typeExport.typeName}:${typeExport.kind}`;
}

// ============================================================================
// 表压缩
// ============================================================================

/**
 * 提取简要描述（JSDoc 首行）
 */
function extractBriefDescription(jsDoc?: string): string | undefined {
  if (!jsDoc) return undefined;

  // 取第一行，去除多余空白
  const firstLine = jsDoc.split("\n")[0].trim();

  // 如果太长，截断
  if (firstLine.length > 100) {
    return `${firstLine.slice(0, 97)}...`;
  }

  return firstLine || undefined;
}

/**
 * 压缩表信息
 */
function compactTable(
  table: TableInfo,
  options: Required<NonNullable<IncludeOptionsType>>
): CompactTableInfo {
  const result: CompactTableInfo = {
    table: table.tableName,
    var: table.variableName,
    file: table.fileName,
    line: table.lineNumber,
    cols: table.columns.map((col) => compactColumn(col, options)),
  };

  // 简要描述（如果启用）
  if (options.doc) {
    const doc = extractBriefDescription(table.fileJSDoc ?? table.tableJSDoc);
    if (doc) {
      result.doc = doc;
    }
  }

  // 索引（如果启用且存在）
  if (options.idx && table.indexes.length > 0) {
    result.idx = table.indexes.map(compactIndex);
  }

  // 类型导出（如果启用且存在）
  if (options.types && table.exportedTypes.length > 0) {
    result.types = table.exportedTypes.map(compactTypeExport);
  }

  return result;
}

// ============================================================================
// 主转换函数
// ============================================================================

/**
 * 将完整分析结果转换为压缩格式
 *
 * @param result - 完整分析结果
 * @param includeOptions - 输出控制选项
 * @returns 压缩格式的分析结果
 */
export function toCompactFormat(
  result: AnalysisResult,
  includeOptions?: IncludeOptionsType
): CompactAnalysisResult {
  // 合并配置
  const options: Required<NonNullable<IncludeOptionsType>> = {
    ...DEFAULT_INCLUDE_OPTIONS,
    ...includeOptions,
  };

  // 压缩摘要
  const sum: CompactSummary = {
    tables: result.summary.totalTables,
    cols: result.summary.totalColumns,
    idx: result.summary.totalIndexes,
    files: result.summary.filesAnalyzed,
  };

  // 压缩表列表
  const tables = result.tables.map((table) => compactTable(table, options));

  return {
    path: result.schemaPath,
    sum,
    tables,
  };
}

// ============================================================================
// 导出
// ============================================================================

export { type CompactAnalysisResult, type CompactColumnInfo, type CompactTableInfo };
