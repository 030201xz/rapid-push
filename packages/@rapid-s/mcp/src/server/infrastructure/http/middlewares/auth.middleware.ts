/**
 * 认证中间件
 *
 * 验证请求的认证信息
 */

import type { MiddlewareHandler } from 'hono';
import { forbidden, unauthorized } from '../../../core/errors';

/** 用户信息 */
export interface AuthUser {
  id: string;
  roles: string[];
}

/** 认证上下文 */
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser | null;
  }
}

/**
 * 认证中间件
 *
 * 从请求头解析认证信息，设置到上下文
 * 如果认证失败，允许请求继续（由各端点自行决定是否要求认证）
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = await parseToken(token);
    c.set('user', user);
  } else {
    c.set('user', null);
  }

  await next();
};

/**
 * 要求认证的中间件
 *
 * 如果用户未认证，抛出 UnauthorizedError
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const user = c.get('user');

  if (!user) {
    throw unauthorized('请先登录');
  }

  await next();
};

/**
 * 要求特定角色的中间件
 *
 * @param roles - 允许的角色列表
 */
export function requireRoles(...roles: string[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      throw unauthorized('请先登录');
    }

    const hasRole = roles.some(role => user.roles.includes(role));
    if (!hasRole) {
      throw forbidden(`需要以下角色之一: ${roles.join(', ')}`);
    }

    await next();
  };
}

/**
 * 解析 Token
 *
 * TODO: 实现实际的 Token 解析逻辑（JWT 等）
 */
async function parseToken(token: string): Promise<AuthUser | null> {
  // 临时实现：直接解析 token 为用户信息
  // 实际项目中应使用 JWT 验证
  try {
    // 示例：假设 token 格式为 base64 编码的 JSON
    const decoded = atob(token);
    const payload = JSON.parse(decoded) as { id?: string; roles?: string[] };

    if (payload.id) {
      return {
        id: payload.id,
        roles: payload.roles ?? [],
      };
    }
  } catch {
    // Token 解析失败，返回 null
  }

  return null;
}
