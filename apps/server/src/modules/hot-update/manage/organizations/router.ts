/**
 * 组织模块路由
 *
 * 提供组织 CRUD 和所有权管理接口
 */

import { protectedProcedure, router } from '@/common/trpc';
import { z } from 'zod';
import {
  insertOrganizationSchema,
  updateOrganizationSchema,
} from './schema';
import * as organizationService from './service';

// ========== 输入 Schema ==========
const organizationIdSchema = z.object({ id: z.uuid() });

// ========== 组织路由 ==========
export const organizationsRouter = router({
  // ========== 列表查询 ==========
  /** 获取当前用户拥有的组织列表 */
  listMine: protectedProcedure.query(({ ctx }) =>
    organizationService.listOrganizationsByOwner(ctx.db, ctx.user.id)
  ),

  /** 根据 ID 获取组织详情 */
  byId: protectedProcedure
    .input(organizationIdSchema)
    .query(({ ctx, input }) =>
      organizationService.getOrganizationById(ctx.db, input.id)
    ),

  /** 根据 slug 获取组织详情 */
  bySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      organizationService.getOrganizationBySlug(ctx.db, input.slug)
    ),

  // ========== 创建操作 ==========
  /** 创建组织（自动设置当前用户为所有者） */
  create: protectedProcedure
    .input(insertOrganizationSchema.omit({ ownerId: true }))
    .mutation(({ ctx, input }) =>
      organizationService.createOrganization(ctx.db, {
        ...input,
        ownerId: ctx.user.id,
      })
    ),

  // ========== 更新操作 ==========
  /** 更新组织信息 */
  update: protectedProcedure
    .input(
      organizationIdSchema.extend(updateOrganizationSchema.shape)
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return organizationService.updateOrganization(ctx.db, id, data);
    }),

  // ========== 删除操作 ==========
  /** 删除组织（软删除） */
  delete: protectedProcedure
    .input(organizationIdSchema)
    .mutation(({ ctx, input }) =>
      organizationService.deleteOrganization(ctx.db, input.id)
    ),

  // ========== 所有权管理 ==========
  /** 转让组织所有权 */
  transferOwnership: protectedProcedure
    .input(
      organizationIdSchema.extend({
        newOwnerId: z.uuid(),
      })
    )
    .mutation(({ ctx, input }) =>
      organizationService.transferOwnership(
        ctx.db,
        input.id,
        input.newOwnerId
      )
    ),
});
