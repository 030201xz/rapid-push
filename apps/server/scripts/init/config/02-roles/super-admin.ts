/**
 * 超级管理员角色配置
 */

import type { RoleConfig } from '../types';

/** 超级管理员角色 */
export const superAdminRole: RoleConfig = {
  key: 'SUPER_ADMIN',
  code: 'super_admin',
  name: '超级管理员',
  description: '系统超级管理员，拥有所有权限',
  level: 100,
  isSystem: true,
  isActive: true,
  // 关联所有权限
  permissionKeys: [
    'SYSTEM_ALL',
    'USER_READ',
    'USER_CREATE',
    'USER_UPDATE',
    'USER_DELETE',
    'ROLE_READ',
    'ROLE_CREATE',
    'ROLE_UPDATE',
    'ROLE_DELETE',
    'PERMISSION_READ',
    'PERMISSION_CREATE',
    'PERMISSION_UPDATE',
    'PERMISSION_DELETE',
  ],
};
