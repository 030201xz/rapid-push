/**
 * Use-Case Generator - 输出 Schema 定义
 *
 * 定义工具返回的输出结构
 */
import { z } from "zod";

// ============================================================================
// 输出 Schema
// ============================================================================

/**
 * 生成的文件信息
 */
export const generatedFileSchema = z.object({
  /** 文件绝对路径 */
  path: z.string().describe("Absolute file path (文件绝对路径)"),
  /** 文件类型 */
  type: z
    .enum(["input-schema", "output-schema", "command", "query", "handler", "index"])
    .describe("File type (文件类型)"),
});

/**
 * 工具输出参数 Schema
 */
export const outputSchema = {
  /** 生成的文件列表 */
  generated: z
    .array(generatedFileSchema)
    .describe("List of generated files (生成的文件列表)"),
  /** 汇总信息（Markdown 格式） */
  summary: z
    .string()
    .describe("Summary in Markdown format (Markdown 格式的汇总)"),
};

// ============================================================================
// 类型导出
// ============================================================================

export type GeneratedFile = z.infer<typeof generatedFileSchema>;
export type FileType = GeneratedFile["type"];
export type OutputType = z.infer<z.ZodObject<typeof outputSchema>>;
