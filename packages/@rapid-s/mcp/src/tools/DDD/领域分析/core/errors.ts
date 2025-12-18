/**
 * 领域分析错误定义
 */

/**
 * 错误码枚举
 */
export enum DomainAnalysisErrorCode {
  /** 路径不存在 */
  PATH_NOT_FOUND = "PATH_NOT_FOUND",
  /** 路径不是目录 */
  NOT_A_DIRECTORY = "NOT_A_DIRECTORY",
  /** 无法读取文件 */
  FILE_READ_ERROR = "FILE_READ_ERROR",
  /** AST 解析失败 */
  AST_PARSE_ERROR = "AST_PARSE_ERROR",
  /** 未找到领域目录 */
  NO_DOMAIN_FOUND = "NO_DOMAIN_FOUND",
  /** 扫描深度超限 */
  MAX_DEPTH_EXCEEDED = "MAX_DEPTH_EXCEEDED",
  /** 未知错误 */
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * 领域分析错误
 */
export class DomainAnalysisError extends Error {
  constructor(
    public readonly code: DomainAnalysisErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "DomainAnalysisError";
  }

  /**
   * 创建路径不存在错误
   */
  static pathNotFound(path: string): DomainAnalysisError {
    return new DomainAnalysisError(
      DomainAnalysisErrorCode.PATH_NOT_FOUND,
      `路径不存在: ${path}`
    );
  }

  /**
   * 创建非目录错误
   */
  static notADirectory(path: string): DomainAnalysisError {
    return new DomainAnalysisError(
      DomainAnalysisErrorCode.NOT_A_DIRECTORY,
      `路径不是目录: ${path}`
    );
  }

  /**
   * 创建文件读取错误
   */
  static fileReadError(path: string, cause: unknown): DomainAnalysisError {
    return new DomainAnalysisError(
      DomainAnalysisErrorCode.FILE_READ_ERROR,
      `无法读取文件: ${path}`,
      cause
    );
  }

  /**
   * 创建 AST 解析错误
   */
  static astParseError(path: string, cause: unknown): DomainAnalysisError {
    return new DomainAnalysisError(
      DomainAnalysisErrorCode.AST_PARSE_ERROR,
      `AST 解析失败: ${path}`,
      cause
    );
  }

  /**
   * 创建未找到领域目录错误
   */
  static noDomainFound(path: string): DomainAnalysisError {
    return new DomainAnalysisError(
      DomainAnalysisErrorCode.NO_DOMAIN_FOUND,
      `未在路径下发现任何领域目录: ${path}`
    );
  }

  /**
   * 创建深度超限错误
   */
  static maxDepthExceeded(maxDepth: number): DomainAnalysisError {
    return new DomainAnalysisError(
      DomainAnalysisErrorCode.MAX_DEPTH_EXCEEDED,
      `扫描深度超过限制: ${maxDepth}`
    );
  }
}
