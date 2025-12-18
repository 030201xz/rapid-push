/**
 * Domain Scaffold Generator - 输出 Schema 定义
 *
 * 定义工具返回的结果结构
 */
import { z } from "zod";

// ============================================================================
// 文件类型枚举
// ============================================================================

/**
 * 生成的文件类型
 */
export const fileTypeSchema = z.enum([
  "aggregate",
  "entity",
  "value-object",
  "state",
  "event",
  "repository",
  "service",
  "exception",
  "index",
]);

export type FileType = z.infer<typeof fileTypeSchema>;

// ============================================================================
// 生成文件信息
// ============================================================================

/**
 * 单个生成文件信息
 */
const generatedFileSchema = z.object({
  /** 文件完整路径 */
  path: z.string().describe("Full file path (文件完整路径)"),
  /** 文件类型 */
  type: fileTypeSchema.describe("File type (文件类型)"),
  /** 是否新创建 */
  created: z.boolean().describe("Whether newly created (是否新创建)"),
});

/**
 * 按聚合分组的文件信息
 */
const aggregateFilesSchema = z.object({
  /** 聚合名称 */
  aggregate: z.string().describe("Aggregate name (聚合名称)"),
  /** 子域名称 */
  subdomain: z.string().describe("Subdomain name (子域名称)"),
  /** 层级名称 */
  layer: z.string().describe("Layer name (层级名称)"),
  /** 生成的文件列表 */
  files: z.array(generatedFileSchema).describe("Generated files (生成的文件列表)"),
});

// ============================================================================
// 统计信息
// ============================================================================

/**
 * 生成统计
 */
const statsSchema = z.object({
  /** 生成文件总数 */
  totalFiles: z.number().describe("Total files generated (生成文件总数)"),
  /** 创建目录总数 */
  totalDirs: z.number().describe("Total directories created (创建目录总数)"),
  /** 处理的聚合数 */
  aggregatesCount: z.number().describe("Aggregates processed (处理的聚合数)"),
  /** 处理的子域数 */
  subdomainsCount: z.number().describe("Subdomains processed (处理的子域数)"),
  /** 跳过的文件数（已存在） */
  skippedFiles: z.number().describe("Skipped files (跳过的文件数)"),
});

// ============================================================================
// 输出 Schema
// ============================================================================

/**
 * 工具输出 Schema
 */
export const outputSchema = {
  /** 生成统计 */
  stats: statsSchema.describe("Generation statistics (生成统计)"),
  /** 按聚合分组的生成文件 */
  generatedFiles: z
    .array(aggregateFilesSchema)
    .describe("Generated files grouped by aggregate (按聚合分组的生成文件)"),
  /** 目录树预览 */
  directoryTree: z
    .string()
    .optional()
    .describe("Directory tree structure preview (目录树预览)"),
};

// ============================================================================
// 类型导出
// ============================================================================

export type OutputType = z.infer<z.ZodObject<typeof outputSchema>>;
export type GeneratedFile = z.infer<typeof generatedFileSchema>;
export type AggregateFiles = z.infer<typeof aggregateFilesSchema>;
export type Stats = z.infer<typeof statsSchema>;
