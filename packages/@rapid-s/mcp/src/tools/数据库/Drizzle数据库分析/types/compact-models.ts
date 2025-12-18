/**
 * Drizzle Schema Analyzer Compact 压缩模型
 *
 * 设计目标：最大化压缩输出，节省 AI 交互的 Token 消耗
 *
 * 压缩策略：
 * 1. 使用常见词作为 key（常见词通常是 1 token）
 * 2. 合并简单字段：使用 | 分隔符合并多个值
 * 3. 只输出 true 的约束：pk, nn, uq, def 标记
 * 4. 移除冗余：省略 columnOptions、完整 filePath
 *
 * Token 优化原则：
 * - 常见单词如 table, file, line 通常是 1 token
 * - 不常见缩写如 tbl, ln 也是 1 token，但可读性差
 * - 优先使用常见词保证可读性
 */

// ============================================================================
// 压缩字段信息
// ============================================================================

/**
 * 压缩字段信息
 *
 * @example
 * ```json
 * {
 *   "col": "id",
 *   "info": "uuid|string|32|pk,nn,def",
 *   "doc": "主键"
 * }
 * ```
 *
 * info 格式: "dataType|tsType|lineNumber|constraints"
 * constraints: pk=主键, nn=非空, uq=唯一, def=有默认值
 */
export interface CompactColumnInfo {
  /** 数据库字段名 (同时也是属性名的 snake_case 形式) */
  col: string;
  /**
   * 合并信息: "dataType|tsType|lineNumber|constraints"
   * constraints 使用逗号分隔: pk, nn, uq, def
   */
  info: string;
  /** JSDoc 注释 (可选) */
  doc?: string;
  /**
   * 外键引用 (可选)
   * 格式: "tableName.columnName:onDelete:onUpdate"
   * 例如: "users.id:cascade:no action"
   */
  fk?: string;
}

// ============================================================================
// 压缩表信息
// ============================================================================

/**
 * 压缩表信息
 *
 * @example
 * ```json
 * {
 *   "table": "users",
 *   "var": "users",
 *   "file": "users.schema.ts",
 *   "line": 28,
 *   "doc": "用户信息表",
 *   "cols": [...],
 *   "idx": ["idx_users_username(username)", "idx_users_email(email):uq"],
 *   "types": ["User:select", "NewUser:insert"]
 * }
 * ```
 */
export interface CompactTableInfo {
  /** 数据库表名 */
  table: string;
  /** 代码变量名 */
  var: string;
  /** 来源文件名 (不含路径) */
  file: string;
  /** 定义行号 */
  line: number;
  /** 简要描述 (JSDoc 首行) */
  doc?: string;
  /** 压缩字段列表 */
  cols: CompactColumnInfo[];
  /**
   * 压缩索引列表 (可选)
   * 格式: "indexName(col1,col2):uq"
   * :uq 表示唯一索引
   */
  idx?: string[];
  /**
   * 压缩类型导出列表 (可选)
   * 格式: "TypeName:kind"
   * kind: select 或 insert
   */
  types?: string[];
}

// ============================================================================
// 压缩分析结果
// ============================================================================

/**
 * 压缩统计摘要
 */
export interface CompactSummary {
  /** 表总数 */
  tables: number;
  /** 字段总数 */
  cols: number;
  /** 索引总数 */
  idx: number;
  /** 文件数 */
  files: number;
}

/**
 * 压缩分析结果
 */
export interface CompactAnalysisResult {
  /** 分析的路径 */
  path: string;
  /** 压缩统计摘要 */
  sum: CompactSummary;
  /** 压缩表信息列表 */
  tables: CompactTableInfo[];
}

// ============================================================================
// 辅助类型
// ============================================================================

/**
 * 约束标记类型
 */
export type ConstraintFlag = "pk" | "nn" | "uq" | "def";

/**
 * 构建约束标记字符串
 */
export function buildConstraintFlags(constraints: {
  isPrimaryKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  hasDefault: boolean;
}): string {
  const flags: ConstraintFlag[] = [];

  if (constraints.isPrimaryKey) flags.push("pk");
  if (constraints.isNotNull) flags.push("nn");
  if (constraints.isUnique) flags.push("uq");
  if (constraints.hasDefault) flags.push("def");

  return flags.join(",");
}

/**
 * 解析约束标记字符串
 */
export function parseConstraintFlags(flagsStr: string): {
  isPrimaryKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  hasDefault: boolean;
} {
  const flags = flagsStr.split(",").filter(Boolean);

  return {
    isPrimaryKey: flags.includes("pk"),
    isNotNull: flags.includes("nn"),
    isUnique: flags.includes("uq"),
    hasDefault: flags.includes("def"),
  };
}
