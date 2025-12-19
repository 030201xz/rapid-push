/**
 * 用户角色映射模块路由
 *
 * 提供用户角色关联管理接口
 */

import { z } from 'zod';
import {
  adminProcedure,
  protectedProcedure,
  router,
} from '../../common/trpc';
import { insertUserRoleMappingSchema } from './schema';
import * as mappingService from './service';

// ========== 输入 Schema ==========
const userIdSchema = z.object({ userId: z.uuid() });
const roleIdSchema = z.object({ roleId: z.uuid() });
const mappingIdSchema = z.object({ id: z.uuid() });

// ========== 用户角色映射路由 ==========
export const userRoleMappingsRouter = router({
  // ========== 受保护路由 ==========
  /** 获取当前用户的角色 */
  myRoles: protectedProcedure.query(({ ctx }) =>
    mappingService.getUserActiveRoles(ctx.db, ctx.user.id),
  ),

  /** 检查当前用户是否拥有某角色 */
  hasRole: protectedProcedure
    .input(roleIdSchema)
    .query(({ ctx, input }) =>
      mappingService.hasRole(ctx.db, ctx.user.id, input.roleId),
    ),

  // ========== 管理员路由 ==========
  /** 获取用户的所有角色 */
  byUser: adminProcedure
    .input(userIdSchema)
    .query(({ ctx, input }) =>
      mappingService.getUserRoles(ctx.db, input.userId),
    ),

  /** 获取用户的有效角色 */
  activeByUser: adminProcedure
    .input(userIdSchema)
    .query(({ ctx, input }) =>
      mappingService.getUserActiveRoles(ctx.db, input.userId),
    ),

  /** 获取拥有某角色的所有用户 */
  byRole: adminProcedure
    .input(roleIdSchema)
    .query(({ ctx, input }) =>
      mappingService.getRoleUsers(ctx.db, input.roleId),
    ),

  /** 分配角色给用户（仅管理员） */
  assign: adminProcedure
    .input(insertUserRoleMappingSchema)
    .mutation(({ ctx, input }) =>
      mappingService.assignRole(ctx.db, {
        ...input,
        assignedBy: ctx.user.id,
      }),
    ),

  /** 撤销映射（仅管理员） */
  revoke: adminProcedure
    .input(mappingIdSchema)
    .mutation(({ ctx, input }) =>
      mappingService.revokeRole(ctx.db, input.id),
    ),

  /** 撤销用户的某个角色（仅管理员） */
  revokeUserRole: adminProcedure
    .input(userIdSchema.extend(roleIdSchema.shape))
    .mutation(({ ctx, input }) =>
      mappingService.revokeUserRole(ctx.db, input.userId, input.roleId),
    ),
});
