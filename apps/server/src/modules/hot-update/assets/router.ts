/**
 * 资源模块路由
 *
 * 提供资源查询接口
 * 注意：资源创建通常通过 Updates 模块批量处理
 */

import { protectedProcedure, router } from '@/common/trpc';
import { z } from 'zod';
import * as assetService from './service';

// ========== 输入 Schema ==========
const assetIdSchema = z.object({ id: z.uuid() });
const assetHashSchema = z.object({ hash: z.string() });

// ========== 资源路由 ==========
export const assetsRouter = router({
  // ========== 查询操作 ==========
  /** 获取所有资源 */
  list: protectedProcedure.query(({ ctx }) =>
    assetService.listAssets(ctx.db)
  ),

  /** 根据 ID 获取资源 */
  byId: protectedProcedure
    .input(assetIdSchema)
    .query(({ ctx, input }) =>
      assetService.getAssetById(ctx.db, input.id)
    ),

  /** 根据哈希获取资源 */
  byHash: protectedProcedure
    .input(assetHashSchema)
    .query(({ ctx, input }) =>
      assetService.getAssetByHash(ctx.db, input.hash)
    ),

  /** 批量根据哈希获取资源 */
  byHashes: protectedProcedure
    .input(z.object({ hashes: z.array(z.string()) }))
    .query(({ ctx, input }) =>
      assetService.getAssetsByHashes(ctx.db, input.hashes)
    ),
});
