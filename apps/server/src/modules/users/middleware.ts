import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { middleware } from '../../common/trpc';
import * as userService from './service';
import type { User } from './schema';

// ========== 中间件输入验证 Schema ==========
const idInputSchema = z.object({ id: z.number() });

// ========== 扩展 Context 类型：注入目标用户 ==========
export interface WithTargetUser {
  targetUser: User;
}

// ========== 用户存在性检查中间件 ==========
// 用于需要校验用户是否存在的操作（如更新、删除）
export const withUserExists = middleware(async ({ ctx, input, next }) => {
  // 运行时验证 input，确保类型安全
  const parsed = idInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '缺少必需的 id 参数',
    });
  }
  
  const { id } = parsed.data;
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
// 注意：此中间件必须在 protectedProcedure 之后使用，ctx.user 已存在
export const withSelfOnly = middleware(async ({ ctx, input, next }) => {
  const parsed = idInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '缺少必需的 id 参数',
    });
  }
  
  const { id } = parsed.data;
  // 类型守卫：运行时检查 ctx 是否包含 user（由 protectedProcedure 注入）
  if (!('user' in ctx) || !(ctx as { user?: { id: number } }).user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }
  
  const user = (ctx as { user: { id: number } }).user;
  if (user.id !== id) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '只能操作自己的数据',
    });
  }
  return next();
});
