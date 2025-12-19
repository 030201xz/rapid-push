/**
 * 用户模块路由
 *
 * 提供用户 CRUD 和状态管理接口
 */

import { z } from 'zod';
import {
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  router,
} from '../../common/trpc';
import { insertUserSchema, updateUserSchema } from './schema';
import * as userService from './service';
import { withUserExists, withSelfOnly } from './middlewares';

// ========== 输入 Schema ==========
const userIdSchema = z.object({ id: z.uuid() });

// ========== 用户路由 ==========
export const usersRouter = router({
  // ========== 公开路由 ==========
  /** 获取所有用户 */
  list: publicProcedure.query(({ ctx }) => userService.listUsers(ctx.db)),

  /** 根据 ID 获取用户 */
  byId: publicProcedure
    .input(userIdSchema)
    .query(({ ctx, input }) => userService.getUserById(ctx.db, input.id)),

  /** 根据用户名获取用户 */
  byUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(({ ctx, input }) =>
      userService.getUserByUsername(ctx.db, input.username),
    ),

  // ========== 受保护路由（需登录） ==========
  /** 获取当前用户信息 */
  me: protectedProcedure.query(({ ctx }) => {
    return userService.getUserById(ctx.db, ctx.user.id);
  }),

  /** 更新当前用户信息 */
  updateMe: protectedProcedure
    .input(updateUserSchema)
    .mutation(({ ctx, input }) => {
      return userService.updateUser(ctx.db, ctx.user.id, input);
    }),

  // ========== 带模块中间件的路由 ==========
  /** 更新指定用户（需验证所有权） */
  update: protectedProcedure
    .input(userIdSchema.extend(updateUserSchema.shape))
    .use(withUserExists)
    .use(withSelfOnly)
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return userService.updateUser(ctx.db, id, data);
    }),

  // ========== 管理员路由 ==========
  /** 删除用户（仅管理员） */
  delete: adminProcedure
    .input(userIdSchema)
    .use(withUserExists)
    .mutation(({ ctx, input }) => {
      return userService.deleteUser(ctx.db, input.id);
    }),

  /** 创建用户（仅管理员） */
  create: adminProcedure
    .input(insertUserSchema)
    .mutation(({ ctx, input }) => userService.createUser(ctx.db, input)),

  /** 激活用户（仅管理员） */
  activate: adminProcedure
    .input(userIdSchema)
    .use(withUserExists)
    .mutation(({ ctx, input }) => userService.activateUser(ctx.db, input.id)),

  /** 锁定用户（仅管理员） */
  lock: adminProcedure
    .input(userIdSchema.extend({ reason: z.string() }))
    .use(withUserExists)
    .mutation(({ ctx, input }) =>
      userService.lockUser(ctx.db, input.id, input.reason),
    ),

  /** 解锁用户（仅管理员） */
  unlock: adminProcedure
    .input(userIdSchema)
    .use(withUserExists)
    .mutation(({ ctx, input }) => userService.unlockUser(ctx.db, input.id)),
});
