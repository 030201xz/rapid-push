/**
 * 项目服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { and, eq } from 'drizzle-orm';
import {
  projects,
  type NewProject,
  type UpdateProject,
} from './schema';

// ========== 查询操作 ==========

/** 获取组织下的所有项目（排除已删除） */
export async function listProjectsByOrganization(
  db: Database,
  organizationId: string
) {
  return db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.isDeleted, false)
      )
    );
}

/** 根据 ID 获取项目 */
export async function getProjectById(db: Database, id: string) {
  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.isDeleted, false)));
  return result[0] ?? null;
}

/** 根据组织和 slug 获取项目 */
export async function getProjectBySlug(
  db: Database,
  organizationId: string,
  slug: string
) {
  const result = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.slug, slug),
        eq(projects.isDeleted, false)
      )
    );
  return result[0] ?? null;
}

// ========== 写入操作 ==========

/** 创建项目 */
export async function createProject(db: Database, data: NewProject) {
  const [project] = await db
    .insert(projects)
    .values(data)
    .returning();
  if (!project) throw new Error('创建项目失败');
  return project;
}

/** 更新项目 */
export async function updateProject(
  db: Database,
  id: string,
  data: UpdateProject
) {
  const result = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.isDeleted, false)))
    .returning();
  return result[0] ?? null;
}

/** 软删除项目 */
export async function deleteProject(db: Database, id: string) {
  const result = await db
    .update(projects)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return result.length > 0;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 项目列表返回类型 */
export type ListProjectsResult = Awaited<
  ReturnType<typeof listProjectsByOrganization>
>;

/** 单个项目返回类型（可能为 null） */
export type GetProjectResult = Awaited<
  ReturnType<typeof getProjectById>
>;

/** 创建项目返回类型 */
export type CreateProjectResult = Awaited<
  ReturnType<typeof createProject>
>;

/** 更新项目返回类型 */
export type UpdateProjectResult = Awaited<
  ReturnType<typeof updateProject>
>;

/** 删除项目返回类型 */
export type DeleteProjectResult = Awaited<
  ReturnType<typeof deleteProject>
>;
