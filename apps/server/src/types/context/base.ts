/**
 * 基础 Context 类型
 *
 * 所有请求共享的上下文
 */

import type { Context as HonoContext } from 'hono';
import type { RapidSDatabase } from '../../common/database/postgresql/rapid-s';

/** 认证信息（用户 + JWT 元数据） */
export interface AuthInfo {
  /** 用户信息 */
  user: AuthUser;
  /** JWT ID（用于黑名单管理） */
  jti: string;
  /** 会话 ID（关联登录会话） */
  sessionId: string;
}

/** 基础 Context（所有请求共享） */
export interface BaseContext {
  /** Drizzle 数据库实例 */
  db: RapidSDatabase;
  /** 请求追踪 ID */
  requestId?: string;
  /** Hono Context（用于访问原始请求/响应对象） */
  honoContext: HonoContext;
  /** 获取当前认证信息（包含用户、jti、sessionId，可能为 null） */
  getAuth: () => Promise<AuthInfo | null>;
}

// 前置声明，避免循环依赖
import type { AuthUser } from './auth';
