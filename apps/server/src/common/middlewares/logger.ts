/**
 * 请求日志中间件
 */

import { createMiddleware } from 'hono/factory';
import { apiLogger } from '../logger';
import type { AppEnv } from '../../types';

export const loggerMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const start = performance.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = performance.now() - start;
  const status = c.res.status;

  // 根据状态码选择日志级别
  if (status >= 500) {
    apiLogger.error(`${method} ${path}`, { status, duration: `${duration.toFixed(2)}ms` });
  } else if (status >= 400) {
    apiLogger.warn(`${method} ${path}`, { status, duration: `${duration.toFixed(2)}ms` });
  } else {
    apiLogger.info(`${method} ${path}`, { status, duration: `${duration.toFixed(2)}ms` });
  }
});
