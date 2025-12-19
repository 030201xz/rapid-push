/**
 * User Role Mappings Schema - 用户角色关联表
 *
 * 核心设计:
 * - 多对多关系：一个用户可以拥有多个角色
 * - 支持角色有效期控制
 * - 支持角色撤销（软删除）
 * - 记录角色分配人和分配原因
 *
 * 约束 (应用层保证):
 * - userId 必须存在于 users 表
 * - roleId 必须存在于 roles 表
 * - (userId, roleId) 组合唯一（未撤销的记录）
 */

import {
  boolean,
  index,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { appSchema } from '@/common/database/postgresql/rapid-s/schema';

// ========== 表定义 ==========
export const userRoleMappings = appSchema.table(
  'user_role_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 用户 ID（应用层保证存在） */
    userId: uuid('user_id').notNull(),
    /** 角色 ID（应用层保证存在） */
    roleId: uuid('role_id').notNull(),
    /** 角色生效时间 */
    effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
    /** 角色失效时间 (null 表示永久有效) */
    effectiveTo: timestamp('effective_to'),
    /** 分配人 ID（应用层保证存在） */
    assignedBy: uuid('assigned_by'),
    /** 分配原因 */
    assignReason: text('assign_reason'),
    /** 是否已撤销 */
    isRevoked: boolean('is_revoked').default(false).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // 为 userId 建立索引，优化用户角色查询
    index('idx_user_role_mappings_user_id').on(t.userId),
    // 为 roleId 建立索引，优化角色用户查询
    index('idx_user_role_mappings_role_id').on(t.roleId),
    // 为 (userId, roleId) 建立索引，防止重复分配
    index('idx_user_role_mappings_user_role').on(t.userId, t.roleId),
    // 为有效期建立索引，优化过期角色查询
    index('idx_user_role_mappings_effective').on(t.effectiveFrom, t.effectiveTo),
    // 为撤销状态建立索引，优化有效角色查询
    index('idx_user_role_mappings_is_revoked').on(t.isRevoked),
  ],
);

// ========== Zod Schema（自动派生） ==========

/** 创建用户角色映射 Schema */
export const insertUserRoleMappingSchema = createInsertSchema(
  userRoleMappings,
).omit({
  id: true,
  isRevoked: true,
  createdAt: true,
  updatedAt: true,
});

/** 更新用户角色映射 Schema */
export const updateUserRoleMappingSchema = createInsertSchema(userRoleMappings)
  .pick({
    effectiveTo: true,
    assignReason: true,
  })
  .partial();

/** 查询用户角色映射 Schema */
export const selectUserRoleMappingSchema = createSelectSchema(userRoleMappings);

// ========== 类型导出（从表定义推导） ==========
export type UserRoleMapping = typeof userRoleMappings.$inferSelect;
export type NewUserRoleMapping = typeof userRoleMappings.$inferInsert;
export type UpdateUserRoleMapping = Partial<
  Pick<NewUserRoleMapping, 'effectiveTo' | 'assignReason'>
>;
