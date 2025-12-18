/**
 * Repository Implementation Generator 输出 Schema
 *
 * 定义生成器的输出结果结构
 */
import { z } from "zod";

// ============================================================================
// 生成文件信息 Schema
// ============================================================================

/**
 * 生成文件类型枚举
 */
export const generatedFileTypeSchema = z.enum([
  "mutation",
  "query",
  "mapper",
  "repository",
  "barrel",
  "module",
]);

/**
 * 生成文件状态枚举
 */
export const generatedFileStatusSchema = z.enum([
  "created",
  "skipped",
  "overwritten",
]);

/**
 * 生成的文件信息 Schema
 */
export const generatedFileInfoSchema = z.object({
  /** 文件路径 */
  filePath: z.string().describe("Generated file path (生成的文件路径)"),
  /** 文件类型 */
  type: generatedFileTypeSchema.describe("File type (文件类型)"),
  /** 生成状态 */
  status: generatedFileStatusSchema.describe("Generation status (生成状态)"),
  /** 关联的方法名（Mutation/Query） */
  methodName: z
    .string()
    .optional()
    .describe("Associated method name (关联的方法名)"),
});

// ============================================================================
// 生成统计摘要 Schema
// ============================================================================

/**
 * 生成统计摘要 Schema
 */
export const generationSummarySchema = z.object({
  /** Mutation 文件数 */
  mutations: z.number().describe("Number of mutation files (Mutation 文件数)"),
  /** Query 文件数 */
  queries: z.number().describe("Number of query files (Query 文件数)"),
  /** 总文件数 */
  totalFiles: z.number().describe("Total files generated (总生成文件数)"),
  /** 跳过的文件数 */
  skipped: z.number().describe("Number of skipped files (跳过的文件数)"),
});

// ============================================================================
// 输出 Schema
// ============================================================================

/**
 * 输出参数 Schema
 */
export const outputSchema = {
  /** 聚合名称 */
  aggregateName: z.string().describe("Aggregate name (聚合名称)"),
  /** 输出目录 */
  outputPath: z.string().describe("Output directory path (输出目录路径)"),
  /** 生成的文件列表 */
  generatedFiles: z
    .array(generatedFileInfoSchema)
    .describe("List of generated files (生成的文件列表)"),
  /** 生成统计摘要 */
  summary: generationSummarySchema.describe("Generation summary (生成统计摘要)"),
};

// ============================================================================
// 类型导出
// ============================================================================

/** 生成文件类型 */
export type GeneratedFileType = z.infer<typeof generatedFileTypeSchema>;

/** 生成文件状态 */
export type GeneratedFileStatus = z.infer<typeof generatedFileStatusSchema>;

/** 生成的文件信息 */
export type GeneratedFileInfo = z.infer<typeof generatedFileInfoSchema>;

/** 生成统计摘要 */
export type GenerationSummary = z.infer<typeof generationSummarySchema>;

/** 输出类型 */
export type OutputType = z.infer<z.ZodObject<typeof outputSchema>>;
