/**
 * 更新资源关联服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 管理更新与资源的关联关系
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { and, eq } from 'drizzle-orm';
import {
  updateAssets,
  type NewUpdateAsset,
  type Platform,
} from './schema';

// ========== 查询操作 ==========

/** 获取更新的所有资源关联 */
export async function listAssetsByUpdate(
  db: Database,
  updateId: string
) {
  return db
    .select()
    .from(updateAssets)
    .where(eq(updateAssets.updateId, updateId));
}

/** 获取更新的指定平台资源关联 */
export async function listAssetsByUpdateAndPlatform(
  db: Database,
  updateId: string,
  platform: Platform
) {
  // 获取指定平台和通用资源
  const result = await db
    .select()
    .from(updateAssets)
    .where(eq(updateAssets.updateId, updateId));

  // 过滤：平台匹配或通用资源
  return result.filter(
    asset => asset.platform === platform || asset.platform === null
  );
}

/** 获取更新的启动资源（JS Bundle） */
export async function getLaunchAsset(
  db: Database,
  updateId: string,
  platform: Platform
) {
  const result = await db
    .select()
    .from(updateAssets)
    .where(
      and(
        eq(updateAssets.updateId, updateId),
        eq(updateAssets.isLaunchAsset, true)
      )
    );

  // 优先返回平台特定的启动资源，否则返回通用资源
  const platformSpecific = result.find(a => a.platform === platform);
  if (platformSpecific) return platformSpecific;

  return result.find(a => a.platform === null) ?? null;
}

/** 根据 ID 获取更新资源关联 */
export async function getUpdateAssetById(db: Database, id: string) {
  const result = await db
    .select()
    .from(updateAssets)
    .where(eq(updateAssets.id, id));
  return result[0] ?? null;
}

// ========== 写入操作 ==========

/** 创建更新资源关联 */
export async function createUpdateAsset(
  db: Database,
  data: NewUpdateAsset
) {
  const [updateAsset] = await db
    .insert(updateAssets)
    .values(data)
    .returning();
  if (!updateAsset) throw new Error('创建更新资源关联失败');
  return updateAsset;
}

/** 批量创建更新资源关联 */
export async function createUpdateAssets(
  db: Database,
  dataList: NewUpdateAsset[]
) {
  if (dataList.length === 0) return [];
  return db.insert(updateAssets).values(dataList).returning();
}

/** 删除更新资源关联 */
export async function deleteUpdateAsset(db: Database, id: string) {
  const result = await db
    .delete(updateAssets)
    .where(eq(updateAssets.id, id))
    .returning();
  return result.length > 0;
}

/** 删除更新的所有资源关联 */
export async function deleteAssetsByUpdate(
  db: Database,
  updateId: string
) {
  const result = await db
    .delete(updateAssets)
    .where(eq(updateAssets.updateId, updateId))
    .returning();
  return result.length;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 更新资源列表返回类型 */
export type ListUpdateAssetsResult = Awaited<
  ReturnType<typeof listAssetsByUpdate>
>;

/** 单个更新资源返回类型（可能为 null） */
export type GetUpdateAssetResult = Awaited<
  ReturnType<typeof getUpdateAssetById>
>;

/** 创建更新资源返回类型 */
export type CreateUpdateAssetResult = Awaited<
  ReturnType<typeof createUpdateAsset>
>;

/** 批量创建更新资源返回类型 */
export type CreateUpdateAssetsResult = Awaited<
  ReturnType<typeof createUpdateAssets>
>;
