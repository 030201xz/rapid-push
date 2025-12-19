/**
 * 更新模块路由
 *
 * 提供更新发布、设置和统计接口
 */

import { protectedProcedure, router } from '@/common/trpc';
import { z } from 'zod';
import { insertUpdateSchema, updateSettingsSchema } from './schema';
import * as updateService from './service';

// ========== 输入 Schema ==========
const updateIdSchema = z.object({ id: z.uuid() });
const channelIdSchema = z.object({ channelId: z.uuid() });

// ========== 更新路由 ==========
export const updatesRouter = router({
  // ========== 列表查询 ==========
  /** 获取渠道下的所有更新 */
  listByChannel: protectedProcedure
    .input(channelIdSchema)
    .query(({ ctx, input }) =>
      updateService.listUpdatesByChannel(ctx.db, input.channelId)
    ),

  /** 获取渠道下指定运行时版本的更新 */
  listByRuntimeVersion: protectedProcedure
    .input(
      z.object({
        channelId: z.uuid(),
        runtimeVersion: z.string(),
      })
    )
    .query(({ ctx, input }) =>
      updateService.listUpdatesByRuntimeVersion(
        ctx.db,
        input.channelId,
        input.runtimeVersion
      )
    ),

  /** 根据 ID 获取更新详情 */
  byId: protectedProcedure
    .input(updateIdSchema)
    .query(({ ctx, input }) =>
      updateService.getUpdateById(ctx.db, input.id)
    ),

  /** 获取渠道最新的启用更新 */
  latestEnabled: protectedProcedure
    .input(
      z.object({
        channelId: z.uuid(),
        runtimeVersion: z.string(),
      })
    )
    .query(({ ctx, input }) =>
      updateService.getLatestEnabledUpdate(
        ctx.db,
        input.channelId,
        input.runtimeVersion
      )
    ),

  // ========== 创建操作 ==========
  /** 创建更新 */
  create: protectedProcedure
    .input(insertUpdateSchema)
    .mutation(({ ctx, input }) =>
      updateService.createUpdate(ctx.db, input)
    ),

  // ========== 更新操作 ==========
  /** 更新设置（启用/禁用、灰度比例等） */
  updateSettings: protectedProcedure
    .input(updateIdSchema.extend(updateSettingsSchema.shape))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return updateService.updateSettings(ctx.db, id, data);
    }),

  // ========== 删除操作 ==========
  /** 删除更新 */
  delete: protectedProcedure
    .input(updateIdSchema)
    .mutation(({ ctx, input }) =>
      updateService.deleteUpdate(ctx.db, input.id)
    ),

  // ========== 回滚操作 ==========
  /** 回滚到指定更新 */
  rollback: protectedProcedure
    .input(z.object({ sourceUpdateId: z.uuid() }))
    .mutation(({ ctx, input }) =>
      updateService.createRollback(ctx.db, input.sourceUpdateId)
    ),

  // ========== 统计操作 ==========
  /** 增加下载次数 */
  incrementDownload: protectedProcedure
    .input(updateIdSchema)
    .mutation(({ ctx, input }) =>
      updateService.incrementDownloadCount(ctx.db, input.id)
    ),

  /** 增加安装次数 */
  incrementInstall: protectedProcedure
    .input(updateIdSchema)
    .mutation(({ ctx, input }) =>
      updateService.incrementInstallCount(ctx.db, input.id)
    ),

  // ========== Bundle 上传 ==========
  /**
   * 上传 Bundle（FormData）
   *
   * FormData 字段：
   * - channelId: 渠道 ID
   * - runtimeVersion: 运行时版本
   * - bundle: ZIP 文件
   * - description?: 更新描述
   * - metadata?: JSON 字符串
   * - extra?: JSON 字符串
   * - rolloutPercentage?: 灰度比例（0-100）
   */
  upload: protectedProcedure
    .input(z.instanceof(FormData))
    .mutation(async ({ ctx, input }) => {
      // 提取 FormData 字段
      const channelId = input.get('channelId');
      const runtimeVersion = input.get('runtimeVersion');
      const bundleFile = input.get('bundle');
      const description = input.get('description');
      const metadata = input.get('metadata');
      const extra = input.get('extra');
      const rolloutPercentage = input.get('rolloutPercentage');

      // 验证必填字段
      if (typeof channelId !== 'string' || !channelId) {
        throw new Error('channelId 是必填字段');
      }
      if (typeof runtimeVersion !== 'string' || !runtimeVersion) {
        throw new Error('runtimeVersion 是必填字段');
      }
      if (!(bundleFile instanceof File)) {
        throw new Error('bundle 必须是文件');
      }

      // 读取文件内容
      const bundleBuffer = Buffer.from(
        await bundleFile.arrayBuffer()
      );

      return updateService.uploadBundle(ctx.db, {
        channelId,
        runtimeVersion,
        description:
          typeof description === 'string' ? description : undefined,
        metadata:
          typeof metadata === 'string'
            ? JSON.parse(metadata)
            : undefined,
        extra:
          typeof extra === 'string' ? JSON.parse(extra) : undefined,
        rolloutPercentage:
          typeof rolloutPercentage === 'string'
            ? parseInt(rolloutPercentage, 10)
            : undefined,
        bundleBuffer,
      });
    }),
});
