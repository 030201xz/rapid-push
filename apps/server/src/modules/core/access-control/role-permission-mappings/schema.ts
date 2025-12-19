/**
 * Role Permission Mappings Schema - 角色权限关联表
 *
 * 核心设计:
 * - 多对多关系：一个角色可以拥有多个权限
 * - RBAC 权限控制的核心表
 *
 * 外键约束:
 * - roleId -> roles.id (CASCADE DELETE)
 * - permissionId -> permissions.id (CASCADE DELETE)
 * - (roleId, permissionId) 联合唯一约束
 */

import { relations } from 'drizzle-orm';
import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import { index, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { roles } from '../roles/schema';
import { permissions } from '../permissions/schema';

// ========== 表定义 ==========
export const rolePermissionMappings = appSchema.table(
  'role_permission_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 角色 ID (外键约束) */
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    /** 权限 ID (外键约束) */
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  t => [
    // (roleId, permissionId) 联合唯一约束
    unique('uq_role_permission').on(t.roleId, t.permissionId),
    // 为 roleId 建立索引，优化角色权限查询
    index('idx_role_permission_mappings_role_id').on(t.roleId),
    // 为 permissionId 建立索引，优化权限角色查询
    index('idx_role_permission_mappings_permission_id').on(t.permissionId),
  ],
);

// ========== Relations 定义 ==========
export const rolePermissionMappingsRelations = relations(
  rolePermissionMappings,
  ({ one }) => ({
    /** 关联的角色 */
    role: one(roles, {
      fields: [rolePermissionMappings.roleId],
      references: [roles.id],
    }),
    /** 关联的权限 */
    permission: one(permissions, {
      fields: [rolePermissionMappings.permissionId],
      references: [permissions.id],
    }),
  }),
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
