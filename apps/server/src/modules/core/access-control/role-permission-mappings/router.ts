/**
 * 角色权限映射模块路由
 *
 * 提供角色权限关联管理接口
 */

import { z } from 'zod';
import {
  adminProcedure,
  publicProcedure,
  router,
} from '../../../../common/trpc';
import { insertRolePermissionMappingSchema } from './schema';
import * as mappingService from './service';

// ========== 输入 Schema ==========
const roleIdSchema = z.object({ roleId: z.uuid() });
const permissionIdSchema = z.object({ permissionId: z.uuid() });
const mappingIdSchema = z.object({ id: z.uuid() });

// ========== 角色权限映射路由 ==========
export const rolePermissionMappingsRouter = router({
  // ========== 公开路由 ==========
  /** 获取角色的所有权限 */
  byRole: publicProcedure
    .input(roleIdSchema)
    .query(({ ctx, input }) =>
      mappingService.getRolePermissions(ctx.db, input.roleId)
    ),

  /** 获取拥有某权限的所有角色 */
  byPermission: publicProcedure
    .input(permissionIdSchema)
    .query(({ ctx, input }) =>
      mappingService.getPermissionRoles(ctx.db, input.permissionId)
    ),

  /** 检查角色是否拥有某权限 */
  hasPermission: publicProcedure
    .input(roleIdSchema.extend(permissionIdSchema.shape))
    .query(({ ctx, input }) =>
      mappingService.hasPermission(
        ctx.db,
        input.roleId,
        input.permissionId
      )
    ),

  // ========== 管理员路由 ==========
  /** 为角色分配权限（仅管理员） */
  assign: adminProcedure
    .input(insertRolePermissionMappingSchema)
    .mutation(({ ctx, input }) =>
      mappingService.assignPermission(ctx.db, input)
    ),

  /** 批量为角色分配权限（仅管理员） */
  assignBatch: adminProcedure
    .input(
      roleIdSchema.extend({
        permissionIds: z.array(z.uuid()),
      })
    )
    .mutation(({ ctx, input }) =>
      mappingService.assignPermissions(
        ctx.db,
        input.roleId,
        input.permissionIds
      )
    ),

  /** 移除映射（仅管理员） */
  remove: adminProcedure
    .input(mappingIdSchema)
    .mutation(({ ctx, input }) =>
      mappingService.removeMapping(ctx.db, input.id)
    ),

  /** 移除角色的某个权限（仅管理员） */
  removeRolePermission: adminProcedure
    .input(roleIdSchema.extend(permissionIdSchema.shape))
    .mutation(({ ctx, input }) =>
      mappingService.removeRolePermission(
        ctx.db,
        input.roleId,
        input.permissionId
      )
    ),

  /** 移除角色的所有权限（仅管理员） */
  removeAllRolePermissions: adminProcedure
    .input(roleIdSchema)
    .mutation(({ ctx, input }) =>
      mappingService.removeAllRolePermissions(ctx.db, input.roleId)
    ),
});
