import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { env } from '../env';
import { apiLogger } from '../logger';

// ========== CORS 配置 ==========
export const corsMiddleware = cors({
  origin: env.nodeEnv === 'production'
    ? ['https://your-domain.com']
    : '*',
  credentials: true,
});

// ========== 请求日志（使用 @rapid-s/logger） ==========
export const loggerMiddleware = createMiddleware(async (c, next) => {
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

// ========== 全局错误处理 ==========
export const errorHandler = createMiddleware(async (c, next) => {
  try {
    await next();
  } catch (error) {
    apiLogger.error('请求处理失败', { error: String(error) });
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// ========== 请求 ID（用于追踪） ==========
export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  await next();
});
