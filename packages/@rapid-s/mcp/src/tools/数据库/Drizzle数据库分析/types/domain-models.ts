/**
 * Drizzle Schema Analyzer 领域模型
 * 定义 AST 解析结果的抽象类型
 */

// ============================================================================
// 字段约束
// ============================================================================

/**
 * 外键引用信息
 */
export interface ForeignKeyInfo {
  /** 引用的表名 */
  referencedTable: string;
  /** 引用的字段名 */
  referencedColumn: string;
  /** 删除行为 */
  onDelete?: string;
  /** 更新行为 */
  onUpdate?: string;
}

/**
 * 字段约束
 */
export interface ColumnConstraints {
  /** 是否为主键 */
  isPrimaryKey: boolean;
  /** 是否非空 */
  isNotNull: boolean;
  /** 是否唯一 */
  isUnique: boolean;
  /** 是否有默认值 */
  hasDefault: boolean;
  /** 默认值表达式 */
  defaultExpression?: string;
  /** 外键引用 */
  references?: ForeignKeyInfo;
}

/**
 * 字段选项
 */
export interface ColumnOptions {
  /** 字符串长度 (varchar) */
  length?: number;
  /** 精度 (numeric) */
  precision?: number;
  /** 小数位数 (numeric) */
  scale?: number;
  /** 枚举值列表 */
  enumValues?: string[];
}

// ============================================================================
// 字段信息
// ============================================================================

/**
 * 字段信息
 */
export interface ColumnInfo {
  /** 数据库字段名 */
  columnName: string;
  /** 代码属性名 */
  propertyName: string;
  /** Drizzle 数据类型 (uuid, varchar, integer 等) */
  dataType: string;
  /** 推断的 TypeScript 类型 */
  tsType: string;
  /** 定义行号 */
  lineNumber: number;
  /** JSDoc 注释 */
  jsDoc?: string;
  /** 约束信息 */
  constraints: ColumnConstraints;
  /** 字段选项 */
  columnOptions?: ColumnOptions;
}

// ============================================================================
// 索引信息
// ============================================================================

/**
 * 索引信息
 */
export interface IndexInfo {
  /** 索引名称 */
  indexName?: string;
  /** 索引字段列表 */
  columns: string[];
  /** 是否唯一索引 */
  isUnique: boolean;
  /** 定义行号 */
  lineNumber: number;
}

// ============================================================================
// 类型导出信息
// ============================================================================

/**
 * 类型导出类别
 */
export type TypeExportKind = "select" | "insert";

/**
 * 类型导出信息
 */
export interface TypeExportInfo {
  /** 类型名称 */
  typeName: string;
  /** 导出类别 */
  kind: TypeExportKind;
  /** 定义行号 */
  lineNumber: number;
}

// ============================================================================
// 表信息
// ============================================================================

/**
 * 表信息
 */
export interface TableInfo {
  /** 数据库表名 */
  tableName: string;
  /** 代码变量名 */
  variableName: string;
  /** PostgreSQL schema 名称 */
  schemaName: string;
  /** 来源文件名 */
  fileName: string;
  /** 来源文件路径 */
  filePath: string;
  /** 定义行号 */
  lineNumber: number;
  /** 文件级 JSDoc */
  fileJSDoc?: string;
  /** 表级 JSDoc */
  tableJSDoc?: string;
  /** 字段列表 */
  columns: ColumnInfo[];
  /** 索引列表 */
  indexes: IndexInfo[];
  /** 导出的类型 */
  exportedTypes: TypeExportInfo[];
}

// ============================================================================
// 分析结果
// ============================================================================

/**
 * 分析统计摘要
 */
export interface AnalysisSummary {
  /** 表总数 */
  totalTables: number;
  /** 字段总数 */
  totalColumns: number;
  /** 索引总数 */
  totalIndexes: number;
  /** 分析的文件数 */
  filesAnalyzed: number;
}

/**
 * 完整分析结果
 */
export interface AnalysisResult {
  /** 分析的路径 */
  schemaPath: string;
  /** 表信息列表 */
  tables: TableInfo[];
  /** 统计摘要 */
  summary: AnalysisSummary;
}
