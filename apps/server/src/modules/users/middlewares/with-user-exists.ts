/**
 * 用户存在性检查中间件
 *
 * 检查目标用户是否存在，并将用户注入 ctx.targetUser
 * 后续中间件/handler 可直接访问 ctx.targetUser，避免重复查询
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTypedInputMiddleware } from '../../../common/trpc';
import type { BaseContext } from '../../../types';
import type { User } from '../schema';
import * as userService from '../service';

// 输入类型定义
const idInputSchema = z.object({ id: z.number() });
type IdInput = z.infer<typeof idInputSchema>;

// 扩展后的 Context 类型
export type WithTargetUserContext = BaseContext & { targetUser: User };

/**
 * 类型安全的用户存在性检查中间件
 * - 前置依赖：BaseContext（db 可用）
 * - 扩展输出：ctx.targetUser（User 类型）
 */
export const withUserExists = createTypedInputMiddleware<BaseContext, IdInput>()<
  WithTargetUserContext
>(async ({ ctx, input, next }) => {
  // input.id 类型安全，编译时保证
  const parsed = idInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '缺少必需的 id 参数',
    });
  }

  const { id } = parsed.data;
  const targetUser = await userService.getUserById(ctx.db, id);

  if (!targetUser) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `用户 ${id} 不存在`,
    });
  }

  // 扩展 Context，类型安全传递
  return next({ ctx: { ...ctx, targetUser } });
});
