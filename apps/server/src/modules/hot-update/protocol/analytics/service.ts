/**
 * Analytics 服务层
 *
 * 处理事件上报和统计更新
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { eq, sql } from 'drizzle-orm';
import * as channelService from '../../manage/channels/service';
import { updates } from '../../manage/updates/schema';
import {
  ANALYTICS_EVENT_TYPE,
  type ReportEventsInput,
} from './schema';

// ========== 事件处理 ==========

/**
 * 处理批量事件上报
 *
 * @param db - 数据库实例
 * @param input - 上报请求
 * @returns 处理结果
 */
export async function reportEvents(
  db: Database,
  input: ReportEventsInput
): Promise<{ processed: number; errors: string[] }> {
  // 1. 验证渠道
  const channel = await channelService.getChannelByKey(
    db,
    input.channelKey
  );
  if (!channel) {
    throw new Error('渠道不存在或已失效');
  }

  const errors: string[] = [];
  let processed = 0;

  // 2. 聚合统计事件
  const downloadCounts = new Map<string, number>();
  const installCounts = new Map<string, number>();

  for (const event of input.events) {
    try {
      // 按更新 ID 聚合下载和安装计数
      if (event.updateId) {
        switch (event.type) {
          case ANALYTICS_EVENT_TYPE.DOWNLOAD_COMPLETE:
            downloadCounts.set(
              event.updateId,
              (downloadCounts.get(event.updateId) ?? 0) + 1
            );
            break;

          case ANALYTICS_EVENT_TYPE.APPLY_SUCCESS:
            installCounts.set(
              event.updateId,
              (installCounts.get(event.updateId) ?? 0) + 1
            );
            break;
        }
      }

      processed++;
    } catch (error) {
      errors.push(
        `处理事件失败: ${event.type} - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // 3. 批量更新统计
  for (const [updateId, count] of downloadCounts) {
    await db
      .update(updates)
      .set({
        downloadCount: sql`${updates.downloadCount} + ${count}`,
      })
      .where(eq(updates.id, updateId));
  }

  for (const [updateId, count] of installCounts) {
    await db
      .update(updates)
      .set({
        installCount: sql`${updates.installCount} + ${count}`,
      })
      .where(eq(updates.id, updateId));
  }

  return { processed, errors };
}

// ========== 类型导出 ==========

export type ReportEventsResult = Awaited<
  ReturnType<typeof reportEvents>
>;
