/**
 * 核心模块导出入口
 */

export {
  AnalysisError,
  analyzeDrizzleSchema,
  type AnalysisErrorCode,
  type AnalyzeOptions,
} from "./analyzer";
export {
  createAnalysisStore,
  getGlobalStore,
  resetGlobalStore,
  resolveReferences,
  type AnalysisState,
  type AnalysisStore,
  type PendingReference,
  type TableRegistry,
} from "./analysis-store";
export {
  isDirectory,
  isFile,
  readFileContent,
  scanSchemaFiles,
  scanSchemaPath,
  type ScanResult,
} from "./file-scanner";
export { toCompactFormat } from "./compact-formatter";
