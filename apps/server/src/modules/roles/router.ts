/**
 * 角色模块路由
 *
 * 提供角色 CRUD 接口（仅管理员可操作）
 */

import { z } from 'zod';
import { adminProcedure, publicProcedure, router } from '../../common/trpc';
import { insertRoleSchema, updateRoleSchema } from './schema';
import * as roleService from './service';

// ========== 输入 Schema ==========
const roleIdSchema = z.object({ id: z.uuid() });

// ========== 角色路由 ==========
export const rolesRouter = router({
  // ========== 公开路由 ==========
  /** 获取所有角色 */
  list: publicProcedure.query(({ ctx }) => roleService.listRoles(ctx.db)),

  /** 根据 ID 获取角色 */
  byId: publicProcedure
    .input(roleIdSchema)
    .query(({ ctx, input }) => roleService.getRoleById(ctx.db, input.id)),

  /** 根据 code 获取角色 */
  byCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(({ ctx, input }) => roleService.getRoleByCode(ctx.db, input.code)),

  // ========== 管理员路由 ==========
  /** 创建角色（仅管理员） */
  create: adminProcedure
    .input(insertRoleSchema)
    .mutation(({ ctx, input }) => roleService.createRole(ctx.db, input)),

  /** 更新角色（仅管理员） */
  update: adminProcedure
    .input(roleIdSchema.extend(updateRoleSchema.shape))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return roleService.updateRole(ctx.db, id, data);
    }),

  /** 删除角色（仅管理员，系统角色不可删除） */
  delete: adminProcedure
    .input(roleIdSchema)
    .mutation(({ ctx, input }) => roleService.deleteRole(ctx.db, input.id)),
});
