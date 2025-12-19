/**
 * Organization Members Schema - 组织成员表
 *
 * 核心设计:
 * - 用户与组织的多对多关联
 * - 支持成员角色：owner（所有者）、admin（管理员）、member（成员）
 * - 记录加入时间和状态
 *
 * 约束:
 * - organizationId 外键关联 organizations.id
 * - userId 外键关联 users.id
 * - (organizationId, userId) 组合唯一
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import { users } from '@/modules/core/identify/users/schema';
import {
  boolean,
  index,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organizations } from '../organizations/schema';

// ========== 成员角色枚举 ==========
export const MEMBER_ROLE = {
  /** 所有者（最高权限） */
  OWNER: 'owner',
  /** 管理员 */
  ADMIN: 'admin',
  /** 普通成员 */
  MEMBER: 'member',
} as const;

export type MemberRole =
  (typeof MEMBER_ROLE)[keyof typeof MEMBER_ROLE];

// ========== 表定义 ==========
export const organizationMembers = appSchema.table(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 组织 ID */
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** 用户 ID */
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 成员角色：owner | admin | member */
    role: varchar('role', { length: 20 })
      .notNull()
      .default(MEMBER_ROLE.MEMBER),
    /** 加入时间 */
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    /** 是否激活 */
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // 为 organizationId 建立索引，优化组织成员查询
    index('idx_organization_members_org_id').on(t.organizationId),
    // 为 userId 建立索引，优化用户所属组织查询
    index('idx_organization_members_user_id').on(t.userId),
    // 为 (organizationId, userId) 建立唯一索引
    index('idx_organization_members_org_user').on(
      t.organizationId,
      t.userId
    ),
    // 为角色建立索引，优化角色筛选
    index('idx_organization_members_role').on(t.role),
    // 为活跃状态建立索引
    index('idx_organization_members_is_active').on(t.isActive),
  ]
);

// ========== Zod Schema（自动派生） ==========

/** 创建组织成员 Schema */
export const insertOrganizationMemberSchema = createInsertSchema(
  organizationMembers
).omit({
  id: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
});

/** 更新组织成员 Schema */
export const updateOrganizationMemberSchema = createInsertSchema(
  organizationMembers
)
  .pick({
    role: true,
    isActive: true,
  })
  .partial();

/** 查询组织成员 Schema */
export const selectOrganizationMemberSchema = createSelectSchema(
  organizationMembers
);

// ========== 类型导出（从表定义推导） ==========
export type OrganizationMember =
  typeof organizationMembers.$inferSelect;
export type NewOrganizationMember =
  typeof organizationMembers.$inferInsert;
export type UpdateOrganizationMember = Partial<
  Pick<NewOrganizationMember, 'role' | 'isActive'>
>;
