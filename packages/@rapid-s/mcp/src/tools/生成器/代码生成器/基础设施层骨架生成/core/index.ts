/**
 * 核心模块导出入口
 */

export {
  GeneratorError,
  type GeneratorErrorCode,
} from "./errors";

export {
  DEFAULT_WRITE_OPTIONS,
  isWritable,
  writeFile,
  writeFiles,
  type FileToWrite,
  type WriteOptions,
} from "./file-writer";

export {
  generateRepositoryImplementation,
  type GeneratorContext,
  type MethodInfo,
} from "./generator";
