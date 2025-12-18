/**
 * 类型导出入口
 */

// 输入 Schema
export {
  generatorOptionsSchema,
  inputSchema,
  tableMappingSchema,
  type GeneratorOptionsType,
  type InputType,
  type TableMappingType,
} from "./input.schema";

// 输出 Schema
export {
  generatedFileInfoSchema,
  generatedFileStatusSchema,
  generatedFileTypeSchema,
  generationSummarySchema,
  outputSchema,
  type GeneratedFileInfo,
  type GeneratedFileStatus,
  type GeneratedFileType,
  type GenerationSummary,
  type OutputType,
} from "./output.schema";
