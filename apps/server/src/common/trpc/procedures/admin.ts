/**
 * Admin Procedure
 * 需要管理员权限才能访问的接口
 */

import { TRPCError } from '@trpc/server';
import type { AdminContext } from '../../../types/index';
import { t } from '../init';
import { baseProcedure } from './base';

// ========== 管理员认证中间件 ==========
const isAdmin = t.middleware(async ({ ctx, next }) => {
  const user = await ctx.getUser();
  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }
  // 检查 roles 数组是否包含 admin
  if (!user.roles.includes('admin')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '需要管理员权限',
    });
  }
  // 类型收窄：roles 包含 admin
  return next({ ctx: { ...ctx, user } as AdminContext });
});

// ========== Admin Procedure（需管理员权限） ==========
export const adminProcedure = baseProcedure.use(isAdmin);
