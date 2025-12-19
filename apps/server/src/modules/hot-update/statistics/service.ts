/**
 * Statistics 服务层
 *
 * 提供统计数据查询
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { desc, eq, sql } from 'drizzle-orm';
import { channels } from '../channels/schema';
import { updates } from '../updates/schema';

// ========== 统计数据类型 ==========

/** 更新统计 */
export interface UpdateStats {
  id: string;
  runtimeVersion: string;
  description: string | null;
  downloadCount: number;
  installCount: number;
  rolloutPercentage: number;
  isEnabled: boolean;
  createdAt: Date;
}

/** 渠道统计 */
export interface ChannelStats {
  channelId: string;
  channelName: string;
  totalUpdates: number;
  totalDownloads: number;
  totalInstalls: number;
  latestUpdate: UpdateStats | null;
}

// ========== 查询操作 ==========

/**
 * 获取单个更新的统计
 */
export async function getUpdateStats(
  db: Database,
  updateId: string
): Promise<UpdateStats | null> {
  const [update] = await db
    .select({
      id: updates.id,
      runtimeVersion: updates.runtimeVersion,
      description: updates.description,
      downloadCount: updates.downloadCount,
      installCount: updates.installCount,
      rolloutPercentage: updates.rolloutPercentage,
      isEnabled: updates.isEnabled,
      createdAt: updates.createdAt,
    })
    .from(updates)
    .where(eq(updates.id, updateId));

  return update ?? null;
}

/**
 * 获取渠道的统计摘要
 */
export async function getChannelStats(
  db: Database,
  channelId: string
): Promise<ChannelStats | null> {
  // 获取渠道信息
  const [channel] = await db
    .select({
      id: channels.id,
      name: channels.name,
    })
    .from(channels)
    .where(eq(channels.id, channelId));

  if (!channel) return null;

  // 聚合统计
  const [stats] = await db
    .select({
      totalUpdates: sql<number>`count(*)::int`,
      totalDownloads: sql<number>`coalesce(sum(${updates.downloadCount}), 0)::int`,
      totalInstalls: sql<number>`coalesce(sum(${updates.installCount}), 0)::int`,
    })
    .from(updates)
    .where(eq(updates.channelId, channelId));

  // 获取最新更新
  const [latestUpdate] = await db
    .select({
      id: updates.id,
      runtimeVersion: updates.runtimeVersion,
      description: updates.description,
      downloadCount: updates.downloadCount,
      installCount: updates.installCount,
      rolloutPercentage: updates.rolloutPercentage,
      isEnabled: updates.isEnabled,
      createdAt: updates.createdAt,
    })
    .from(updates)
    .where(eq(updates.channelId, channelId))
    .orderBy(desc(updates.createdAt))
    .limit(1);

  return {
    channelId: channel.id,
    channelName: channel.name,
    totalUpdates: stats?.totalUpdates ?? 0,
    totalDownloads: stats?.totalDownloads ?? 0,
    totalInstalls: stats?.totalInstalls ?? 0,
    latestUpdate: latestUpdate ?? null,
  };
}

/**
 * 获取渠道更新历史统计
 */
export async function getChannelUpdateHistory(
  db: Database,
  channelId: string,
  limit = 10
): Promise<UpdateStats[]> {
  return db
    .select({
      id: updates.id,
      runtimeVersion: updates.runtimeVersion,
      description: updates.description,
      downloadCount: updates.downloadCount,
      installCount: updates.installCount,
      rolloutPercentage: updates.rolloutPercentage,
      isEnabled: updates.isEnabled,
      createdAt: updates.createdAt,
    })
    .from(updates)
    .where(eq(updates.channelId, channelId))
    .orderBy(desc(updates.createdAt))
    .limit(limit);
}

// ========== 类型导出 ==========

export type GetUpdateStatsResult = Awaited<
  ReturnType<typeof getUpdateStats>
>;
export type GetChannelStatsResult = Awaited<
  ReturnType<typeof getChannelStats>
>;
export type GetChannelHistoryResult = Awaited<
  ReturnType<typeof getChannelUpdateHistory>
>;
