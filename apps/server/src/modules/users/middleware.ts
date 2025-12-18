import { TRPCError } from '@trpc/server';
import { middleware } from '../../common/trpc';
import * as userService from './service';

// ========== 用户存在性检查中间件 ==========
// 用于需要校验用户是否存在的操作（如更新、删除）
export const withUserExists = middleware(async ({ ctx, input, next }) => {
  const { id } = input as { id: number };
  const user = await userService.getUserById(ctx.db, id);

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `用户 ${id} 不存在`,
    });
  }

  // 将查询到的用户注入上下文，避免后续重复查询
  return next({ ctx: { ...ctx, targetUser: user } });
});

// ========== 只能操作自己的数据 ==========
export const withSelfOnly = middleware(async ({ ctx, input, next }) => {
  const { id } = input as { id: number };
  // ctx.user 来自 protectedProcedure
  if ('user' in ctx && (ctx.user as { id: number }).id !== id) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '只能操作自己的数据',
    });
  }
  return next();
});
