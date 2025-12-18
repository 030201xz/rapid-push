/**
 * Repository Implementation Generator 输入 Schema
 *
 * 定义生成器的输入参数结构
 */
import { z } from "zod";

// ============================================================================
// 表映射配置
// ============================================================================

/**
 * 表映射配置 Schema
 * 用于指定 Drizzle Schema 表变量与导入路径的映射关系
 */
export const tableMappingSchema = z.object({
  /** 表变量名（代码中使用的变量名，如 users） */
  variableName: z
    .string()
    .describe("Table variable name used in code (代码中使用的表变量名)"),
  /** 导入路径（相对于输出目录的路径） */
  importPath: z
    .string()
    .describe("Import path relative to output directory (相对于输出目录的导入路径)"),
});

// ============================================================================
// 生成选项配置
// ============================================================================

/**
 * 生成选项 Schema
 */
export const generatorOptionsSchema = z
  .object({
    /** 是否覆盖已存在的文件，默认 false */
    overwrite: z
      .boolean()
      .default(false)
      .describe("Whether to overwrite existing files (是否覆盖已存在文件)"),
    /** 文件后缀，默认 ".keep" */
    suffix: z
      .string()
      .default(".keep")
      .describe("File suffix for generated files (生成文件后缀)"),
    /** 预览模式，不实际写入文件 */
    dryRun: z
      .boolean()
      .default(false)
      .describe("Preview mode without writing files (预览模式，不写入文件)"),
  })
  .optional();

// ============================================================================
// 输入 Schema
// ============================================================================

/**
 * 输入参数 Schema
 */
export const inputSchema = {
  /** 领域目录路径（含仓储接口） */
  domainPath: z
    .string()
    .describe(
      "Absolute path to the domain directory containing repository interface " +
        "(领域目录的绝对路径，需包含仓储接口)"
    ),

  /** 输出目录路径（生成文件的位置） */
  outputPath: z
    .string()
    .describe(
      "Absolute path to the output directory for generated files " +
        "(输出目录的绝对路径，用于存放生成的文件)"
    ),

  /** 领域层导入路径（可选，用于生成正确的 import 语句） */
  domainImportPath: z
    .string()
    .optional()
    .describe(
      "Import path for domain types, e.g. '../../../domain/aggregates/user'. " +
        "If not provided, will use relative path calculation. " +
        "(领域类型的导入路径，如 '../../../domain/aggregates/user')"
    ),

  /** Drizzle Schema 路径（可选，用于关联表信息） */
  schemaPath: z
    .string()
    .optional()
    .describe(
      "Optional path to Drizzle schema for table context " +
        "(可选的 Drizzle Schema 路径，用于关联表信息)"
    ),

  /** 聚合名称（可选，自动从目录推断） */
  aggregateName: z
    .string()
    .optional()
    .describe(
      "Aggregate name, auto-inferred from directory if not provided " +
        "(聚合名称，不提供时自动从目录推断)"
    ),

  /** 表变量名映射（可选） */
  tableMapping: z
    .array(tableMappingSchema)
    .optional()
    .describe(
      "Table variable to import path mapping " +
        "(表变量名到导入路径的映射)"
    ),

  /** 生成选项 */
  options: generatorOptionsSchema.describe(
    "Generator options (生成选项)"
  ),
};

// ============================================================================
// 类型导出
// ============================================================================

/** 表映射类型 */
export type TableMappingType = z.infer<typeof tableMappingSchema>;

/** 生成选项类型 */
export type GeneratorOptionsType = z.infer<typeof generatorOptionsSchema>;

/** 输入类型 */
export type InputType = z.infer<z.ZodObject<typeof inputSchema>>;
