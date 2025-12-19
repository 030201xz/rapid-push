/**
 * 组织角色配置
 *
 * 与 core/access-control/constants.ts 中的 ORG_ROLES_SEED 保持一致
 */

import type { RoleConfig } from '../types';

/** 组织所有者角色 */
export const orgOwnerRole: RoleConfig = {
  key: 'ORG_OWNER',
  code: 'org:owner',
  name: '组织所有者',
  description: '拥有组织的全部权限，包括删除组织',
  level: 100,
  isSystem: true,
  isActive: true,
  // 组织角色不直接关联系统权限，权限通过 scope 控制
  permissionKeys: [],
};

/** 组织管理员角色 */
export const orgAdminRole: RoleConfig = {
  key: 'ORG_ADMIN',
  code: 'org:admin',
  name: '组织管理员',
  description: '管理组织成员和项目，无法删除组织',
  level: 80,
  isSystem: true,
  isActive: true,
  permissionKeys: [],
};

/** 组织成员角色 */
export const orgMemberRole: RoleConfig = {
  key: 'ORG_MEMBER',
  code: 'org:member',
  name: '组织成员',
  description: '查看和参与项目',
  level: 10,
  isSystem: true,
  isActive: true,
  permissionKeys: [],
};
