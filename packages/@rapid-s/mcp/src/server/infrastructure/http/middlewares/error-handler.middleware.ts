/**
 * 错误处理中间件
 *
 * 统一处理未捕获的异常
 */

import type { MiddlewareHandler } from 'hono';
import { AppError, ErrorCode, internalError } from '../../../core/errors';
import { appLogger } from '../../logger';

const logger = appLogger.child('ErrorHandler');

/**
 * 错误处理中间件
 *
 * 捕获所有未处理的异常，返回标准化的错误响应
 */
export const errorHandlerMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (error) {
    // 转换为 AppError
    const appError = normalizeError(error);

    // 记录错误日志
    logger.error('请求处理失败', {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    });

    // 构建响应（HTTP 端点使用，GraphQL 有自己的错误处理）
    const statusCode = getHttpStatus(appError.code);
    const response = {
      error: {
        code: appError.code,
        message: appError.message,
        ...(process.env.NODE_ENV === 'development' &&
          appError.details && {
            details: appError.details,
          }),
      },
    };

    return c.json(response, statusCode as 400);
  }
};

/**
 * 将任意错误转换为 AppError
 */
function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return internalError(error.message, error);
  }

  return internalError('Unknown error occurred');
}

/**
 * 根据错误码获取 HTTP 状态码
 */
function getHttpStatus(code: string): number {
  switch (code) {
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.VALIDATION_FAILED:
    case ErrorCode.ALREADY_EXISTS:
      return 400;
    default:
      return 500;
  }
}
