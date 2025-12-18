/**
 * Admin Procedure
 * 需要管理员权限才能访问的接口
 */

import { TRPCError } from '@trpc/server';
import { t } from '../init';
import { baseProcedure } from './base';
import type { AdminContext } from '../../../types';

// ========== 管理员认证中间件 ==========
const isAdmin = t.middleware(async ({ ctx, next }) => {
  const user = await ctx.getUser();
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '请先登录' });
  }
  if (user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理员权限' });
  }
  // 类型收窄：user.role 为 admin
  return next({ ctx: { ...ctx, user: { ...user, role: 'admin' as const } } as AdminContext });
});

// ========== Admin Procedure（需管理员权限） ==========
export const adminProcedure = baseProcedure.use(isAdmin);
