/**
 * 普通用户角色配置
 */

import type { RoleConfig } from '../types';

/** 普通用户角色 */
export const userRole: RoleConfig = {
  key: 'USER',
  code: 'user',
  name: '普通用户',
  description: '系统普通用户，拥有基础权限',
  level: 1,
  isSystem: true,
  isActive: true,
  // 普通用户仅有查看权限
  permissionKeys: ['USER_READ', 'ROLE_READ', 'PERMISSION_READ'],
};
