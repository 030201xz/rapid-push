/**
 * 权限模块路由
 *
 * 提供权限 CRUD 接口（仅管理员可操作）
 */

import { z } from 'zod';
import {
  adminProcedure,
  publicProcedure,
  router,
} from '../../../../common/trpc';
import {
  insertPermissionSchema,
  updatePermissionSchema,
} from './schema';
import * as permissionService from './service';

// ========== 输入 Schema ==========
const permissionIdSchema = z.object({ id: z.uuid() });

// ========== 权限路由 ==========
export const permissionsRouter = router({
  // ========== 公开路由 ==========
  /** 获取所有权限 */
  list: publicProcedure.query(({ ctx }) =>
    permissionService.listPermissions(ctx.db)
  ),

  /** 获取顶级权限（无父权限） */
  roots: publicProcedure.query(({ ctx }) =>
    permissionService.listRootPermissions(ctx.db)
  ),

  /** 根据 ID 获取权限 */
  byId: publicProcedure
    .input(permissionIdSchema)
    .query(({ ctx, input }) =>
      permissionService.getPermissionById(ctx.db, input.id)
    ),

  /** 根据 code 获取权限 */
  byCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(({ ctx, input }) =>
      permissionService.getPermissionByCode(ctx.db, input.code)
    ),

  /** 获取子权限列表 */
  children: publicProcedure
    .input(z.object({ parentId: z.uuid() }))
    .query(({ ctx, input }) =>
      permissionService.getChildPermissions(ctx.db, input.parentId)
    ),

  // ========== 管理员路由 ==========
  /** 创建权限（仅管理员） */
  create: adminProcedure
    .input(insertPermissionSchema)
    .mutation(({ ctx, input }) =>
      permissionService.createPermission(ctx.db, input)
    ),

  /** 更新权限（仅管理员） */
  update: adminProcedure
    .input(permissionIdSchema.extend(updatePermissionSchema.shape))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return permissionService.updatePermission(ctx.db, id, data);
    }),

  /** 删除权限（仅管理员） */
  delete: adminProcedure
    .input(permissionIdSchema)
    .mutation(({ ctx, input }) =>
      permissionService.deletePermission(ctx.db, input.id)
    ),
});
