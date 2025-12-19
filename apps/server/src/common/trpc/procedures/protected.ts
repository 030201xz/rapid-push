/**
 * Protected Procedure
 * 需要用户登录才能访问的接口
 */

import { TRPCError } from '@trpc/server';
import type { AuthContext } from '../../../types/index';
import { t } from '../init';
import { baseProcedure } from './base';

// ========== 认证中间件 ==========
const isAuthed = t.middleware(async ({ ctx, next }) => {
  const auth = await ctx.getAuth();
  if (!auth) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }
  // 类型收窄：后续 procedure 的 ctx 包含 user, jti, sessionId
  return next({
    ctx: {
      ...ctx,
      user: auth.user,
      jti: auth.jti,
      sessionId: auth.sessionId,
    } as AuthContext,
  });
});

// ========== Protected Procedure（需登录） ==========
export const protectedProcedure = baseProcedure.use(isAuthed);
