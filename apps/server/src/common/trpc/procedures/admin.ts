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
  const auth = await ctx.getAuth();
  if (!auth) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }
  // 检查 roles 数组是否包含管理员角色（admin 或 super_admin）
  const adminRoles = ['admin', 'super_admin'];
  const hasAdminRole = auth.user.roles.some(role =>
    adminRoles.includes(role)
  );
  if (!hasAdminRole) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '需要管理员权限',
    });
  }
  // 类型收窄：roles 包含 admin，同时携带 jti/sessionId
  return next({
    ctx: {
      ...ctx,
      user: auth.user,
      jti: auth.jti,
      sessionId: auth.sessionId,
    } as AdminContext,
  });
});

// ========== Admin Procedure（需管理员权限） ==========
export const adminProcedure = baseProcedure.use(isAdmin);
