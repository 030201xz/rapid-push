/**
 * 输入 Schema 定义
 */
import { z } from "zod";

/**
 * 分析选项 Schema
 */
export const analysisOptionsSchema = z
  .object({
    /** 递归深度限制 */
    maxDepth: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .default(10)
      .describe("递归扫描最大深度，默认 10"),

    /** 排除的目录/文件模式 */
    excludePatterns: z
      .array(z.string())
      .optional()
      .default(["node_modules", "dist", "__test__", "*.spec.ts", "*.test.ts"])
      .describe("排除的 glob 模式列表"),

    /** 输出格式 */
    outputFormat: z
      .enum(["full", "compact"])
      .optional()
      .default("full")
      .describe("输出格式：full 完整输出，compact 压缩输出"),

    /** 是否包含关系图 */
    includeRelations: z
      .boolean()
      .optional()
      .default(true)
      .describe("是否输出领域元素间的关系"),

    /** 是否包含方法详情 */
    includeMethodDetails: z
      .boolean()
      .optional()
      .default(true)
      .describe("是否输出方法的详细信息（参数、返回值等）"),
  })
  .optional();

/**
 * 输入 Schema（对象形式，供 BaseTool 使用）
 */
export const inputSchema = {
  /** 分析入口路径 */
  entryPath: z
    .string()
    .min(1)
    .describe(
      "分析入口路径（绝对路径），支持：限界上下文目录、子域目录、domain 目录。" +
        "工具会自动递归发现所有领域模块进行分析。"
    ),

  /** 分析选项 */
  options: analysisOptionsSchema,
};

/**
 * 输入类型
 */
export type InputType = z.infer<z.ZodObject<typeof inputSchema>>;

/**
 * 分析选项类型
 */
export type AnalysisOptions = z.infer<typeof analysisOptionsSchema>;
