/**
 * Role Permission Mappings Schema - 角色权限关联表
 *
 * 核心设计:
 * - 多对多关系：一个角色可以拥有多个权限
 * - RBAC 权限控制的核心表
 *
 * 约束 (应用层保证):
 * - roleId 必须存在于 roles 表
 * - permissionId 必须存在于 permissions 表
 * - (roleId, permissionId) 组合唯一
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import { index, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// ========== 表定义 ==========
export const rolePermissionMappings = appSchema.table(
  'role_permission_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 角色 ID（应用层保证存在） */
    roleId: uuid('role_id').notNull(),
    /** 权限 ID（应用层保证存在） */
    permissionId: uuid('permission_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  t => [
    // 为 roleId 建立索引，优化角色权限查询
    index('idx_role_permission_mappings_role_id').on(t.roleId),
    // 为 permissionId 建立索引，优化权限角色查询
    index('idx_role_permission_mappings_permission_id').on(
      t.permissionId
    ),
    // 为 (roleId, permissionId) 建立唯一索引，防止重复分配
    index('idx_role_permission_mappings_role_permission').on(
      t.roleId,
      t.permissionId
    ),
  ]
);

// ========== Zod Schema（自动派生） ==========

/** 创建角色权限映射 Schema */
export const insertRolePermissionMappingSchema = createInsertSchema(
  rolePermissionMappings
).omit({
  id: true,
  createdAt: true,
});

/** 查询角色权限映射 Schema */
export const selectRolePermissionMappingSchema = createSelectSchema(
  rolePermissionMappings
);

// ========== 类型导出（从表定义推导） ==========
export type RolePermissionMapping =
  typeof rolePermissionMappings.$inferSelect;
export type NewRolePermissionMapping =
  typeof rolePermissionMappings.$inferInsert;
