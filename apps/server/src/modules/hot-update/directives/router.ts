/**
 * 指令模块路由
 *
 * 提供指令 CRUD 接口
 */

import { protectedProcedure, router } from '@/common/trpc';
import { z } from 'zod';
import {
  insertDirectiveSchema,
  updateDirectiveSchema,
} from './schema';
import * as directiveService from './service';

// ========== 输入 Schema ==========
const directiveIdSchema = z.object({ id: z.uuid() });
const channelIdSchema = z.object({ channelId: z.uuid() });

// ========== 指令路由 ==========
export const directivesRouter = router({
  // ========== 列表查询 ==========
  /** 获取渠道的所有指令 */
  listByChannel: protectedProcedure
    .input(channelIdSchema)
    .query(({ ctx, input }) =>
      directiveService.listDirectivesByChannel(
        ctx.db,
        input.channelId
      )
    ),

  /** 获取渠道指定运行时版本的指令 */
  listByRuntimeVersion: protectedProcedure
    .input(
      z.object({
        channelId: z.uuid(),
        runtimeVersion: z.string(),
      })
    )
    .query(({ ctx, input }) =>
      directiveService.listDirectivesByRuntimeVersion(
        ctx.db,
        input.channelId,
        input.runtimeVersion
      )
    ),

  /** 根据 ID 获取指令详情 */
  byId: protectedProcedure
    .input(directiveIdSchema)
    .query(({ ctx, input }) =>
      directiveService.getDirectiveById(ctx.db, input.id)
    ),

  /** 获取渠道当前激活的指令 */
  activeDirective: protectedProcedure
    .input(
      z.object({
        channelId: z.uuid(),
        runtimeVersion: z.string(),
      })
    )
    .query(({ ctx, input }) =>
      directiveService.getActiveDirective(
        ctx.db,
        input.channelId,
        input.runtimeVersion
      )
    ),

  // ========== 创建操作 ==========
  /** 创建指令 */
  create: protectedProcedure
    .input(insertDirectiveSchema)
    .mutation(({ ctx, input }) =>
      directiveService.createDirective(ctx.db, input)
    ),

  /** 创建回滚到嵌入版本指令 */
  createRollBackToEmbedded: protectedProcedure
    .input(
      z.object({
        channelId: z.uuid(),
        runtimeVersion: z.string(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      directiveService.createRollBackToEmbeddedDirective(
        ctx.db,
        input.channelId,
        input.runtimeVersion,
        input.expiresAt
      )
    ),

  // ========== 更新操作 ==========
  /** 更新指令 */
  update: protectedProcedure
    .input(directiveIdSchema.extend(updateDirectiveSchema.shape))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return directiveService.updateDirective(ctx.db, id, data);
    }),

  /** 停用指令 */
  deactivate: protectedProcedure
    .input(directiveIdSchema)
    .mutation(({ ctx, input }) =>
      directiveService.deactivateDirective(ctx.db, input.id)
    ),

  // ========== 删除操作 ==========
  /** 删除指令 */
  delete: protectedProcedure
    .input(directiveIdSchema)
    .mutation(({ ctx, input }) =>
      directiveService.deleteDirective(ctx.db, input.id)
    ),
});
