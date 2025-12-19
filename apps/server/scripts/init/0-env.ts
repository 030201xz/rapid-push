/**
 * 初始化脚本环境变量配置
 *
 * 复用主应用的 env 配置，无需重复定义
 * 统一管理所有初始化数据的 UUID
 */

import { env } from '@/common/env';

export { env, getDatabaseUrl } from '@/common/env';

/** 获取数据库 Schema 名称 */
export function getSchemaName(): string {
  return env.database.schema ?? 'rapid_s';
}

// ============================================================================
// 统一 ID 配置
// 所有初始化数据的 ID 统一在此定义，便于共享引用和强类型约束
// 使用标准 UUID v4 格式 (8-4-4-4-12)
// ============================================================================

/**
 * 权限 ID 配置
 * @description 使用 as const 确保类型字面量推导
 */
export const PermissionIds = {
  // -------------------- 系统权限 --------------------
  /** 超级管理员权限 (所有权限) */
  SYSTEM_ALL: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000001',

  // -------------------- 用户管理权限 --------------------
  /** 用户管理 - 查看 */
  USER_READ: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000101',
  /** 用户管理 - 创建 */
  USER_CREATE: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000102',
  /** 用户管理 - 更新 */
  USER_UPDATE: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000103',
  /** 用户管理 - 删除 */
  USER_DELETE: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000104',

  // -------------------- 角色管理权限 --------------------
  /** 角色管理 - 查看 */
  ROLE_READ: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000201',
  /** 角色管理 - 创建 */
  ROLE_CREATE: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000202',
  /** 角色管理 - 更新 */
  ROLE_UPDATE: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000203',
  /** 角色管理 - 删除 */
  ROLE_DELETE: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000204',

  // -------------------- 权限管理权限 --------------------
  /** 权限管理 - 查看 */
  PERMISSION_READ: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000301',
  /** 权限管理 - 创建 */
  PERMISSION_CREATE: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000302',
  /** 权限管理 - 更新 */
  PERMISSION_UPDATE: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000303',
  /** 权限管理 - 删除 */
  PERMISSION_DELETE: 'a1b2c3d4-e5f6-4a7b-8c9d-300000000304',
} as const;

/** 权限 Key 类型 */
export type PermissionKey = keyof typeof PermissionIds;

/**
 * 角色 ID 配置
 */
export const RoleIds = {
  /** 超级管理员角色 */
  SUPER_ADMIN: 'a1b2c3d4-e5f6-4a7b-8c9d-400000000001',
  /** 普通用户角色 */
  USER: 'a1b2c3d4-e5f6-4a7b-8c9d-400000000002',
} as const;

/** 角色 Key 类型 */
export type RoleKey = keyof typeof RoleIds;

/**
 * 用户 ID 配置
 */
export const UserIds = {
  /** 系统管理员 */
  SYSTEM_ADMIN: 'a1b2c3d4-e5f6-4a7b-8c9d-500000000001',
} as const;

/** 用户 Key 类型 */
export type UserKey = keyof typeof UserIds;

// ============================================================================
// Hot Update 模块 ID 配置
// ============================================================================

/**
 * 组织 ID 配置
 */
export const OrganizationIds = {
  /** 默认演示组织 */
  DEMO_ORG: 'a1b2c3d4-e5f6-4a7b-8c9d-600000000001',
} as const;

/** 组织 Key 类型 */
export type OrganizationKey = keyof typeof OrganizationIds;

/**
 * 项目 ID 配置
 */
export const ProjectIds = {
  /** 演示项目 */
  DEMO_PROJECT: 'a1b2c3d4-e5f6-4a7b-8c9d-700000000001',
} as const;

/** 项目 Key 类型 */
export type ProjectKey = keyof typeof ProjectIds;

/**
 * 渠道 ID 配置
 */
export const ChannelIds = {
  /** 生产环境渠道 */
  PRODUCTION: 'a1b2c3d4-e5f6-4a7b-8c9d-800000000001',
  /** 预发布环境渠道 */
  STAGING: 'a1b2c3d4-e5f6-4a7b-8c9d-800000000002',
} as const;

/** 渠道 Key 类型 */
export type ChannelKey = keyof typeof ChannelIds;
