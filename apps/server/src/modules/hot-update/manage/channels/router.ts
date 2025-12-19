/**
 * 渠道模块路由
 *
 * 提供渠道 CRUD 和密钥管理接口
 */

import { protectedProcedure, router } from '@/common/trpc';
import { z } from 'zod';
import { insertChannelSchema, updateChannelSchema } from './schema';
import * as channelService from './service';

// ========== 输入 Schema ==========
const channelIdSchema = z.object({ id: z.uuid() });
const projectIdSchema = z.object({ projectId: z.uuid() });

// ========== 渠道路由 ==========
export const channelsRouter = router({
  // ========== 列表查询 ==========
  /** 获取项目下的所有渠道 */
  listByProject: protectedProcedure
    .input(projectIdSchema)
    .query(({ ctx, input }) =>
      channelService.listChannelsByProject(ctx.db, input.projectId)
    ),

  /** 根据 ID 获取渠道详情 */
  byId: protectedProcedure
    .input(channelIdSchema)
    .query(({ ctx, input }) =>
      channelService.getChannelById(ctx.db, input.id)
    ),

  /** 根据 channelKey 获取渠道（用于验证） */
  byKey: protectedProcedure
    .input(z.object({ channelKey: z.string() }))
    .query(({ ctx, input }) =>
      channelService.getChannelByKey(ctx.db, input.channelKey)
    ),

  /** 根据项目和名称获取渠道 */
  byName: protectedProcedure
    .input(
      z.object({
        projectId: z.uuid(),
        name: z.string(),
      })
    )
    .query(({ ctx, input }) =>
      channelService.getChannelByName(
        ctx.db,
        input.projectId,
        input.name
      )
    ),

  // ========== 创建操作 ==========
  /** 创建渠道 */
  create: protectedProcedure
    .input(insertChannelSchema)
    .mutation(({ ctx, input }) =>
      channelService.createChannel(ctx.db, input)
    ),

  // ========== 更新操作 ==========
  /** 更新渠道信息 */
  update: protectedProcedure
    .input(channelIdSchema.extend(updateChannelSchema.shape))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return channelService.updateChannel(ctx.db, id, data);
    }),

  // ========== 删除操作 ==========
  /** 删除渠道（软删除） */
  delete: protectedProcedure
    .input(channelIdSchema)
    .mutation(({ ctx, input }) =>
      channelService.deleteChannel(ctx.db, input.id)
    ),

  // ========== 密钥管理 ==========
  /** 重新生成渠道密钥 */
  regenerateKey: protectedProcedure
    .input(channelIdSchema)
    .mutation(({ ctx, input }) =>
      channelService.regenerateChannelKey(ctx.db, input.id)
    ),

  /** 设置代码签名密钥对 */
  setSigningKeys: protectedProcedure
    .input(
      channelIdSchema.extend({
        privateKey: z.string(),
        publicKey: z.string(),
      })
    )
    .mutation(({ ctx, input }) =>
      channelService.setSigningKeys(
        ctx.db,
        input.id,
        input.privateKey,
        input.publicKey
      )
    ),

  /** 禁用代码签名 */
  disableSigning: protectedProcedure
    .input(channelIdSchema)
    .mutation(({ ctx, input }) =>
      channelService.disableSigning(ctx.db, input.id)
    ),

  /** 获取渠道公钥 */
  getPublicKey: protectedProcedure
    .input(channelIdSchema)
    .query(({ ctx, input }) =>
      channelService.getPublicKey(ctx.db, input.id)
    ),
});
