/**
 * Assets Schema - 资源表
 *
 * 核心设计:
 * - 内容寻址存储（Content Addressable Storage）
 * - 使用 SHA-256 哈希作为唯一标识
 * - 资源去重：相同内容只存储一份
 * - 支持多种 MIME 类型
 *
 * 约束:
 * - hash 必须全局唯一
 * - storagePath 指向实际存储位置
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import {
  bigint,
  index,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// ========== 表定义 ==========
export const assets = appSchema.table(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** SHA-256 哈希值（唯一，Base64URL 编码） */
    hash: varchar('hash', { length: 64 }).notNull().unique(),
    /** 资源键（原始文件路径/标识） */
    key: varchar('key', { length: 500 }).notNull(),
    /** MIME 类型 */
    contentType: varchar('content_type', { length: 100 }).notNull(),
    /** 文件扩展名 */
    fileExtension: varchar('file_extension', { length: 20 }),
    /** 存储路径（本地路径或云存储 key） */
    storagePath: text('storage_path').notNull(),
    /** 文件大小（字节） */
    size: bigint('size', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  t => [
    // 为 hash 建立唯一索引，优化资源查找
    index('idx_assets_hash').on(t.hash),
    // 为 contentType 建立索引，优化类型筛选
    index('idx_assets_content_type').on(t.contentType),
  ]
);

// ========== Zod Schema（自动派生） ==========

/** 创建资源 Schema */
export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

/** 查询资源 Schema */
export const selectAssetSchema = createSelectSchema(assets);

// ========== 类型导出（从表定义推导） ==========
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
