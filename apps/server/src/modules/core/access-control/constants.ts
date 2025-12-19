/**
 * Access Control 常量定义
 *
 * 统一管理作用域类型和预置角色码
 */

// ========== 作用域类型 ==========

/** 作用域类型枚举 */
export const SCOPE_TYPE = {
  /** 全局作用域 (系统级角色) */
  GLOBAL: 'global',
  /** 组织作用域 */
  ORGANIZATION: 'organization',
  /** 项目作用域 */
  PROJECT: 'project',
} as const;

export type ScopeType = (typeof SCOPE_TYPE)[keyof typeof SCOPE_TYPE];

// ========== 组织角色码 ==========

/** 组织角色码 (对应 roles.code) */
export const ORG_ROLE_CODE = {
  /** 组织所有者 */
  OWNER: 'org:owner',
  /** 组织管理员 */
  ADMIN: 'org:admin',
  /** 组织成员 */
  MEMBER: 'org:member',
} as const;

export type OrgRoleCode =
  (typeof ORG_ROLE_CODE)[keyof typeof ORG_ROLE_CODE];

/** 组织管理员角色码集合 (owner + admin) */
export const ORG_ADMIN_ROLES: readonly OrgRoleCode[] = [
  ORG_ROLE_CODE.OWNER,
  ORG_ROLE_CODE.ADMIN,
] as const;

// ========== 预置角色配置 (用于 seed) ==========

/** 组织角色定义 */
export const ORG_ROLES_SEED = [
  {
    code: ORG_ROLE_CODE.OWNER,
    name: '组织所有者',
    description: '拥有组织的全部权限，包括删除组织',
    level: 100,
    isSystem: true,
  },
  {
    code: ORG_ROLE_CODE.ADMIN,
    name: '组织管理员',
    description: '管理组织成员和项目，无法删除组织',
    level: 80,
    isSystem: true,
  },
  {
    code: ORG_ROLE_CODE.MEMBER,
    name: '组织成员',
    description: '查看和参与项目',
    level: 10,
    isSystem: true,
  },
] as const;
