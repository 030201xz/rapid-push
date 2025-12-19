/**
 * Permissions Schema - 权限表
 *
 * 核心设计:
 * - 定义系统中的权限项 (如：用户管理、内容发布等)
 * - 使用 code 作为唯一标识
 * - 支持权限分组和层级结构 (parentId 真外键约束)
 * - 软删除设计
 *
 * 外键约束:
 * - parentId -> permissions.id (自引用, CASCADE DELETE)
 *
 * Permission 后续不止可以赋予角色，也可以直接赋予用户、API、页面、按钮等实体
 */

import { relations } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { appSchema } from '@/common/database/postgresql/rapid-s/schema';

// ========== 权限类型枚举 ==========
export const PERMISSION_TYPE = {
  /** 菜单权限 */
  MENU: 'menu',
  /** 按钮权限 */
  BUTTON: 'button',
  /** API 权限 */
  API: 'api',
} as const;

export type PermissionType =
  (typeof PERMISSION_TYPE)[keyof typeof PERMISSION_TYPE];

// ========== 表定义 ==========
export const permissions = appSchema.table(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 权限唯一标识码 */
    code: varchar('code', { length: 100 }).notNull().unique(),
    /** 权限名称 */
    name: varchar('name', { length: 100 }).notNull(),
    /** 权限描述 */
    description: text('description'),
    /** 父权限 ID (外键约束, CASCADE DELETE) */
    parentId: uuid('parent_id'),
    /** 权限类型 (menu=菜单, button=按钮, api=接口) */
    type: varchar('type', { length: 20 }).notNull(),
    /** 权限路径或资源标识 */
    resource: varchar('resource', { length: 255 }),
    /** 排序优先级 */
    sortPriority: integer('sort_priority').default(0).notNull(),
    /** 是否启用 */
    isActive: boolean('is_active').default(true).notNull(),
    /** 是否已删除 (软删除) */
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // 自引用外键: 父权限删除时级联删除子权限
    foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.id],
      name: 'fk_permissions_parent',
    }).onDelete('cascade'),
    // 为 code 建立唯一索引
    index('idx_permissions_code').on(t.code),
    // 为 parentId 建立索引，优化树形结构查询
    index('idx_permissions_parent_id').on(t.parentId),
    // 为 type 建立索引，优化权限类型查询
    index('idx_permissions_type').on(t.type),
    // 为状态建立组合索引
    index('idx_permissions_active_deleted').on(t.isActive, t.isDeleted),
  ],
);

// ========== Relations 定义 ==========
export const permissionsRelations = relations(permissions, ({ one, many }) => ({
  /** 父权限 */
  parent: one(permissions, {
    fields: [permissions.parentId],
    references: [permissions.id],
    relationName: 'permission_parent',
  }),
  /** 子权限列表 */
  children: many(permissions, {
    relationName: 'permission_parent',
  }),
}));

// ========== Zod Schema（自动派生） ==========

/** 创建权限 Schema */
export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});



/** 更新权限 Schema */
export const updatePermissionSchema = createInsertSchema(permissions)
  .pick({
    name: true,
    description: true,
    parentId: true,
    resource: true,
    sortPriority: true,
    isActive: true,
  })
  .partial();

/** 查询权限 Schema */
export const selectPermissionSchema = createSelectSchema(permissions);

// ========== 类型导出（从表定义推导） ==========
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type UpdatePermission = Partial<
  Pick<
    NewPermission,
    'name' | 'description' | 'parentId' | 'resource' | 'sortPriority' | 'isActive'
  >
>;
