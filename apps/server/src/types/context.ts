/**
 * Context 类型层级定义
 * - BaseContext: 基础上下文，所有请求共享
 * - AuthContext: 认证后上下文，ctx.user 已确认存在
 * - AdminContext: 管理员上下文，ctx.user.role 已确认为 admin
 */

import type { Database } from '../common/db';
import type { User } from '../modules/users/schema';

// ========== 用户认证信息（从 User 类型 Pick 关键字段） ==========
export type AuthUser = Pick<User, 'id' | 'email' | 'role'>;

// ========== 基础 Context（所有请求共享） ==========
export interface BaseContext {
  /** Drizzle 数据库实例 */
  db: Database;
  /** 请求追踪 ID */
  requestId?: string;
  /** 获取当前认证用户（可能为 null） */
  getUser: () => Promise<AuthUser | null>;
}

// ========== 认证后 Context ==========
export interface AuthContext extends BaseContext {
  /** 已认证用户（类型收窄后确定存在） */
  user: AuthUser;
}

// ========== 管理员 Context ==========
export interface AdminContext extends BaseContext {
  /** 管理员用户（role 已收窄为 admin） */
  user: AuthUser & { role: 'admin' };
}

// ========== Hono 应用环境类型 ==========
export interface AppEnv {
  Variables: {
    requestId: string;
  };
}
