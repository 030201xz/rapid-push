/**
 * 用户存在性检查中间件
 *
 * 检查目标用户是否存在，并将用户注入 ctx.targetUser
 * 后续中间件/handler 可直接访问 ctx.targetUser，避免重复查询
 *
 * 使用 tRPC 原生中间件 API，类型自动串联
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../../../common/trpc';
import type { User } from '../schema';
import * as userService from '../service';

/**
 * 用户存在性检查中间件
 *
 * - 要求 input 包含 id: string (UUID)
 * - 扩展 ctx.targetUser（User 类型）
 *
 * tRPC 原生中间件：类型自动从 procedure 链推断
 */
export const withUserExists = middleware(async ({ ctx, input, next }) => {
  // 类型断言：中间件依赖 .input(z.object({ id: z.string().uuid() })) 已在 procedure 中定义
  const { id } = input as { id: string };

  const targetUser = await userService.getUserById(ctx.db, id);

  if (!targetUser) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `用户 ${id} 不存在`,
    });
  }

  // 扩展 Context，tRPC 自动推断后续 ctx.targetUser 类型
  return next({ ctx: { ...ctx, targetUser } });
});

/** 扩展后的 Context 类型（供外部显式使用） */
export type WithTargetUserContext = { targetUser: User };
