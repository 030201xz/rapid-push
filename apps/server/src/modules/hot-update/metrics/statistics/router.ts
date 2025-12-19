/**
 * Statistics 路由
 *
 * 提供统计数据查询的 tRPC 接口
 */

import { protectedProcedure, router } from '@/common/trpc';
import { z } from 'zod';
import * as statisticsService from './service';

// ========== Statistics 路由 ==========
export const statisticsRouter = router({
  /**
   * 获取单个更新的统计
   */
  byUpdate: protectedProcedure
    .input(z.object({ updateId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const stats = await statisticsService.getUpdateStats(
        ctx.db,
        input.updateId
      );

      if (!stats) {
        throw new Error('更新不存在');
      }

      return stats;
    }),

  /**
   * 获取渠道统计摘要
   */
  byChannel: protectedProcedure
    .input(z.object({ channelId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const stats = await statisticsService.getChannelStats(
        ctx.db,
        input.channelId
      );

      if (!stats) {
        throw new Error('渠道不存在');
      }

      return stats;
    }),

  /**
   * 获取渠道更新历史统计
   */
  channelHistory: protectedProcedure
    .input(
      z.object({
        channelId: z.uuid(),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(({ ctx, input }) =>
      statisticsService.getChannelUpdateHistory(
        ctx.db,
        input.channelId,
        input.limit
      )
    ),
});
