/**
 * 只能操作自己数据的中间件
 *
 * 使用约定：
 * 1. 必须在 protectedProcedure 之后（ctx.user 存在）
 * 2. 必须在 withUserExists 之后（ctx.targetUser 存在）
 *
 * 使用 tRPC 原生中间件 API，类型自动串联
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../../../common/trpc';
import type { User } from '../schema';
import type { AuthUser } from '@/types/index';

/**
 * 所有权检查中间件
 *
 * - 验证 ctx.user.id === ctx.targetUser.id
 * - 调用顺序：protectedProcedure → withUserExists → withSelfOnly
 *
 * tRPC 原生中间件：类型自动从 procedure 链推断
 */
export const withSelfOnly = middleware(async ({ ctx, next }) => {
  // 类型断言：依赖 protectedProcedure 和 withUserExists 已在链中
  const typedCtx = ctx as unknown as { user: AuthUser; targetUser: User };

  if (typedCtx.user.id !== typedCtx.targetUser.id) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '只能操作自己的数据',
    });
  }

  return next({ ctx });
});
