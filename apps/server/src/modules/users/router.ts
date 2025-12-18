import { z } from 'zod';
import {
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  router,
} from '../../common/trpc';
import { insertUserSchema, updateUserSchema } from './schema';
import * as userService from './service';
import { withUserExists, withSelfOnly } from './middleware';

// ========== 用户路由 ==========
export const usersRouter = router({
  // ========== 公开路由 ==========
  /** 获取所有用户 */
  list: publicProcedure.query(({ ctx }) => userService.listUsers(ctx.db)),

  /** 根据 ID 获取用户 */
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => userService.getUserById(ctx.db, input.id)),

  // ========== 受保护路由（需登录） ==========
  /** 获取当前用户信息 */
  me: protectedProcedure.query(({ ctx }) => {
    // ctx.user 类型已收窄，一定存在
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
    .input(z.object({ id: z.number() }).extend(updateUserSchema.shape))
    .use(withUserExists) // 检查用户存在
    .use(withSelfOnly) // 只能改自己
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return userService.updateUser(ctx.db, id, data);
    }),

  // ========== 管理员路由 ==========
  /** 删除用户（仅管理员） */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .use(withUserExists)
    .mutation(({ ctx, input }) => {
      return userService.deleteUser(ctx.db, input.id);
    }),

  /** 创建用户（仅管理员） */
  create: adminProcedure
    .input(insertUserSchema)
    .mutation(({ ctx, input }) => userService.createUser(ctx.db, input)),
});
