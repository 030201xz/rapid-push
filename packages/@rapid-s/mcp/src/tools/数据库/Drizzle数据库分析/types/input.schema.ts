/**
 * Drizzle Schema Analyzer 输入 Schema
 *
 * 支持两种输出格式：
 * - full: 完整输出，包含所有字段和详细信息
 * - compact: 压缩输出，优化 token 使用（节省约 80%）
 */
import { z } from "zod";

// ============================================================================
// 输出格式枚举
// ============================================================================

/**
 * 输出格式类型
 * - full: 完整格式，适合导出/存档（暂时禁用）
 * - compact: 压缩格式，适合 AI 交互（节省 token）
 *
 * [FULL_FORMAT_DISABLED] 启用 full 格式时取消注释以下代码：
 * export const OutputFormat = z.enum(["full", "compact"]).default("compact");
 * export type OutputFormatType = z.infer<typeof OutputFormat>;
 */

// ============================================================================
// 表过滤器
// ============================================================================

/**
 * 表过滤配置
 */
export const tableFilterSchema = z
  .object({
    /** 精确表名列表 */
    tables: z.array(z.string()).optional(),
    /** glob 模式匹配，如 "user*" */
    pattern: z.string().optional(),
    /** 子目录过滤，如 "01-core" */
    dir: z.string().optional(),
  })
  .optional();

// ============================================================================
// compact 模式输出控制
// ============================================================================

/**
 * compact 模式下的可选输出控制
 */
export const includeOptionsSchema = z
  .object({
    /** 是否包含索引信息 */
    idx: z.boolean().default(true),
    /** 是否包含导出类型 */
    types: z.boolean().default(true),
    /** 是否包含外键 */
    fk: z.boolean().default(true),
    /** 是否包含 JSDoc */
    doc: z.boolean().default(true),
  })
  .optional();

// ============================================================================
// 输入 Schema
// ============================================================================

/**
 * 输入参数 Schema
 */
export const inputSchema = {
  /** Schema 目录或文件的绝对路径 */
  schemaPath: z
    .string()
    .describe(
      "Absolute path to the Drizzle schema directory or file (Drizzle Schema 目录或文件的绝对路径)"
    ),

  /**
   * [FULL_FORMAT_DISABLED] format 参数已禁用，当前固定使用 compact 格式
   * 启用 full 格式时取消注释以下代码：
   * format: OutputFormat.describe(
   *   "Output format: 'full' for complete output, 'compact' for token-optimized output (default). " +
   *     "(输出格式：full=完整输出，compact=压缩输出节省约80% token，默认 compact)"
   * ),
   */

  /** 表过滤器：按表名、模式或目录过滤 */
  filter: tableFilterSchema.describe(
    "Table filter options: filter by table names, glob pattern, or subdirectory. " +
      "(表过滤器：按表名、glob模式或子目录过滤)"
  ),

  /** compact 模式下的输出控制 */
  include: includeOptionsSchema.describe(
    "Output control for compact mode: toggle indexes, types, foreign keys, JSDoc. " +
      "(compact 模式输出控制：开关索引、类型、外键、JSDoc)"
  ),
};

/**
 * 输入类型
 */
export type InputType = z.infer<z.ZodObject<typeof inputSchema>>;

/**
 * 表过滤类型
 */
export type TableFilterType = z.infer<typeof tableFilterSchema>;

/**
 * 输出控制类型
 */
export type IncludeOptionsType = z.infer<typeof includeOptionsSchema>;
