/**
 * tRPC Context 创建
 * 从 Hono 请求构建 tRPC 上下文
 */

import type { Context as HonoContext } from 'hono';
import { db } from '../db';
import { verifyToken } from '../auth';
import type { AuthUser, BaseContext } from '../../types';

// ========== Context 创建函数 ==========
export function createContext(c: HonoContext): BaseContext {
  return {
    db,
    requestId: c.get('requestId') as string | undefined,
    // 从 Authorization header 解析 JWT
    getUser: async (): Promise<AuthUser | null> => {
      const authHeader = c.req.header('Authorization');
      if (!authHeader?.startsWith('Bearer ')) return null;
      
      const token = authHeader.slice(7); // 移除 "Bearer " 前缀
      return verifyToken(token);
    },
  };
}

// 导出 Context 类型
export type Context = ReturnType<typeof createContext>;
