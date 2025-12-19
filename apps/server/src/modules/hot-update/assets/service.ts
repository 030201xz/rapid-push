/**
 * 资源服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 特点：内容寻址存储，相同哈希的资源只存储一次
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { eq } from 'drizzle-orm';
import { assets, type NewAsset } from './schema';

// ========== 查询操作 ==========

/** 获取所有资源 */
export async function listAssets(db: Database) {
  return db.select().from(assets);
}

/** 根据 ID 获取资源 */
export async function getAssetById(db: Database, id: string) {
  const result = await db
    .select()
    .from(assets)
    .where(eq(assets.id, id));
  return result[0] ?? null;
}

/** 根据哈希获取资源（内容寻址） */
export async function getAssetByHash(db: Database, hash: string) {
  const result = await db
    .select()
    .from(assets)
    .where(eq(assets.hash, hash));
  return result[0] ?? null;
}

/** 批量根据哈希获取资源 */
export async function getAssetsByHashes(
  db: Database,
  hashes: string[]
) {
  if (hashes.length === 0) return [];
  const result = await db.select().from(assets);
  // 手动过滤，避免 IN 查询的性能问题
  return result.filter(asset => hashes.includes(asset.hash));
}

// ========== 写入操作 ==========

/** 创建资源（如果已存在相同哈希则返回现有资源） */
export async function createAsset(db: Database, data: NewAsset) {
  // 先检查是否已存在
  const existing = await getAssetByHash(db, data.hash);
  if (existing) return existing;

  const [asset] = await db.insert(assets).values(data).returning();
  if (!asset) throw new Error('创建资源失败');
  return asset;
}

/** 批量创建资源（跳过已存在的） */
export async function createAssets(
  db: Database,
  dataList: NewAsset[]
) {
  if (dataList.length === 0) return [];

  // 获取所有已存在的哈希
  const existingHashes = new Set(
    (
      await getAssetsByHashes(
        db,
        dataList.map(d => d.hash)
      )
    ).map(a => a.hash)
  );

  // 过滤掉已存在的
  const newAssets = dataList.filter(d => !existingHashes.has(d.hash));
  if (newAssets.length === 0) {
    // 全部已存在，返回已有资源
    return db.select().from(assets);
  }

  const result = await db
    .insert(assets)
    .values(newAssets)
    .returning();
  return result;
}

/** 删除资源（物理删除，谨慎使用） */
export async function deleteAsset(db: Database, id: string) {
  const result = await db
    .delete(assets)
    .where(eq(assets.id, id))
    .returning();
  return result.length > 0;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 资源列表返回类型 */
export type ListAssetsResult = Awaited<ReturnType<typeof listAssets>>;

/** 单个资源返回类型（可能为 null） */
export type GetAssetResult = Awaited<ReturnType<typeof getAssetById>>;

/** 创建资源返回类型 */
export type CreateAssetResult = Awaited<
  ReturnType<typeof createAsset>
>;

/** 删除资源返回类型 */
export type DeleteAssetResult = Awaited<
  ReturnType<typeof deleteAsset>
>;
