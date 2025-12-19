/**
 * User Role Mappings Schema - 用户角色关联表
 *
 * 核心设计:
 * - 多对多关系：一个用户可以拥有多个角色
 * - 支持作用域控制：global | organization | project
 * - 支持角色有效期控制
 * - 支持角色撤销（软删除）
 * - 记录角色分配人和分配原因
 *
 * 外键约束:
 * - userId -> users.id (CASCADE DELETE)
 * - roleId -> roles.id (CASCADE DELETE)
 * - assignedBy -> users.id (SET NULL, 可选)
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../../identify/users/schema';
import { SCOPE_TYPE } from '../constants';
import { roles } from '../roles/schema';

// ========== 表定义 ==========
export const userRoleMappings = appSchema.table(
  'user_role_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 用户 ID (外键约束) */
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 角色 ID (外键约束) */
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    /** 作用域类型: global | organization | project */
    scopeType: varchar('scope_type', { length: 20 })
      .notNull()
      .default(SCOPE_TYPE.GLOBAL),
    /** 作用域 ID (organization_id / project_id)，global 时为 null */
    scopeId: uuid('scope_id'),
    /** 角色生效时间 */
    effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
    /** 角色失效时间 (null 表示永久有效) */
    effectiveTo: timestamp('effective_to'),
    /** 分配人 ID (外键约束, 可选) */
    assignedBy: uuid('assigned_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    /** 分配原因 */
    assignReason: text('assign_reason'),
    /** 是否已撤销 */
    isRevoked: boolean('is_revoked').default(false).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // (userId, roleId, scopeType, scopeId) 联合唯一约束
    unique('uq_user_role_scope').on(
      t.userId,
      t.roleId,
      t.scopeType,
      t.scopeId
    ),
    // 为 userId 建立索引，优化用户角色查询
    index('idx_user_role_mappings_user_id').on(t.userId),
    // 为 roleId 建立索引，优化角色用户查询
    index('idx_user_role_mappings_role_id').on(t.roleId),
    // 为作用域建立索引，优化组织/项目成员查询
    index('idx_user_role_mappings_scope').on(t.scopeType, t.scopeId),
    // 为有效期建立索引，优化过期角色查询
    index('idx_user_role_mappings_effective').on(
      t.effectiveFrom,
      t.effectiveTo
    ),
    // 为撤销状态建立索引，优化有效角色查询
    index('idx_user_role_mappings_is_revoked').on(t.isRevoked),
  ]
);

// ========== Relations 定义 ==========
export const userRoleMappingsRelations = relations(
  userRoleMappings,
  ({ one }) => ({
    /** 关联的用户 */
    user: one(users, {
      fields: [userRoleMappings.userId],
      references: [users.id],
    }),
    /** 关联的角色 */
    role: one(roles, {
      fields: [userRoleMappings.roleId],
      references: [roles.id],
    }),
    /** 分配者 */
    assigner: one(users, {
      fields: [userRoleMappings.assignedBy],
      references: [users.id],
    }),
  })
);

// ========== Zod Schema（自动派生） ==========

/** 创建用户角色映射 Schema */
export const insertUserRoleMappingSchema = createInsertSchema(
  userRoleMappings
).omit({
  id: true,
  isRevoked: true,
  createdAt: true,
  updatedAt: true,
});

/** 更新用户角色映射 Schema */
export const updateUserRoleMappingSchema = createInsertSchema(
  userRoleMappings
)
  .pick({
    effectiveTo: true,
    assignReason: true,
  })
  .partial();

/** 查询用户角色映射 Schema */
export const selectUserRoleMappingSchema =
  createSelectSchema(userRoleMappings);

// ========== 类型导出（从表定义推导） ==========
export type UserRoleMapping = typeof userRoleMappings.$inferSelect;
export type NewUserRoleMapping = typeof userRoleMappings.$inferInsert;
export type UpdateUserRoleMapping = Partial<
  Pick<NewUserRoleMapping, 'effectiveTo' | 'assignReason'>
>;
