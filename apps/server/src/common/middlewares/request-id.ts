/**
 * 请求 ID 中间件
 *
 * 为每个请求生成唯一 ID，用于日志追踪
 */

import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../../types/index';

export const requestIdMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  await next();
});
