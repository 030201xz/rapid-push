/**
 * ⚠️ 此文件由启动时自动生成，请勿手动修改！
 */

/** 所有工具名称常量 */
export const TOOL_NAMES = {
  /** Domain Structure Analyzer (领域结构分析器) */
  DDD_DOMAIN_ANALYZER: "ddd_domain_analyzer",
  /** Domain Scaffold Generator (领域层脚手架生成器) */
  DDD_DOMAIN_SCAFFOLD_GENERATOR: "ddd_domain_scaffold_generator",
  /** DDD Use-Case Generator (DDD 用例代码生成器) */
  DDD_USE_CASE_GENERATOR: "ddd_use_case_generator",
  /** High-Precision Addition */
  DECIMAL_ADD: "decimal_add",
  /** High-Precision Number Comparison */
  DECIMAL_COMPARE: "decimal_compare",
  /** High-Precision Division */
  DECIMAL_DIVIDE: "decimal_divide",
  /** High-Precision Expression Evaluator */
  DECIMAL_EVAL: "decimal_eval",
  /** High-Precision Multiplication */
  DECIMAL_MULTIPLY: "decimal_multiply",
  /** High-Precision Subtraction */
  DECIMAL_SUBTRACT: "decimal_subtract",
  /** Drizzle Schema Analyzer (Drizzle 数据库 Schema 分析器) */
  DRIZZLE_SCHEMA_ANALYZER: "drizzle_schema_analyzer",
  /** 忽略示例工具 */
  IGNORE_DEMO_TOOL: "ignore_demo_tool",
  /** Repository Implementation Generator (仓储实现生成器) */
  REPOSITORY_IMPLEMENTATION_GENERATOR: "repository_implementation_generator",
} as const;

/** 工具名称类型（用于类型安全的配置） */
export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

/** 所有工具名称数组 */
export const ALL_TOOL_NAMES = Object.values(TOOL_NAMES) as ToolName[];
