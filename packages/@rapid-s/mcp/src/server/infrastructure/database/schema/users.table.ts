/**
 * 用户表 Schema 定义
 *
 * 使用 Drizzle ORM 定义 PostgreSQL 表结构
 */

import {
  boolean,
  pgSchema,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/** 应用 Schema（PostgreSQL namespace） */
export const egoSchema = pgSchema('ego');

/**
 * 用户表
 *
 * 存储用户基本信息
 */
export const users = egoSchema.table('users', {
  /** 主键 UUID */
  id: uuid('id').primaryKey().defaultRandom(),

  /** 用户名（唯一） */
  username: varchar('username', { length: 50 }).notNull().unique(),

  /** 邮箱（唯一） */
  email: varchar('email', { length: 255 }).notNull().unique(),

  /** 密码哈希 */
  passwordHash: text('password_hash').notNull(),

  /** 显示名称 */
  displayName: varchar('display_name', { length: 100 }),

  /** 是否激活 */
  isActive: boolean('is_active').notNull().default(true),

  /** 创建时间 */
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  /** 更新时间 */
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** 用户表类型推导 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
