/**
 * 资源模块路由
 *
 * 提供资源查询和下载接口
 * 注意：资源创建通常通过 Updates 模块批量处理
 */

import {
  protectedProcedure,
  publicProcedure,
  router,
} from '@/common/trpc';
import { z } from 'zod';
import * as assetService from './service';

// ========== 输入 Schema ==========
const assetIdSchema = z.object({ id: z.uuid() });
const assetHashSchema = z.object({ hash: z.string() });

// ========== 资源路由 ==========
export const assetsRouter = router({
  // ========== 查询操作（需认证） ==========
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

  // ========== 下载操作（公开接口） ==========
  /**
   * 下载资源内容
   *
   * 返回 Base64 编码的资源内容
   * 适用于小型资源（<1MB）
   */
  download: publicProcedure
    .input(assetHashSchema)
    .query(async ({ ctx, input }) => {
      const result = await assetService.getAssetContent(
        ctx.db,
        input.hash
      );

      if (!result) {
        throw new Error('资源不存在');
      }

      // 返回 Base64 编码的内容
      return {
        hash: input.hash,
        contentType: result.contentType,
        size: result.size,
        /** Base64 编码的资源内容 */
        content: result.content.toString('base64'),
      };
    }),

  /**
   * 流式下载资源
   *
   * 使用 async generator 流式返回资源内容
   * 适用于大型资源
   */
  downloadStream: publicProcedure
    .input(assetHashSchema)
    .query(async function* ({ ctx, input }) {
      const result = await assetService.getAssetStream(
        ctx.db,
        input.hash
      );

      if (!result) {
        throw new Error('资源不存在');
      }

      // 先返回元数据
      yield {
        type: 'metadata' as const,
        contentType: result.contentType,
        size: result.size,
      };

      // 流式返回内容块
      const reader = result.stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          yield {
            type: 'chunk' as const,
            /** Base64 编码的数据块 */
            data: Buffer.from(value).toString('base64'),
          };
        }
      } finally {
        reader.releaseLock();
      }

      // 完成标记
      yield { type: 'done' as const };
    }),
});
