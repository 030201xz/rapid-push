/**
 * 认证相关 Context 类型
 */

import type { User } from '../../modules/users/schema';
import type { BaseContext } from './base';

// ========== 用户认证信息 ==========

/** 从 User 类型 Pick 关键字段 */
export type AuthUser = Pick<User, 'id' | 'email' | 'role'>;

// ========== 认证后 Context ==========

/** 已认证上下文（ctx.user 存在） */
export interface AuthContext extends BaseContext {
  /** 已认证用户 */
  user: AuthUser;
}

// ========== 管理员 Context ==========

/** 管理员上下文（role 已收窄为 admin） */
export interface AdminContext extends BaseContext {
  /** 管理员用户 */
  user: AuthUser & { role: 'admin' };
}
