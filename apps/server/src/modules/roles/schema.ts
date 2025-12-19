/**
 * Roles Schema - 角色表
 *
 * 核心设计:
 * - 定义系统中的角色类型 (如：管理员、会员、游客等)
 * - 使用 code 作为唯一标识
 * - 支持角色层级和优先级
 * - 软删除设计
 *
 * 约束 (应用层保证):
 * - code 必须全局唯一
 * - name 不能为空
 * - level 用于角色层级控制 (数值越大权限越高)
 */

import {
  boolean,
  index,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { appSchema } from '@/common/database/postgresql/rapid-s/schema';

// ========== 表定义 ==========
export const roles = appSchema.table(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 角色唯一标识码 */
    code: varchar('code', { length: 50 }).notNull().unique(),
    /** 角色名称 */
    name: varchar('name', { length: 100 }).notNull(),
    /** 角色描述 */
    description: text('description'),
    /** 角色层级 (数值越大权限越高) */
    level: integer('level').default(0).notNull(),
    /** 是否为系统内置角色 (不可删除) */
    isSystem: boolean('is_system').default(false).notNull(),
    /** 是否启用 */
    isActive: boolean('is_active').default(true).notNull(),
    /** 是否已删除 (软删除) */
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // 为 code 建立唯一索引
    index('idx_roles_code').on(t.code),
    // 为角色层级建立索引，优化权限判断
    index('idx_roles_level').on(t.level),
    // 为状态建立组合索引
    index('idx_roles_active_deleted').on(t.isActive, t.isDeleted),
  ],
);

// ========== Zod Schema（自动派生） ==========

/** 创建角色 Schema */
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

/** 更新角色 Schema */
export const updateRoleSchema = createInsertSchema(roles)
  .pick({
    name: true,
    description: true,
    level: true,
    isActive: true,
  })
  .partial();

/** 查询角色 Schema */
export const selectRoleSchema = createSelectSchema(roles);

// ========== 类型导出（从表定义推导） ==========
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type UpdateRole = Partial<
  Pick<NewRole, 'name' | 'description' | 'level' | 'isActive'>
>;
