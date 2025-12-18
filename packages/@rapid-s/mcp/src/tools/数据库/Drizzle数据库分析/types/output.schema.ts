/**
 * Drizzle Schema Analyzer 输出 Schema
 *
 * 支持两种输出格式：
 * - full: 完整输出 (OutputType)
 * - compact: 压缩输出 (CompactOutputType)
 */
import { z } from "zod";

// ============================================================================
// Full 格式 - 子 Schema 定义
// ============================================================================

/** 外键引用信息 Schema */
export const foreignKeyInfoSchema = z.object({
  referencedTable: z.string().describe("Referenced table name (引用的表名)"),
  referencedColumn: z
    .string()
    .describe("Referenced column name (引用的字段名)"),
  onDelete: z.string().optional().describe("On delete action (删除行为)"),
  onUpdate: z.string().optional().describe("On update action (更新行为)"),
});

/** 字段约束 Schema */
export const columnConstraintsSchema = z.object({
  isPrimaryKey: z.boolean().describe("Whether primary key (是否主键)"),
  isNotNull: z.boolean().describe("Whether not null (是否非空)"),
  isUnique: z.boolean().describe("Whether unique (是否唯一)"),
  hasDefault: z.boolean().describe("Whether has default (是否有默认值)"),
  defaultExpression: z
    .string()
    .optional()
    .describe("Default expression (默认值表达式)"),
  references: foreignKeyInfoSchema
    .optional()
    .describe("Foreign key reference (外键引用)"),
});

/** 字段选项 Schema */
export const columnOptionsSchema = z.object({
  length: z.number().optional().describe("String length for varchar (字符串长度)"),
  precision: z.number().optional().describe("Precision for numeric (精度)"),
  scale: z.number().optional().describe("Scale for numeric (小数位数)"),
  enumValues: z
    .array(z.string())
    .optional()
    .describe("Enum values (枚举值列表)"),
});

/** 字段信息 Schema */
export const columnInfoSchema = z.object({
  columnName: z.string().describe("Database column name (数据库字段名)"),
  propertyName: z.string().describe("Code property name (代码属性名)"),
  dataType: z
    .string()
    .describe("Drizzle data type like uuid, varchar (Drizzle 数据类型)"),
  tsType: z.string().describe("Inferred TypeScript type (推断的 TypeScript 类型)"),
  lineNumber: z.number().describe("Line number (行号)"),
  jsDoc: z.string().optional().describe("JSDoc comment (JSDoc 注释)"),
  constraints: columnConstraintsSchema.describe("Constraints (约束信息)"),
  columnOptions: columnOptionsSchema.optional().describe("Column options (字段选项)"),
});

/** 索引信息 Schema */
export const indexInfoSchema = z.object({
  indexName: z.string().optional().describe("Index name (索引名称)"),
  columns: z.array(z.string()).describe("Indexed columns (索引字段)"),
  isUnique: z.boolean().describe("Whether unique index (是否唯一索引)"),
  lineNumber: z.number().describe("Line number (行号)"),
});

/** 类型导出信息 Schema */
export const typeExportInfoSchema = z.object({
  typeName: z.string().describe("Type name like User, NewUser (类型名称)"),
  kind: z
    .enum(["select", "insert"])
    .describe("Export kind: select or insert (导出类别)"),
  lineNumber: z.number().describe("Line number (行号)"),
});

/** 表信息 Schema */
export const tableInfoSchema = z.object({
  tableName: z.string().describe("Database table name (数据库表名)"),
  variableName: z.string().describe("Code variable name (代码变量名)"),
  schemaName: z.string().describe("PostgreSQL schema name (PostgreSQL schema 名)"),
  fileName: z.string().describe("Source file name (来源文件名)"),
  filePath: z.string().describe("Source file path (来源文件路径)"),
  lineNumber: z.number().describe("Definition line number (定义行号)"),
  fileJSDoc: z.string().optional().describe("File-level JSDoc (文件级 JSDoc)"),
  tableJSDoc: z.string().optional().describe("Table-level JSDoc (表级 JSDoc)"),
  columns: z.array(columnInfoSchema).describe("Columns list (字段列表)"),
  indexes: z.array(indexInfoSchema).describe("Indexes list (索引列表)"),
  exportedTypes: z
    .array(typeExportInfoSchema)
    .describe("Exported types (导出的类型)"),
});

/** 分析统计摘要 Schema */
export const analysisSummarySchema = z.object({
  totalTables: z.number().describe("Total tables count (表总数)"),
  totalColumns: z.number().describe("Total columns count (字段总数)"),
  totalIndexes: z.number().describe("Total indexes count (索引总数)"),
  filesAnalyzed: z.number().describe("Files analyzed count (分析的文件数)"),
});

// ============================================================================
// Compact 格式 - 压缩 Schema 定义
// ============================================================================

/**
 * 压缩字段信息 Schema
 *
 * info 格式: "dataType|tsType|lineNumber|constraints"
 * constraints: pk=主键, nn=非空, uq=唯一, def=有默认值
 */
export const compactColumnInfoSchema = z.object({
  col: z.string().describe("Column name (字段名)"),
  info: z.string().describe("Merged info: dataType|tsType|line|flags (合并信息)"),
  doc: z.string().optional().describe("JSDoc comment (注释)"),
  fk: z.string().optional().describe("Foreign key ref: table.col:onDelete:onUpdate (外键)"),
});

/**
 * 压缩表信息 Schema
 */
export const compactTableInfoSchema = z.object({
  table: z.string().describe("Table name (表名)"),
  var: z.string().describe("Variable name (变量名)"),
  file: z.string().describe("File name (文件名)"),
  line: z.number().describe("Line number (行号)"),
  doc: z.string().optional().describe("Brief description (简要描述)"),
  cols: z.array(compactColumnInfoSchema).describe("Columns (字段列表)"),
  idx: z.array(z.string()).optional().describe("Indexes: name(cols):uq (索引)"),
  types: z.array(z.string()).optional().describe("Types: Name:kind (类型导出)"),
});

/**
 * 压缩统计摘要 Schema
 */
export const compactSummarySchema = z.object({
  tables: z.number().describe("Tables count (表数)"),
  cols: z.number().describe("Columns count (字段数)"),
  idx: z.number().describe("Indexes count (索引数)"),
  files: z.number().describe("Files count (文件数)"),
});

// ============================================================================
// 输出 Schema - Full 格式
// ============================================================================

/**
 * Full 格式输出 Schema
 */
export const outputSchema = {
  /** 分析的路径 */
  schemaPath: z.string().describe("Analyzed schema path (分析的路径)"),
  /** 表信息列表 */
  tables: z.array(tableInfoSchema).describe("Table information list (表信息列表)"),
  /** 统计摘要 */
  summary: analysisSummarySchema.describe("Analysis summary (分析统计摘要)"),
};

/**
 * Full 格式输出类型
 */
export type OutputType = z.infer<z.ZodObject<typeof outputSchema>>;

// ============================================================================
// 输出 Schema - Compact 格式
// ============================================================================

/**
 * Compact 格式输出 Schema
 */
export const compactOutputSchema = {
  /** 分析的路径 */
  path: z.string().describe("Analyzed path (分析路径)"),
  /** 压缩统计摘要 */
  sum: compactSummarySchema.describe("Summary (统计摘要)"),
  /** 压缩表信息列表 */
  tables: z.array(compactTableInfoSchema).describe("Tables (表列表)"),
};

/**
 * Compact 格式输出类型
 */
export type CompactOutputType = z.infer<z.ZodObject<typeof compactOutputSchema>>;

// ============================================================================
// 联合输出 Schema 和类型
// ============================================================================

/**
 * 统一输出 Schema
 *
 * 当前仅支持 compact 格式，full 格式暂时禁用
 * TODO: [FULL_FORMAT_DISABLED] 取消以下注释块以启用 full 格式支持
 */

// [FULL_FORMAT_DISABLED] 启用 full 格式时使用以下联合 schema
// export const unifiedOutputSchema = {
//   // ======== Full 格式独有字段 ========
//   schemaPath: z.string().optional().describe("Analyzed schema path - Full format (分析路径 - Full格式)"),
//   summary: analysisSummarySchema.optional().describe("Analysis summary - Full format (统计摘要 - Full格式)"),
//   // ======== Compact 格式独有字段 ========
//   path: z.string().optional().describe("Analyzed path - Compact format (分析路径 - Compact格式)"),
//   sum: compactSummarySchema.optional().describe("Summary - Compact format (统计摘要 - Compact格式)"),
//   // ======== 共用字段（类型不同，使用 union） ========
//   tables: z
//     .union([z.array(tableInfoSchema), z.array(compactTableInfoSchema)])
//     .describe("Table information list (表信息列表)"),
// };
// export type UnifiedOutputType = OutputType | CompactOutputType;

// [FULL_FORMAT_DISABLED] 当前仅使用 compact 格式（注释此块并取消上方注释以启用 full）
export const unifiedOutputSchema = compactOutputSchema;
export type UnifiedOutputType = CompactOutputType;
