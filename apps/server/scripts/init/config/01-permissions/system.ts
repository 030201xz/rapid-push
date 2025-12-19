/**
 * 系统权限配置
 *
 * 定义系统核心权限，按模块分组
 */

import type { PermissionConfig } from '../types';

/** 系统权限配置 */
export const systemPermissions: PermissionConfig[] = [
  // ========== 超级管理员权限 ==========
  {
    key: 'SYSTEM_ALL',
    code: 'system:all',
    name: '超级管理员权限',
    description: '拥有系统所有权限',
    type: 'api',
    resource: '*',
    isActive: true,
    sortPriority: 0,
  },

  // ========== 用户管理权限 ==========
  {
    key: 'USER_READ',
    code: 'user:read',
    name: '查看用户',
    description: '查看用户信息',
    type: 'api',
    resource: '/api/users/*',
    isActive: true,
    sortPriority: 100,
  },
  {
    key: 'USER_CREATE',
    code: 'user:create',
    name: '创建用户',
    description: '创建新用户',
    type: 'api',
    resource: '/api/users',
    isActive: true,
    sortPriority: 101,
  },
  {
    key: 'USER_UPDATE',
    code: 'user:update',
    name: '更新用户',
    description: '更新用户信息',
    type: 'api',
    resource: '/api/users/*',
    isActive: true,
    sortPriority: 102,
  },
  {
    key: 'USER_DELETE',
    code: 'user:delete',
    name: '删除用户',
    description: '删除用户',
    type: 'api',
    resource: '/api/users/*',
    isActive: true,
    sortPriority: 103,
  },

  // ========== 角色管理权限 ==========
  {
    key: 'ROLE_READ',
    code: 'role:read',
    name: '查看角色',
    description: '查看角色信息',
    type: 'api',
    resource: '/api/roles/*',
    isActive: true,
    sortPriority: 200,
  },
  {
    key: 'ROLE_CREATE',
    code: 'role:create',
    name: '创建角色',
    description: '创建新角色',
    type: 'api',
    resource: '/api/roles',
    isActive: true,
    sortPriority: 201,
  },
  {
    key: 'ROLE_UPDATE',
    code: 'role:update',
    name: '更新角色',
    description: '更新角色信息',
    type: 'api',
    resource: '/api/roles/*',
    isActive: true,
    sortPriority: 202,
  },
  {
    key: 'ROLE_DELETE',
    code: 'role:delete',
    name: '删除角色',
    description: '删除角色',
    type: 'api',
    resource: '/api/roles/*',
    isActive: true,
    sortPriority: 203,
  },

  // ========== 权限管理权限 ==========
  {
    key: 'PERMISSION_READ',
    code: 'permission:read',
    name: '查看权限',
    description: '查看权限信息',
    type: 'api',
    resource: '/api/permissions/*',
    isActive: true,
    sortPriority: 300,
  },
  {
    key: 'PERMISSION_CREATE',
    code: 'permission:create',
    name: '创建权限',
    description: '创建新权限',
    type: 'api',
    resource: '/api/permissions',
    isActive: true,
    sortPriority: 301,
  },
  {
    key: 'PERMISSION_UPDATE',
    code: 'permission:update',
    name: '更新权限',
    description: '更新权限信息',
    type: 'api',
    resource: '/api/permissions/*',
    isActive: true,
    sortPriority: 302,
  },
  {
    key: 'PERMISSION_DELETE',
    code: 'permission:delete',
    name: '删除权限',
    description: '删除权限',
    type: 'api',
    resource: '/api/permissions/*',
    isActive: true,
    sortPriority: 303,
  },
];
