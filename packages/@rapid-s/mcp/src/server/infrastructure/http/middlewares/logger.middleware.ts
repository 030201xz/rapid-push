/**
 * 日志中间件
 *
 * 记录请求和响应信息
 */

import type { MiddlewareHandler } from 'hono';
import { appLogger } from '../../logger';

const logger = appLogger.child('HTTP');

/**
 * 请求日志中间件
 *
 * 记录每个请求的基本信息和响应时间
 */
export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const requestId = c.req.header('x-request-id') ?? generateRequestId();

  // 设置响应头
  c.header('x-request-id', requestId);

  // 记录请求开始
  logger.info('请求开始', {
    requestId,
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('user-agent'),
  });

  await next();

  // 记录请求结束
  const duration = Date.now() - start;
  const status = c.res.status;

  const logFn =
    status >= 500 ? logger.error : status >= 400 ? logger.warn : logger.info;
  logFn.call(logger, '请求结束', {
    requestId,
    method: c.req.method,
    path: c.req.path,
    status,
    duration: `${duration}ms`,
  });
};

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
