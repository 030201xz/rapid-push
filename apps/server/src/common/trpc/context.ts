/**
 * tRPC Context 创建
 * 从 Hono 请求构建 tRPC 上下文
 */

import type { Context as HonoContext } from 'hono';
import type { AuthInfo, BaseContext } from '../../types/index';
import { getDb } from '../database/postgresql/rapid-s';
import { verifyAccessToken } from '../middlewares/auth';

// ========== Context 创建函数 ==========
export function createContext(c: HonoContext): BaseContext {
  return {
    db: getDb(),
    requestId: c.get('requestId') as string | undefined,
    honoContext: c, // 保存 Hono Context 引用
    // 从 Authorization header 解析 JWT，返回完整认证信息（包含黑名单检查）
    getAuth: async (): Promise<AuthInfo | null> => {
      const authHeader = c.req.header('Authorization');
      if (!authHeader?.startsWith('Bearer ')) return null;

      const token = authHeader.slice(7); // 移除 "Bearer " 前缀

      // 使用完整验证（包含黑名单检查）
      const result = await verifyAccessToken(token);

      // 验证失败或缺少必要字段返回 null
      if (
        !result.valid ||
        !result.user ||
        !result.jti ||
        !result.sessionId
      ) {
        return null;
      }

      return {
        user: result.user,
        jti: result.jti,
        sessionId: result.sessionId,
      };
    },
  };
}

// 导出 Context 类型
export type Context = ReturnType<typeof createContext>;
