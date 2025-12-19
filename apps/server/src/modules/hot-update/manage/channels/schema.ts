/**
 * Channels Schema - 渠道表
 *
 * 核心设计:
 * - 项目下的渠道/环境管理（如 production, staging, development）
 * - 使用 channelKey 作为客户端鉴权标识
 * - 支持 RSA 代码签名密钥对存储
 * - 软删除设计
 *
 * 约束:
 * - projectId 外键关联 projects.id
 * - channelKey 全局唯一
 * - (projectId, name) 组合唯一
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
import { projects } from '../projects/schema';

// ========== 表定义 ==========
export const channels = appSchema.table(
  'channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 所属项目 ID */
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** 渠道名称（如 production, staging） */
    name: varchar('name', { length: 50 }).notNull(),
    /** 渠道密钥（客户端鉴权用，唯一） */
    channelKey: varchar('channel_key', { length: 64 })
      .notNull()
      .unique(),
    /** 渠道描述 */
    description: text('description'),

    // ========== 代码签名字段 ==========
    /** RSA 私钥（PEM 格式，加密存储） */
    privateKey: text('private_key'),
    /** RSA 公钥（PEM 格式） */
    publicKey: text('public_key'),
    /** 是否启用代码签名 */
    signingEnabled: boolean('signing_enabled')
      .default(false)
      .notNull(),

    /** 是否已删除（软删除） */
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // 组合唯一约束：(projectId, name)
    unique('uq_channels_project_name').on(t.projectId, t.name),
    // 为 projectId 建立索引，优化项目渠道查询
    index('idx_channels_project_id').on(t.projectId),
    // 为 channelKey 建立索引，优化客户端鉴权查询
    index('idx_channels_channel_key').on(t.channelKey),
    // 为删除状态建立索引
    index('idx_channels_is_deleted').on(t.isDeleted),
  ]
);

// ========== Zod Schema（自动派生） ==========

/** 创建渠道 Schema（省略密钥相关字段，通过专门接口生成） */
export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  channelKey: true,
  privateKey: true,
  publicKey: true,
  signingEnabled: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

/** 更新渠道 Schema */
export const updateChannelSchema = createInsertSchema(channels)
  .pick({
    name: true,
    description: true,
  })
  .partial();

/** 查询渠道 Schema */
export const selectChannelSchema = createSelectSchema(channels);

// ========== 类型导出（从表定义推导） ==========
export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type UpdateChannel = Partial<
  Pick<NewChannel, 'name' | 'description'>
>;
