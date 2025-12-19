/**
 * 项目模块路由
 *
 * 提供项目 CRUD 接口
 */

import { protectedProcedure, router } from '@/common/trpc';
import { z } from 'zod';
import { insertProjectSchema, updateProjectSchema } from './schema';
import * as projectService from './service';

// ========== 输入 Schema ==========
const projectIdSchema = z.object({ id: z.uuid() });
const organizationIdSchema = z.object({ organizationId: z.uuid() });

// ========== 项目路由 ==========
export const projectsRouter = router({
  // ========== 列表查询 ==========
  /** 获取组织下的所有项目 */
  listByOrganization: protectedProcedure
    .input(organizationIdSchema)
    .query(({ ctx, input }) =>
      projectService.listProjectsByOrganization(
        ctx.db,
        input.organizationId
      )
    ),

  /** 根据 ID 获取项目详情 */
  byId: protectedProcedure
    .input(projectIdSchema)
    .query(({ ctx, input }) =>
      projectService.getProjectById(ctx.db, input.id)
    ),

  /** 根据组织和 slug 获取项目详情 */
  bySlug: protectedProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        slug: z.string(),
      })
    )
    .query(({ ctx, input }) =>
      projectService.getProjectBySlug(
        ctx.db,
        input.organizationId,
        input.slug
      )
    ),

  // ========== 创建操作 ==========
  /** 创建项目 */
  create: protectedProcedure
    .input(insertProjectSchema)
    .mutation(({ ctx, input }) =>
      projectService.createProject(ctx.db, input)
    ),

  // ========== 更新操作 ==========
  /** 更新项目信息 */
  update: protectedProcedure
    .input(projectIdSchema.extend(updateProjectSchema.shape))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return projectService.updateProject(ctx.db, id, data);
    }),

  // ========== 删除操作 ==========
  /** 删除项目（软删除） */
  delete: protectedProcedure
    .input(projectIdSchema)
    .mutation(({ ctx, input }) =>
      projectService.deleteProject(ctx.db, input.id)
    ),
});
