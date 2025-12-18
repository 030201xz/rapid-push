/**
 * 生成器错误类型
 */

/**
 * 生成器错误码
 */
export type GeneratorErrorCode =
  | "DOMAIN_PATH_NOT_FOUND"
  | "REPOSITORY_INTERFACE_NOT_FOUND"
  | "OUTPUT_PATH_NOT_WRITABLE"
  | "ANALYSIS_FAILED"
  | "TEMPLATE_RENDER_ERROR"
  | "FILE_WRITE_ERROR";

/**
 * 生成器错误
 */
export class GeneratorError extends Error {
  constructor(
    message: string,
    public readonly code: GeneratorErrorCode
  ) {
    super(message);
    this.name = "GeneratorError";
  }
}
