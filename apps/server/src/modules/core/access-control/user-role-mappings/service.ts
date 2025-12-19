/**
 * 用户角色映射服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 返回类型由 TypeScript 自动推断，保持 DRY 原则
 */

import { and, eq, gt, isNull, lt, or } from 'drizzle-orm';
import type { RapidSDatabase as Database } from '../../../../common/database/postgresql/rapid-s';
import {
  userRoleMappings,
  type NewUserRoleMapping,
  type UpdateUserRoleMapping,
} from './schema';

// ========== 查询操作 ==========

/** 获取用户的所有角色映射（未撤销） */
export async function getUserRoles(db: Database, userId: string) {
  return db
    .select()
    .from(userRoleMappings)
    .where(
      and(
        eq(userRoleMappings.userId, userId),
        eq(userRoleMappings.isRevoked, false),
      ),
    );
}

/** 获取用户的有效角色映射（当前时间在有效期内） */
export async function getUserActiveRoles(db: Database, userId: string) {
  const now = new Date();
  return db
    .select()
    .from(userRoleMappings)
    .where(
      and(
        eq(userRoleMappings.userId, userId),
        eq(userRoleMappings.isRevoked, false),
        lt(userRoleMappings.effectiveFrom, now),
        or(
          isNull(userRoleMappings.effectiveTo),
          gt(userRoleMappings.effectiveTo, now),
        ),
      ),
    );
}

/** 获取拥有某角色的所有用户映射（未撤销） */
export async function getRoleUsers(db: Database, roleId: string) {
  return db
    .select()
    .from(userRoleMappings)
    .where(
      and(
        eq(userRoleMappings.roleId, roleId),
        eq(userRoleMappings.isRevoked, false),
      ),
    );
}

/** 根据 ID 获取映射 */
export async function getMappingById(db: Database, id: string) {
  const result = await db
    .select()
    .from(userRoleMappings)
    .where(eq(userRoleMappings.id, id));
  return result[0] ?? null;
}

/** 检查用户是否拥有某角色（未撤销且在有效期内） */
export async function hasRole(
  db: Database,
  userId: string,
  roleId: string,
): Promise<boolean> {
  const now = new Date();
  const result = await db
    .select()
    .from(userRoleMappings)
    .where(
      and(
        eq(userRoleMappings.userId, userId),
        eq(userRoleMappings.roleId, roleId),
        eq(userRoleMappings.isRevoked, false),
        lt(userRoleMappings.effectiveFrom, now),
        or(
          isNull(userRoleMappings.effectiveTo),
          gt(userRoleMappings.effectiveTo, now),
        ),
      ),
    );
  return result.length > 0;
}

// ========== 写入操作 ==========

/** 分配角色给用户 */
export async function assignRole(db: Database, data: NewUserRoleMapping) {
  const [mapping] = await db
    .insert(userRoleMappings)
    .values(data)
    .returning();
  if (!mapping) throw new Error('分配角色失败');
  return mapping;
}

/** 更新映射 */
export async function updateMapping(
  db: Database,
  id: string,
  data: UpdateUserRoleMapping,
) {
  const result = await db
    .update(userRoleMappings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(userRoleMappings.id, id))
    .returning();
  return result[0] ?? null;
}

/** 撤销角色 */
export async function revokeRole(db: Database, id: string) {
  const result = await db
    .update(userRoleMappings)
    .set({ isRevoked: true, updatedAt: new Date() })
    .where(eq(userRoleMappings.id, id))
    .returning();
  return result.length > 0;
}

/** 撤销用户的某个角色 */
export async function revokeUserRole(
  db: Database,
  userId: string,
  roleId: string,
) {
  const result = await db
    .update(userRoleMappings)
    .set({ isRevoked: true, updatedAt: new Date() })
    .where(
      and(
        eq(userRoleMappings.userId, userId),
        eq(userRoleMappings.roleId, roleId),
        eq(userRoleMappings.isRevoked, false),
      ),
    )
    .returning();
  return result.length > 0;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 用户角色列表返回类型 */
export type GetUserRolesResult = Awaited<ReturnType<typeof getUserRoles>>;

/** 角色用户列表返回类型 */
export type GetRoleUsersResult = Awaited<ReturnType<typeof getRoleUsers>>;

/** 单个映射返回类型（可能为 null） */
export type GetMappingResult = Awaited<ReturnType<typeof getMappingById>>;

/** 分配角色返回类型 */
export type AssignRoleResult = Awaited<ReturnType<typeof assignRole>>;

/** 撤销角色返回类型 */
export type RevokeRoleResult = Awaited<ReturnType<typeof revokeRole>>;
