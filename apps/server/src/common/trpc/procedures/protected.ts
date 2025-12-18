/**
 * Protected Procedure
 * 需要用户登录才能访问的接口
 */

import { TRPCError } from '@trpc/server';
import { t } from '../init';
import { baseProcedure } from './base';
import type { AuthContext } from '../../../types';

// ========== 认证中间件 ==========
const isAuthed = t.middleware(async ({ ctx, next }) => {
  const user = await ctx.getUser();
  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }
  // 类型收窄：后续 procedure 的 ctx.user 一定存在
  return next({ ctx: { ...ctx, user } as AuthContext });
});

// ========== Protected Procedure（需登录） ==========
export const protectedProcedure = baseProcedure.use(isAuthed);
