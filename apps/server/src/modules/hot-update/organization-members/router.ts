/**
 * 组织成员模块路由
 *
 * 提供组织成员管理接口
 */

import { protectedProcedure, router } from '@/common/trpc';
import { z } from 'zod';
import {
  insertOrganizationMemberSchema,
  updateOrganizationMemberSchema,
} from './schema';
import * as memberService from './service';

// ========== 输入 Schema ==========
const memberIdSchema = z.object({ id: z.uuid() });
const organizationIdSchema = z.object({ organizationId: z.uuid() });

// ========== 组织成员路由 ==========
export const organizationMembersRouter = router({
  // ========== 列表查询 ==========
  /** 获取组织的所有成员 */
  listByOrganization: protectedProcedure
    .input(organizationIdSchema)
    .query(({ ctx, input }) =>
      memberService.listMembersByOrganization(
        ctx.db,
        input.organizationId
      )
    ),

  /** 获取当前用户所属的所有组织（成员资格） */
  listMyMemberships: protectedProcedure.query(({ ctx }) =>
    memberService.listMembershipsByUser(ctx.db, ctx.user.id)
  ),

  // ========== 权限检查 ==========
  /** 检查当前用户是否为组织成员 */
  isMember: protectedProcedure
    .input(organizationIdSchema)
    .query(({ ctx, input }) =>
      memberService.isMember(
        ctx.db,
        input.organizationId,
        ctx.user.id
      )
    ),

  /** 检查当前用户是否为组织管理员 */
  isAdmin: protectedProcedure
    .input(organizationIdSchema)
    .query(({ ctx, input }) =>
      memberService.isAdmin(ctx.db, input.organizationId, ctx.user.id)
    ),

  // ========== 成员管理 ==========
  /** 添加组织成员 */
  add: protectedProcedure
    .input(insertOrganizationMemberSchema)
    .mutation(({ ctx, input }) =>
      memberService.addMember(ctx.db, input)
    ),

  /** 更新成员信息 */
  update: protectedProcedure
    .input(
      memberIdSchema.extend(updateOrganizationMemberSchema.shape)
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return memberService.updateMember(ctx.db, id, data);
    }),

  /** 移除成员 */
  remove: protectedProcedure
    .input(memberIdSchema)
    .mutation(({ ctx, input }) =>
      memberService.removeMember(ctx.db, input.id)
    ),

  /** 移除成员（通过组织ID和用户ID） */
  removeByOrgAndUser: protectedProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        userId: z.uuid(),
      })
    )
    .mutation(({ ctx, input }) =>
      memberService.removeMemberByOrgAndUser(
        ctx.db,
        input.organizationId,
        input.userId
      )
    ),
});
