/**
 * 灰度规则模块路由
 *
 * 提供灰度规则 CRUD 接口
 */

import { protectedProcedure, router } from '@/common/trpc';
import { z } from 'zod';
import {
  insertRolloutRuleSchema,
  updateRolloutRuleSchema,
} from './schema';
import * as ruleService from './service';

// ========== 输入 Schema ==========
const ruleIdSchema = z.object({ id: z.uuid() });
const updateIdSchema = z.object({ updateId: z.uuid() });

// ========== 灰度规则路由 ==========
export const rolloutRulesRouter = router({
  // ========== 列表查询 ==========
  /** 获取更新的所有灰度规则 */
  listByUpdate: protectedProcedure
    .input(updateIdSchema)
    .query(({ ctx, input }) =>
      ruleService.listRulesByUpdate(ctx.db, input.updateId)
    ),

  /** 获取更新的启用规则 */
  listEnabledByUpdate: protectedProcedure
    .input(updateIdSchema)
    .query(({ ctx, input }) =>
      ruleService.listEnabledRulesByUpdate(ctx.db, input.updateId)
    ),

  /** 根据 ID 获取规则详情 */
  byId: protectedProcedure
    .input(ruleIdSchema)
    .query(({ ctx, input }) =>
      ruleService.getRuleById(ctx.db, input.id)
    ),

  // ========== 创建操作 ==========
  /** 创建灰度规则 */
  create: protectedProcedure
    .input(insertRolloutRuleSchema)
    .mutation(({ ctx, input }) =>
      ruleService.createRule(ctx.db, input)
    ),

  /** 创建百分比灰度规则 */
  createPercentage: protectedProcedure
    .input(
      z.object({
        updateId: z.uuid(),
        percentage: z.number().min(0).max(100),
        priority: z.number().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ruleService.createPercentageRule(
        ctx.db,
        input.updateId,
        input.percentage,
        input.priority
      )
    ),

  /** 创建设备白名单规则 */
  createDeviceId: protectedProcedure
    .input(
      z.object({
        updateId: z.uuid(),
        deviceIds: z.array(z.string()),
        priority: z.number().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ruleService.createDeviceIdRule(
        ctx.db,
        input.updateId,
        input.deviceIds,
        input.priority
      )
    ),

  /** 创建请求头匹配规则 */
  createHeaderMatch: protectedProcedure
    .input(
      z.object({
        updateId: z.uuid(),
        header: z.string(),
        values: z.array(z.string()),
        priority: z.number().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ruleService.createHeaderMatchRule(
        ctx.db,
        input.updateId,
        input.header,
        input.values,
        input.priority
      )
    ),

  // ========== 更新操作 ==========
  /** 更新规则 */
  update: protectedProcedure
    .input(ruleIdSchema.extend(updateRolloutRuleSchema.shape))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ruleService.updateRule(ctx.db, id, data);
    }),

  // ========== 删除操作 ==========
  /** 删除规则 */
  delete: protectedProcedure
    .input(ruleIdSchema)
    .mutation(({ ctx, input }) =>
      ruleService.deleteRule(ctx.db, input.id)
    ),

  /** 删除更新的所有规则 */
  deleteByUpdate: protectedProcedure
    .input(updateIdSchema)
    .mutation(({ ctx, input }) =>
      ruleService.deleteRulesByUpdate(ctx.db, input.updateId)
    ),
});
