/**
 * 组织服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 返回类型由 TypeScript 自动推断，保持 DRY 原则
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { and, eq } from 'drizzle-orm';
import {
  organizations,
  type NewOrganization,
  type UpdateOrganization,
} from './schema';

// ========== 查询操作 ==========

/** 获取所有活跃组织（排除已删除） */
export async function listOrganizations(db: Database) {
  return db
    .select()
    .from(organizations)
    .where(eq(organizations.isDeleted, false));
}

/** 根据 ID 获取组织 */
export async function getOrganizationById(db: Database, id: string) {
  const result = await db
    .select()
    .from(organizations)
    .where(
      and(
        eq(organizations.id, id),
        eq(organizations.isDeleted, false)
      )
    );
  return result[0] ?? null;
}

/** 根据 slug 获取组织 */
export async function getOrganizationBySlug(
  db: Database,
  slug: string
) {
  const result = await db
    .select()
    .from(organizations)
    .where(
      and(
        eq(organizations.slug, slug),
        eq(organizations.isDeleted, false)
      )
    );
  return result[0] ?? null;
}

/** 获取用户拥有的组织列表 */
export async function listOrganizationsByOwner(
  db: Database,
  ownerId: string
) {
  return db
    .select()
    .from(organizations)
    .where(
      and(
        eq(organizations.ownerId, ownerId),
        eq(organizations.isDeleted, false)
      )
    );
}

// ========== 写入操作 ==========

/** 创建组织 */
export async function createOrganization(
  db: Database,
  data: NewOrganization
) {
  const [organization] = await db
    .insert(organizations)
    .values(data)
    .returning();
  if (!organization) throw new Error('创建组织失败');
  return organization;
}

/** 更新组织 */
export async function updateOrganization(
  db: Database,
  id: string,
  data: UpdateOrganization
) {
  const result = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(organizations.id, id),
        eq(organizations.isDeleted, false)
      )
    )
    .returning();
  return result[0] ?? null;
}

/** 软删除组织 */
export async function deleteOrganization(db: Database, id: string) {
  const result = await db
    .update(organizations)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();
  return result.length > 0;
}

/** 转让组织所有权 */
export async function transferOwnership(
  db: Database,
  id: string,
  newOwnerId: string
) {
  const result = await db
    .update(organizations)
    .set({ ownerId: newOwnerId, updatedAt: new Date() })
    .where(
      and(
        eq(organizations.id, id),
        eq(organizations.isDeleted, false)
      )
    )
    .returning();
  return result[0] ?? null;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 组织列表返回类型 */
export type ListOrganizationsResult = Awaited<
  ReturnType<typeof listOrganizations>
>;

/** 单个组织返回类型（可能为 null） */
export type GetOrganizationResult = Awaited<
  ReturnType<typeof getOrganizationById>
>;

/** 创建组织返回类型 */
export type CreateOrganizationResult = Awaited<
  ReturnType<typeof createOrganization>
>;

/** 更新组织返回类型 */
export type UpdateOrganizationResult = Awaited<
  ReturnType<typeof updateOrganization>
>;

/** 删除组织返回类型 */
export type DeleteOrganizationResult = Awaited<
  ReturnType<typeof deleteOrganization>
>;
