/**
 * 用户存在性检查中间件
 *
 * 检查目标用户是否存在，并将用户注入 ctx.targetUser
 * 后续中间件/handler 可直接访问 ctx.targetUser，避免重复查询
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { t } from '../../../common/trpc/init';
import * as userService from '../service';

const idInputSchema = z.object({ id: z.number() });

export const withUserExists = t.middleware(async ({ ctx, input, next }) => {
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

  return next({ ctx: { ...ctx, targetUser } });
});
