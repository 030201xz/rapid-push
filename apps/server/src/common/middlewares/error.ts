/**
 * 全局错误处理中间件
 */

import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../../types/index';
import { apiLogger } from '../logger';

export const errorHandler = createMiddleware<AppEnv>(
  async (c, next) => {
    try {
      await next();
    } catch (error) {
      apiLogger.error('请求处理失败', { error: String(error) });
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  }
);
