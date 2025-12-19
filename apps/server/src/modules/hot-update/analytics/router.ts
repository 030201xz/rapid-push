/**
 * Analytics 路由
 *
 * 提供事件上报的 tRPC 接口
 */

import { publicProcedure, router } from '@/common/trpc';
import { reportEventsSchema } from './schema';
import * as analyticsService from './service';

// ========== Analytics 路由 ==========
export const analyticsRouter = router({
  /**
   * 批量上报事件
   *
   * 公开接口，通过 channelKey 验证
   * 自动聚合并更新下载/安装统计
   */
  report: publicProcedure
    .input(reportEventsSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await analyticsService.reportEvents(ctx.db, input);

      return {
        success: result.errors.length === 0,
        processed: result.processed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    }),
});
