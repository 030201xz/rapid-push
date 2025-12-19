/**
 * 更新服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 管理热更新版本发布和统计
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { LocalStorageProvider } from '@/common/storage';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { NewAsset } from '../../storage/assets/schema';
import * as assetService from '../../storage/assets/service';
import * as updateAssetService from '../../storage/update-assets/service';
import {
  updates,
  type NewUpdate,
  type UpdateSettings,
} from './schema';
import { extractBundle } from './utils';

// ========== 查询操作 ==========

/** 获取渠道下的所有更新（按创建时间倒序） */
export async function listUpdatesByChannel(
  db: Database,
  channelId: string
) {
  return db
    .select()
    .from(updates)
    .where(eq(updates.channelId, channelId))
    .orderBy(desc(updates.createdAt));
}

/** 获取渠道下指定运行时版本的更新列表 */
export async function listUpdatesByRuntimeVersion(
  db: Database,
  channelId: string,
  runtimeVersion: string
) {
  return db
    .select()
    .from(updates)
    .where(
      and(
        eq(updates.channelId, channelId),
        eq(updates.runtimeVersion, runtimeVersion)
      )
    )
    .orderBy(desc(updates.createdAt));
}

/** 根据 ID 获取更新 */
export async function getUpdateById(db: Database, id: string) {
  const result = await db
    .select()
    .from(updates)
    .where(eq(updates.id, id));
  return result[0] ?? null;
}

/** 获取渠道最新的启用更新 */
export async function getLatestEnabledUpdate(
  db: Database,
  channelId: string,
  runtimeVersion: string
) {
  const result = await db
    .select()
    .from(updates)
    .where(
      and(
        eq(updates.channelId, channelId),
        eq(updates.runtimeVersion, runtimeVersion),
        eq(updates.isEnabled, true)
      )
    )
    .orderBy(desc(updates.createdAt))
    .limit(1);
  return result[0] ?? null;
}

// ========== 写入操作 ==========

/** 创建更新 */
export async function createUpdate(db: Database, data: NewUpdate) {
  const [update] = await db.insert(updates).values(data).returning();
  if (!update) throw new Error('创建更新失败');
  return update;
}

/** 更新设置 */
export async function updateSettings(
  db: Database,
  id: string,
  data: UpdateSettings
) {
  const result = await db
    .update(updates)
    .set(data)
    .where(eq(updates.id, id))
    .returning();
  return result[0] ?? null;
}

/** 删除更新（物理删除） */
export async function deleteUpdate(db: Database, id: string) {
  const result = await db
    .delete(updates)
    .where(eq(updates.id, id))
    .returning();
  return result.length > 0;
}

// ========== 回滚操作 ==========

/** 创建回滚版本（复制指定更新为新版本，标记为回滚） */
export async function createRollback(
  db: Database,
  sourceUpdateId: string
) {
  const source = await getUpdateById(db, sourceUpdateId);
  if (!source) throw new Error('源更新不存在');

  const [rollback] = await db
    .insert(updates)
    .values({
      channelId: source.channelId,
      runtimeVersion: source.runtimeVersion,
      metadata: source.metadata,
      extra: source.extra,
      description: `回滚至: ${source.description ?? source.id}`,
      isEnabled: true,
      isRollback: true,
      rolloutPercentage: 100,
    })
    .returning();

  if (!rollback) throw new Error('创建回滚失败');
  return rollback;
}

// ========== 统计操作 ==========

/** 增加下载次数 */
export async function incrementDownloadCount(
  db: Database,
  id: string
) {
  const result = await db
    .update(updates)
    .set({ downloadCount: sql`${updates.downloadCount} + 1` })
    .where(eq(updates.id, id))
    .returning();
  return result[0] ?? null;
}

/** 增加安装次数 */
export async function incrementInstallCount(
  db: Database,
  id: string
) {
  const result = await db
    .update(updates)
    .set({ installCount: sql`${updates.installCount} + 1` })
    .where(eq(updates.id, id))
    .returning();
  return result[0] ?? null;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 更新列表返回类型 */
export type ListUpdatesResult = Awaited<
  ReturnType<typeof listUpdatesByChannel>
>;

/** 单个更新返回类型（可能为 null） */
export type GetUpdateResult = Awaited<
  ReturnType<typeof getUpdateById>
>;

/** 创建更新返回类型 */
export type CreateUpdateResult = Awaited<
  ReturnType<typeof createUpdate>
>;

/** 更新设置返回类型 */
export type UpdateSettingsResult = Awaited<
  ReturnType<typeof updateSettings>
>;

/** 删除更新返回类型 */
export type DeleteUpdateResult = Awaited<
  ReturnType<typeof deleteUpdate>
>;

// ========== Bundle 上传 ==========

/**
 * 上传 Bundle 参数
 */
export interface UploadBundleParams {
  /** 渠道 ID */
  channelId: string;
  /** 运行时版本 */
  runtimeVersion: string;
  /** 更新描述 */
  description?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
  /** 额外信息 */
  extra?: Record<string, unknown>;
  /** 灰度比例（0-100） */
  rolloutPercentage?: number;
  /** Bundle ZIP 文件 Buffer */
  bundleBuffer: Buffer;
}

/**
 * 上传 Bundle 并创建更新
 *
 * 处理流程：
 * 1. 解压 ZIP 文件，提取资源
 * 2. 计算资源哈希，去重存储
 * 3. 创建更新记录
 * 4. 创建更新-资源关联
 */
export async function uploadBundle(
  db: Database,
  params: UploadBundleParams
) {
  const {
    channelId,
    runtimeVersion,
    description,
    metadata,
    extra,
    rolloutPercentage = 100,
    bundleBuffer,
  } = params;

  // 1. 解压 Bundle
  const { assets: extractedAssets } = await extractBundle(
    bundleBuffer
  );

  // 2. 存储资源并创建记录
  const storage = LocalStorageProvider.getInstance();
  const assetIdMap = new Map<string, string>(); // hash -> assetId

  for (const extracted of extractedAssets) {
    // 检查资源是否已存在
    const existing = await assetService.getAssetByHash(
      db,
      extracted.hash
    );

    if (existing) {
      // 已存在，直接使用
      assetIdMap.set(extracted.hash, existing.id);
    } else {
      // 不存在，上传到存储并创建记录
      const storagePath = await storage.upload(
        extracted.content,
        extracted.hash,
        extracted.contentType
      );

      const newAsset: NewAsset = {
        hash: extracted.hash,
        key: extracted.key,
        contentType: extracted.contentType,
        fileExtension: extracted.fileExtension,
        storagePath,
        size: extracted.size,
      };

      const asset = await assetService.createAsset(db, newAsset);
      assetIdMap.set(extracted.hash, asset.id);
    }
  }

  // 3. 创建更新记录
  const [update] = await db
    .insert(updates)
    .values({
      channelId,
      runtimeVersion,
      description,
      metadata: metadata ?? {},
      extra: extra ?? {},
      rolloutPercentage,
    })
    .returning();

  if (!update) throw new Error('创建更新失败');

  // 4. 创建更新-资源关联
  const updateAssetData = extractedAssets.map(extracted => ({
    updateId: update.id,
    assetId: assetIdMap.get(extracted.hash)!,
    isLaunchAsset: extracted.isLaunchAsset,
    platform: extracted.platform,
  }));

  await updateAssetService.createUpdateAssets(db, updateAssetData);

  return {
    update,
    assetCount: extractedAssets.length,
  };
}

/** Bundle 上传返回类型 */
export type UploadBundleResult = Awaited<
  ReturnType<typeof uploadBundle>
>;
