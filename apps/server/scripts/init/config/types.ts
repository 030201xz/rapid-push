/**
 * 初始化配置类型定义
 *
 * 完全复用 Drizzle Schema 导出的插入类型，确保类型安全
 * 使用 key 作为配置间引用标识，执行时解析为真实 UUID
 */

import type { NewPermission } from '@/modules/core/access-control/permissions/schema';
import type { NewRole } from '@/modules/core/access-control/roles/schema';
import type { NewUser } from '@/modules/core/identify/users/schema';
import type { PermissionKey, RoleKey, UserKey } from '../0-env';

// ============================================================================
// 权限配置
// ============================================================================

/** 权限配置 - 基于 NewPermission 类型，支持强类型 key */
export interface PermissionConfig
  extends Omit<NewPermission, 'id' | 'createdAt' | 'updatedAt'> {
  /** 配置唯一标识 (强类型 key，对应 PermissionIds) */
  key: PermissionKey;
}

// ============================================================================
// 角色配置
// ============================================================================

/** 角色配置 - 基于 NewRole 类型，支持强类型 key */
export interface RoleConfig
  extends Omit<NewRole, 'id' | 'createdAt' | 'updatedAt'> {
  /** 配置唯一标识 (强类型 key，对应 RoleIds) */
  key: RoleKey;
  /** 关联的权限 keys (强类型引用 PermissionIds) */
  permissionKeys: PermissionKey[];
}

// ============================================================================
// 用户配置
// ============================================================================

/** 用户配置 - 基于 NewUser 类型，使用明文密码，支持强类型 key */
export interface UserConfig
  extends Omit<
    NewUser,
    'id' | 'passwordHash' | 'createdAt' | 'updatedAt'
  > {
  /** 配置唯一标识 (强类型 key，对应 UserIds) */
  key: UserKey;
  /** 明文密码（执行时会自动哈希） */
  plainPassword: string;
  /** 关联的角色 key (强类型引用 RoleIds) */
  roleKey: RoleKey;
}

// ============================================================================
// 全量配置汇总
// ============================================================================

/** 初始化配置汇总 */
export interface InitConfig {
  /** 权限配置列表 */
  permissions: PermissionConfig[];
  /** 角色配置列表 */
  roles: RoleConfig[];
  /** 用户配置列表 */
  users: UserConfig[];
}

// ============================================================================
// ID 映射表类型 (执行时使用)
// ============================================================================

/** ID 映射表 - 将强类型 key 映射到实际生成的 UUID */
export interface IdMaps {
  /** 权限 ID 映射 */
  permissions: Map<PermissionKey, string>;
  /** 角色 ID 映射 */
  roles: Map<RoleKey, string>;
  /** 用户 ID 映射 */
  users: Map<UserKey, string>;
}
