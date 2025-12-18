/**
 * 只能操作自己数据的中间件
 *
 * 前置条件（编译时约束）：
 * 1. 必须在 protectedProcedure 之后（ctx.user 存在）
 * 2. 必须在 withUserExists 之后（ctx.targetUser 存在）
 */

import { TRPCError } from '@trpc/server';
import { createTypedMiddleware } from '../../../common/trpc';
import type { User } from '../schema';
import type { AuthContext } from '../../../types';

// 前置依赖的 Context 类型（编译时强制）
type RequiredContext = AuthContext & { targetUser: User };

/**
 * 类型安全的所有权检查中间件
 * - 前置依赖：AuthContext（ctx.user 存在）+ targetUser（ctx.targetUser 存在）
 * - 编译时强制调用顺序：protectedProcedure → withUserExists → withSelfOnly
 */
export const withSelfOnly = createTypedMiddleware<RequiredContext>()(async ({ ctx, next }) => {
  // ctx.user 和 ctx.targetUser 类型安全，无需断言
  if (ctx.user.id !== ctx.targetUser.id) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '只能操作自己的数据',
    });
  }

  return next({ ctx });
});
