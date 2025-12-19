/**
 * 认证相关 Context 类型
 *
 * 设计说明:
 * - AuthUser 直接从 User 类型 Pick，确保类型安全
 * - 角色信息从 Role 类型推断，通过 user_role_mappings 表查询后附加
 */

import type { Role } from '../../modules/core/access-control/roles/schema';
import type { User } from '../../modules/core/identify/users/schema';
import type { BaseContext } from './base';

// ========== 认证用户字段选择 ==========

/** AuthUser 需要的字段（从 User 表 Pick） */
type AuthUserFields = Pick<
  User,
  | 'id'
  | 'username'
  | 'nickname'
  | 'email'
  | 'phone'
  | 'avatarUrl'
  | 'status'
>;

/** 认证用户信息（User 字段 + 角色列表） */
export type AuthUser = AuthUserFields & {
  /** 用户关联的角色 code 列表（通过 user_role_mappings 查询） */
  roles: Role['code'][];
};

// ========== 认证后 Context ==========

/** 已认证上下文（ctx.user 存在，并包含 jti/sessionId） */
export interface AuthContext extends BaseContext {
  /** 当前认证用户 */
  user: AuthUser;
  /** 当前 JWT ID（用于黑名单管理） */
  jti: string;
  /** 当前会话 ID */
  sessionId: string;
}

// ========== 管理员 Context ==========

/** 管理员上下文（roles 包含 admin） */
export interface AdminContext extends BaseContext {
  user: AuthUser & { roles: ['admin', ...Role['code'][]] };
  jti: string;
  sessionId: string;
}
