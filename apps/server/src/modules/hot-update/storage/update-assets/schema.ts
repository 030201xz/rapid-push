/**
 * Update Assets Schema - 更新资源关联表
 *
 * 核心设计:
 * - 更新与资源的多对多关联
 * - 区分启动资源（JS Bundle）和普通资源
 * - 支持平台区分（iOS/Android/通用）
 *
 * 约束:
 * - updateId 外键关联 updates.id
 * - assetId 外键关联 assets.id
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import {
  boolean,
  index,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { updates } from '../../manage/updates/schema';
import { assets } from '../assets/schema';

// ========== 平台类型 ==========
export const PLATFORM = {
  /** iOS 平台 */
  IOS: 'ios',
  /** Android 平台 */
  ANDROID: 'android',
} as const;

export type Platform =
  | (typeof PLATFORM)[keyof typeof PLATFORM]
  | null;

// ========== 表定义 ==========
export const updateAssets = appSchema.table(
  'update_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 更新 ID */
    updateId: uuid('update_id')
      .notNull()
      .references(() => updates.id, { onDelete: 'cascade' }),
    /** 资源 ID */
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    /** 是否为启动资源（JS Bundle） */
    isLaunchAsset: boolean('is_launch_asset')
      .default(false)
      .notNull(),
    /**
     * 资源所属平台
     * - 'ios': iOS 平台专用
     * - 'android': Android 平台专用
     * - null: 通用资源（两个平台都需要）
     */
    platform: varchar('platform', { length: 10 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  t => [
    // 为 updateId 建立索引，优化更新资源查询
    index('idx_update_assets_update_id').on(t.updateId),
    // 为 assetId 建立索引，优化资源使用查询
    index('idx_update_assets_asset_id').on(t.assetId),
    // 为平台建立索引，优化平台资源筛选
    index('idx_update_assets_platform').on(t.platform),
    // 为启动资源建立索引
    index('idx_update_assets_is_launch').on(t.isLaunchAsset),
  ]
);

// ========== Zod Schema（自动派生） ==========

/** 创建更新资源关联 Schema */
export const insertUpdateAssetSchema = createInsertSchema(
  updateAssets
).omit({
  id: true,
  createdAt: true,
});

/** 查询更新资源关联 Schema */
export const selectUpdateAssetSchema =
  createSelectSchema(updateAssets);

// ========== 类型导出（从表定义推导） ==========
export type UpdateAsset = typeof updateAssets.$inferSelect;
export type NewUpdateAsset = typeof updateAssets.$inferInsert;
