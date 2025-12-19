/**
 * 组织成员服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 管理用户与组织的多对多关系
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { and, eq } from 'drizzle-orm';
import {
  MEMBER_ROLE,
  organizationMembers,
  type NewOrganizationMember,
  type UpdateOrganizationMember,
} from './schema';

// ========== 查询操作 ==========

/** 获取组织的所有成员 */
export async function listMembersByOrganization(
  db: Database,
  organizationId: string
) {
  return db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.isActive, true)
      )
    );
}

/** 获取用户所属的所有组织 */
export async function listMembershipsByUser(
  db: Database,
  userId: string
) {
  return db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.isActive, true)
      )
    );
}

/** 获取特定组织成员记录 */
export async function getMembership(
  db: Database,
  organizationId: string,
  userId: string
) {
  const result = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    );
  return result[0] ?? null;
}

/** 检查用户是否为组织成员 */
export async function isMember(
  db: Database,
  organizationId: string,
  userId: string
) {
  const membership = await getMembership(db, organizationId, userId);
  return membership !== null && membership.isActive;
}

/** 检查用户是否为组织所有者 */
export async function isOwner(
  db: Database,
  organizationId: string,
  userId: string
) {
  const membership = await getMembership(db, organizationId, userId);
  return membership !== null && membership.role === MEMBER_ROLE.OWNER;
}

/** 检查用户是否为组织管理员（包括所有者） */
export async function isAdmin(
  db: Database,
  organizationId: string,
  userId: string
) {
  const membership = await getMembership(db, organizationId, userId);
  return (
    membership !== null &&
    (membership.role === MEMBER_ROLE.OWNER ||
      membership.role === MEMBER_ROLE.ADMIN)
  );
}

// ========== 写入操作 ==========

/** 添加组织成员 */
export async function addMember(
  db: Database,
  data: NewOrganizationMember
) {
  // 检查是否已存在
  const existing = await getMembership(
    db,
    data.organizationId,
    data.userId
  );
  if (existing) {
    // 如果已存在但被停用，重新激活
    if (!existing.isActive) {
      const [updated] = await db
        .update(organizationMembers)
        .set({
          isActive: true,
          role: data.role ?? MEMBER_ROLE.MEMBER,
          updatedAt: new Date(),
        })
        .where(eq(organizationMembers.id, existing.id))
        .returning();
      return updated!;
    }
    return existing;
  }

  const [member] = await db
    .insert(organizationMembers)
    .values(data)
    .returning();
  if (!member) throw new Error('添加成员失败');
  return member;
}

/** 更新成员信息 */
export async function updateMember(
  db: Database,
  id: string,
  data: UpdateOrganizationMember
) {
  const result = await db
    .update(organizationMembers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizationMembers.id, id))
    .returning();
  return result[0] ?? null;
}

/** 移除成员（软删除） */
export async function removeMember(db: Database, id: string) {
  const result = await db
    .update(organizationMembers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(organizationMembers.id, id))
    .returning();
  return result.length > 0;
}

/** 移除组织成员（通过组织ID和用户ID） */
export async function removeMemberByOrgAndUser(
  db: Database,
  organizationId: string,
  userId: string
) {
  const result = await db
    .update(organizationMembers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    )
    .returning();
  return result.length > 0;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 成员列表返回类型 */
export type ListMembersResult = Awaited<
  ReturnType<typeof listMembersByOrganization>
>;

/** 用户成员资格列表返回类型 */
export type ListMembershipsResult = Awaited<
  ReturnType<typeof listMembershipsByUser>
>;

/** 单个成员返回类型（可能为 null） */
export type GetMembershipResult = Awaited<
  ReturnType<typeof getMembership>
>;

/** 添加成员返回类型 */
export type AddMemberResult = Awaited<ReturnType<typeof addMember>>;

/** 更新成员返回类型 */
export type UpdateMemberResult = Awaited<
  ReturnType<typeof updateMember>
>;
