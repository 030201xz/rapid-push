import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createMiddleware } from 'hono/factory';
import { env } from '../env';

// ========== CORS 配置 ==========
export const corsMiddleware = cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://your-domain.com']
    : '*',
  credentials: true,
});

// ========== 请求日志 ==========
export const loggerMiddleware = logger();

// ========== 全局错误处理 ==========
export const errorHandler = createMiddleware(async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error('[Error]', error);
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
