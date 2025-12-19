/**
 * Organizations Schema - 组织表
 *
 * 核心设计:
 * - 多租户架构的顶层实体
 * - 使用 slug 作为 URL 友好标识
 * - 关联所有者用户
 * - 软删除设计
 *
 * 约束:
 * - slug 必须全局唯一
 * - ownerId 外键关联 users.id
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import { users } from '@/modules/core/identify/users/schema';
import {
  boolean,
  index,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// ========== 表定义 ==========
export const organizations = appSchema.table(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 组织名称 */
    name: varchar('name', { length: 100 }).notNull(),
    /** URL 友好标识（唯一） */
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    /** 组织描述 */
    description: text('description'),
    /** 所有者用户 ID */
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 是否已删除（软删除） */
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // 为 slug 建立唯一索引，优化 URL 查询
    index('idx_organizations_slug').on(t.slug),
    // 为 ownerId 建立索引，优化用户组织查询
    index('idx_organizations_owner_id').on(t.ownerId),
    // 为删除状态建立索引，优化列表查询
    index('idx_organizations_is_deleted').on(t.isDeleted),
  ]
);

// ========== Zod Schema（自动派生） ==========

/** 创建组织 Schema（省略自动生成字段） */
export const insertOrganizationSchema = createInsertSchema(
  organizations
).omit({
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

/** 更新组织 Schema（仅可修改的字段） */
export const updateOrganizationSchema = createInsertSchema(
  organizations
)
  .pick({
    name: true,
    description: true,
  })
  .partial();

/** 查询组织 Schema */
export const selectOrganizationSchema =
  createSelectSchema(organizations);

// ========== 类型导出（从表定义推导） ==========
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type UpdateOrganization = Partial<
  Pick<NewOrganization, 'name' | 'description'>
>;
