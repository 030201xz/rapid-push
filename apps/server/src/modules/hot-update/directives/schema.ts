/**
 * Directives Schema - 指令表
 *
 * 核心设计:
 * - 实现 Expo Updates v1 协议的指令功能
 * - 支持 rollBackToEmbedded（回滚到嵌入版本）等操作
 * - 支持指令过期时间和激活状态
 *
 * 约束:
 * - channelId 外键关联 channels.id
 * - 同一渠道同一运行时版本可有多个指令（按优先级）
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import {
  boolean,
  index,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { channels } from '../channels/schema';

// ========== 指令类型枚举 ==========
export const DIRECTIVE_TYPE = {
  /** 回滚到嵌入版本 */
  ROLL_BACK_TO_EMBEDDED: 'rollBackToEmbedded',
  /** 无可用更新 */
  NO_UPDATE_AVAILABLE: 'noUpdateAvailable',
} as const;

export type DirectiveType =
  (typeof DIRECTIVE_TYPE)[keyof typeof DIRECTIVE_TYPE];

// ========== 表定义 ==========
export const directives = appSchema.table(
  'directives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 所属渠道 ID */
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    /** 目标运行时版本 */
    runtimeVersion: varchar('runtime_version', {
      length: 50,
    }).notNull(),
    /** 指令类型 */
    type: varchar('type', { length: 50 }).notNull(),
    /** 指令参数 */
    parameters: jsonb('parameters')
      .$type<Record<string, unknown>>()
      .default({}),
    /** 额外信息 */
    extra: jsonb('extra')
      .$type<Record<string, unknown>>()
      .default({}),
    /** 是否激活 */
    isActive: boolean('is_active').default(true).notNull(),
    /** 过期时间（null 表示永久有效） */
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  t => [
    // 为 channelId 建立索引
    index('idx_directives_channel_id').on(t.channelId),
    // 为 (channelId, runtimeVersion) 建立索引，优化指令查询
    index('idx_directives_channel_runtime').on(
      t.channelId,
      t.runtimeVersion
    ),
    // 为激活状态建立索引
    index('idx_directives_is_active').on(t.isActive),
    // 为过期时间建立索引，优化清理操作
    index('idx_directives_expires_at').on(t.expiresAt),
  ]
);

// ========== Zod Schema（自动派生） ==========

/** 创建指令 Schema */
export const insertDirectiveSchema = createInsertSchema(
  directives
).omit({
  id: true,
  createdAt: true,
});

/** 更新指令 Schema */
export const updateDirectiveSchema = createInsertSchema(directives)
  .pick({
    isActive: true,
    expiresAt: true,
  })
  .partial();

/** 查询指令 Schema */
export const selectDirectiveSchema = createSelectSchema(directives);

// ========== 类型导出（从表定义推导） ==========
export type Directive = typeof directives.$inferSelect;
export type NewDirective = typeof directives.$inferInsert;
export type UpdateDirective = Partial<
  Pick<NewDirective, 'isActive' | 'expiresAt'>
>;
