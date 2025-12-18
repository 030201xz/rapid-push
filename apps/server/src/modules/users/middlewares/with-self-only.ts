/**
 * 只能操作自己数据的中间件
 *
 * 前置条件：
 * 1. 必须在 protectedProcedure 之后（ctx.user 存在）
 * 2. 必须在 withUserExists 之后（ctx.targetUser 存在）
 */

import { TRPCError } from '@trpc/server';
import { t } from '../../../common/trpc/init';
import type { User } from '../schema';
import type { AuthContext } from '../../../types';

export const withSelfOnly = t.middleware(async ({ ctx, next }) => {
  const authCtx = ctx as AuthContext & { targetUser?: User };

  if (!authCtx.targetUser) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'withSelfOnly 必须在 withUserExists 之后使用',
    });
  }

  if (!authCtx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }

  if (authCtx.user.id !== authCtx.targetUser.id) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '只能操作自己的数据',
    });
  }

  return next();
});
