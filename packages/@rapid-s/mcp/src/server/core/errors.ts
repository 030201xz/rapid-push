/**
 * 应用错误体系
 *
 * 简化的错误处理，只保留实际使用的错误类型
 * GraphQL 不使用 HTTP 状态码，统一通过 errors 字段返回
 */

/** 错误码常量 */
export const ErrorCode = {
  /** 实体未找到 */
  NOT_FOUND: 'NOT_FOUND',
  /** 实体已存在 */
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  /** 未认证 */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** 无权限 */
  FORBIDDEN: 'FORBIDDEN',
  /** 验证失败 */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  /** 内部错误 */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * 应用错误基类
 *
 * 所有业务错误都使用此类，通过 code 区分类型
 */
export class AppError extends Error {
  constructor(
    /** 错误码 */
    public readonly code: ErrorCode,
    /** 错误消息 */
    message: string,
    /** 额外详情（可选） */
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  /** 转换为 GraphQL 错误扩展 */
  toGraphQLExtensions(): Record<string, unknown> {
    return {
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

// ============ 便捷工厂函数 ============

/** 实体未找到错误 */
export function notFound(entity: string, id: string): AppError {
  return new AppError(ErrorCode.NOT_FOUND, `${entity} '${id}' 不存在`, {
    entity,
    id,
  });
}

/** 实体已存在错误 */
export function alreadyExists(entity: string, field: string): AppError {
  return new AppError(
    ErrorCode.ALREADY_EXISTS,
    `${entity} 的 ${field} 已存在`,
    { entity, field },
  );
}

/** 未认证错误 */
export function unauthorized(message = '请先登录'): AppError {
  return new AppError(ErrorCode.UNAUTHORIZED, message);
}

/** 无权限错误 */
export function forbidden(message = '没有权限执行此操作'): AppError {
  return new AppError(ErrorCode.FORBIDDEN, message);
}

/** 验证失败错误 */
export function validationFailed(errors: Record<string, string[]>): AppError {
  return new AppError(ErrorCode.VALIDATION_FAILED, '输入验证失败', {
    validationErrors: errors,
  });
}

/** 内部错误 */
export function internalError(message: string, cause?: Error): AppError {
  const error = new AppError(ErrorCode.INTERNAL_ERROR, message, {
    cause: cause?.message,
  });
  if (cause) {
    error.cause = cause;
  }
  return error;
}
