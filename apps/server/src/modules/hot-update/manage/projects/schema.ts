/**
 * Projects Schema - 项目表
 *
 * 核心设计:
 * - 组织下的项目管理
 * - 使用 slug 作为 URL 友好标识（组织内唯一）
 * - 软删除设计
 *
 * 约束:
 * - organizationId 外键关联 organizations.id
 * - (organizationId, slug) 组合唯一
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
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
import { organizations } from '../organizations/schema';

// ========== 表定义 ==========
export const projects = appSchema.table(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 所属组织 ID */
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** 项目名称 */
    name: varchar('name', { length: 100 }).notNull(),
    /** URL 友好标识（组织内唯一） */
    slug: varchar('slug', { length: 100 }).notNull(),
    /** 项目描述 */
    description: text('description'),
    /** 是否已删除（软删除） */
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // 组合唯一约束：(organizationId, slug)
    unique('uq_projects_org_slug').on(t.organizationId, t.slug),
    // 为 organizationId 建立索引，优化组织项目查询
    index('idx_projects_organization_id').on(t.organizationId),
    // 为 slug 建立索引，优化 URL 查询
    index('idx_projects_slug').on(t.slug),
    // 为删除状态建立索引
    index('idx_projects_is_deleted').on(t.isDeleted),
  ]
);

// ========== Zod Schema（自动派生） ==========

/** 创建项目 Schema */
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

/** 更新项目 Schema */
export const updateProjectSchema = createInsertSchema(projects)
  .pick({
    name: true,
    description: true,
  })
  .partial();

/** 查询项目 Schema */
export const selectProjectSchema = createSelectSchema(projects);

// ========== 类型导出（从表定义推导） ==========
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type UpdateProject = Partial<
  Pick<NewProject, 'name' | 'description'>
>;
