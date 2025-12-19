/**
 * Manifest 路由
 *
 * 提供客户端检查更新的 tRPC 接口
 */

import { publicProcedure, router } from '@/common/trpc';
import { checkUpdateRequestSchema } from './schema';
import * as manifestService from './service';

// ========== Manifest 路由 ==========
export const manifestRouter = router({
  /**
   * 检查更新
   *
   * 客户端调用此接口获取最新更新信息
   * 返回：更新 Manifest / 无更新 / 回滚指令
   */
  check: publicProcedure
    .input(checkUpdateRequestSchema)
    .query(async ({ ctx, input }) => {
      // 构建资源 URL 前缀
      // 格式: http://host:port/trpc/hotUpdate.assets.download?input={"hash":"xxx"}
      // 简化为相对路径，客户端拼接
      const assetUrlPrefix = '/assets';

      return manifestService.checkUpdate(
        ctx.db,
        input,
        assetUrlPrefix
      );
    }),
});
