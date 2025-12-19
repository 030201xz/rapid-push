/**
 * Updates Schema - 更新表
 *
 * 核心设计:
 * - 渠道下的热更新版本管理
 * - 支持 Expo Updates v1 协议规范字段
 * - 支持灰度发布（rolloutPercentage）
 * - 记录下载/安装统计
 *
 * 约束:
 * - channelId 外键关联 channels.id
 * - 同一渠道下可有多个更新版本
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { channels } from '../channels/schema';

// ========== 表定义 ==========
export const updates = appSchema.table(
  'updates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 所属渠道 ID */
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    /** 运行时版本（Expo runtimeVersion） */
    runtimeVersion: varchar('runtime_version', {
      length: 50,
    }).notNull(),

    // ========== Expo Updates 规范字段 ==========
    /** 更新元数据 */
    metadata: jsonb('metadata')
      .$type<Record<string, string>>()
      .default({}),
    /** 额外信息 */
    extra: jsonb('extra')
      .$type<Record<string, unknown>>()
      .default({}),

    // ========== 管理字段 ==========
    /** 更新说明 */
    description: text('description'),
    /** 是否启用 */
    isEnabled: boolean('is_enabled').default(true).notNull(),
    /** 是否为回滚版本 */
    isRollback: boolean('is_rollback').default(false).notNull(),
    /** 灰度百分比（0-100） */
    rolloutPercentage: integer('rollout_percentage')
      .default(100)
      .notNull(),

    // ========== 统计字段 ==========
    /** 下载次数 */
    downloadCount: bigint('download_count', { mode: 'number' })
      .default(0)
      .notNull(),
    /** 安装次数 */
    installCount: bigint('install_count', { mode: 'number' })
      .default(0)
      .notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  t => [
    // 为 (channelId, runtimeVersion) 建立索引，优化版本查询
    index('idx_updates_channel_runtime').on(
      t.channelId,
      t.runtimeVersion
    ),
    // 为 channelId 建立索引
    index('idx_updates_channel_id').on(t.channelId),
    // 为创建时间建立索引，优化最新版本查询
    index('idx_updates_created_at').on(t.createdAt),
    // 为启用状态建立索引
    index('idx_updates_is_enabled').on(t.isEnabled),
  ]
);

// ========== Zod Schema（自动派生） ==========

/** 创建更新 Schema */
export const insertUpdateSchema = createInsertSchema(updates).omit({
  id: true,
  downloadCount: true,
  installCount: true,
  createdAt: true,
});

/** 更新设置 Schema（修改启用状态、灰度比例等） */
export const updateSettingsSchema = createInsertSchema(updates)
  .pick({
    description: true,
    isEnabled: true,
    rolloutPercentage: true,
  })
  .partial();

/** 查询更新 Schema */
export const selectUpdateSchema = createSelectSchema(updates);

// ========== 类型导出（从表定义推导） ==========
export type Update = typeof updates.$inferSelect;
export type NewUpdate = typeof updates.$inferInsert;
export type UpdateSettings = Partial<
  Pick<NewUpdate, 'description' | 'isEnabled' | 'rolloutPercentage'>
>;
