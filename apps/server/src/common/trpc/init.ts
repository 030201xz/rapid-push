/**
 * tRPC 初始化
 * 创建 tRPC 实例，配置全局中间件
 */

import { initTRPC } from '@trpc/server';
import type { Context } from './context';
import { trpcLogger } from '../logger';

// ========== tRPC 实例初始化 ==========
export const t = initTRPC.context<Context>().create();

// ========== 全局中间件：请求计时 ==========
export const timingMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = performance.now();
  const result = await next();
  const duration = performance.now() - start;
  trpcLogger.debug(`${type} ${path}`, { duration: `${duration.toFixed(2)}ms` });
  return result;
});
