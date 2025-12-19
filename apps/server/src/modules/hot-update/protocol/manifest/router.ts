/**
 * Manifest 路由
 *
 * 提供客户端检查更新的 tRPC 接口
 * 符合 Expo Updates v1 协议规范
 */

import { router } from '@/common/trpc';
import { expoManifestProcedure } from '@/common/trpc/procedures/expo-updates';
import { checkUpdateRequestSchema } from './schema';
import * as manifestService from './service';

// ========== Manifest 路由 ==========
export const manifestRouter = router({
  /**
   * 检查更新
   *
   * 客户端调用此接口获取最新更新信息
   * 返回：更新 Manifest / 无更新 / 回滚指令
   *
   * 符合 Expo Updates v1 协议：
   * - 自动处理 expo-protocol-version 等请求头
   * - 自动设置 expo-protocol-version、expo-sfv-version 等响应头
   */
  check: expoManifestProcedure
    .input(checkUpdateRequestSchema)
    .query(async ({ ctx, input }) => {
      // 构建资源 URL 前缀
      // 格式: http://host:port/trpc/hotUpdate.assets.download?input={"hash":"xxx"}
      // 简化为相对路径，客户端拼接
      const assetUrlPrefix = '/assets';

      const result = await manifestService.checkUpdate(
        ctx.db,
        input,
        assetUrlPrefix
      );

      // 如果有更新可用，设置相关响应头
      if (result.type === 'updateAvailable') {
        // 设置 manifest-filters（如果有）
        if (result.manifestFilters) {
          ctx.honoContext.header(
            'expo-manifest-filters',
            result.manifestFilters
          );
        }

        // 设置签名（如果有）
        if (result.signature) {
          ctx.honoContext.header(
            'expo-signature',
            `sig=:${result.signature}:`
          );
        }
      }

      return result;
    }),
});
