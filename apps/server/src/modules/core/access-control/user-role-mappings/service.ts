/**
 * 用户角色映射服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 返回类型由 TypeScript 自动推断，保持 DRY 原则
 */

import { and, eq, gt, inArray, isNull, lt, or } from 'drizzle-orm';
import type { RapidSDatabase as Database } from '../../../../common/database/postgresql/rapid-s';
import {
  ORG_ADMIN_ROLES,
  ORG_ROLE_CODE,
  SCOPE_TYPE,
  type OrgRoleCode,
} from '../constants';
import { roles } from '../roles/schema';
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
        eq(userRoleMappings.isRevoked, false)
      )
    );
}

/** 获取用户的有效角色映射（当前时间在有效期内） */
export async function getUserActiveRoles(
  db: Database,
  userId: string
) {
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
          gt(userRoleMappings.effectiveTo, now)
        )
      )
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
        eq(userRoleMappings.isRevoked, false)
      )
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
  roleId: string
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
          gt(userRoleMappings.effectiveTo, now)
        )
      )
    );
  return result.length > 0;
}

// ========== 写入操作 ==========

/** 分配角色给用户 */
export async function assignRole(
  db: Database,
  data: NewUserRoleMapping
) {
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
  data: UpdateUserRoleMapping
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
  roleId: string
) {
  const result = await db
    .update(userRoleMappings)
    .set({ isRevoked: true, updatedAt: new Date() })
    .where(
      and(
        eq(userRoleMappings.userId, userId),
        eq(userRoleMappings.roleId, roleId),
        eq(userRoleMappings.isRevoked, false)
      )
    )
    .returning();
  return result.length > 0;
}

// ========== 组织成员查询 ==========

/** 构建有效角色的通用过滤条件 */
function buildActiveRoleConditions() {
  const now = new Date();
  return and(
    eq(userRoleMappings.isRevoked, false),
    lt(userRoleMappings.effectiveFrom, now),
    or(
      isNull(userRoleMappings.effectiveTo),
      gt(userRoleMappings.effectiveTo, now)
    )
  );
}

/** 获取用户在特定组织的角色 */
export async function getUserOrgRoles(
  db: Database,
  userId: string,
  organizationId: string
) {
  return db
    .select({
      mapping: userRoleMappings,
      role: roles,
    })
    .from(userRoleMappings)
    .innerJoin(roles, eq(userRoleMappings.roleId, roles.id))
    .where(
      and(
        eq(userRoleMappings.userId, userId),
        eq(userRoleMappings.scopeType, SCOPE_TYPE.ORGANIZATION),
        eq(userRoleMappings.scopeId, organizationId),
        buildActiveRoleConditions()
      )
    );
}

/** 检查用户是否为组织成员 (拥有任意 org:* 角色) */
export async function isOrgMember(
  db: Database,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const result = await getUserOrgRoles(db, userId, organizationId);
  return result.length > 0;
}

/** 检查用户是否为组织管理员 (org:owner | org:admin) */
export async function isOrgAdmin(
  db: Database,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const result = await db
    .select({ id: userRoleMappings.id })
    .from(userRoleMappings)
    .innerJoin(roles, eq(userRoleMappings.roleId, roles.id))
    .where(
      and(
        eq(userRoleMappings.userId, userId),
        eq(userRoleMappings.scopeType, SCOPE_TYPE.ORGANIZATION),
        eq(userRoleMappings.scopeId, organizationId),
        inArray(roles.code, [...ORG_ADMIN_ROLES]),
        buildActiveRoleConditions()
      )
    )
    .limit(1);
  return result.length > 0;
}

/** 检查用户是否为组织所有者 */
export async function isOrgOwner(
  db: Database,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const result = await db
    .select({ id: userRoleMappings.id })
    .from(userRoleMappings)
    .innerJoin(roles, eq(userRoleMappings.roleId, roles.id))
    .where(
      and(
        eq(userRoleMappings.userId, userId),
        eq(userRoleMappings.scopeType, SCOPE_TYPE.ORGANIZATION),
        eq(userRoleMappings.scopeId, organizationId),
        eq(roles.code, ORG_ROLE_CODE.OWNER),
        buildActiveRoleConditions()
      )
    )
    .limit(1);
  return result.length > 0;
}

// ========== 组织成员管理 ==========

/** 分配组织角色 */
export async function assignOrgRole(
  db: Database,
  data: {
    userId: string;
    organizationId: string;
    roleCode: OrgRoleCode;
    assignedBy?: string;
    assignReason?: string;
  }
) {
  // 查询角色 ID
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, data.roleCode));

  if (!role) {
    throw new Error(`角色不存在: ${data.roleCode}`);
  }

  // 插入映射
  const [mapping] = await db
    .insert(userRoleMappings)
    .values({
      userId: data.userId,
      roleId: role.id,
      scopeType: SCOPE_TYPE.ORGANIZATION,
      scopeId: data.organizationId,
      assignedBy: data.assignedBy,
      assignReason: data.assignReason,
    })
    .returning();

  if (!mapping) throw new Error('分配组织角色失败');
  return mapping;
}

/** 撤销用户的组织角色 */
export async function revokeOrgRole(
  db: Database,
  userId: string,
  organizationId: string,
  roleCode?: OrgRoleCode
) {
  // 构建基础条件
  const conditions = [
    eq(userRoleMappings.userId, userId),
    eq(userRoleMappings.scopeType, SCOPE_TYPE.ORGANIZATION),
    eq(userRoleMappings.scopeId, organizationId),
    eq(userRoleMappings.isRevoked, false),
  ];

  // 如果指定角色码，则追加过滤
  if (roleCode) {
    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, roleCode));

    if (role) {
      conditions.push(eq(userRoleMappings.roleId, role.id));
    }
  }

  const result = await db
    .update(userRoleMappings)
    .set({ isRevoked: true, updatedAt: new Date() })
    .where(and(...conditions))
    .returning();

  return result.length > 0;
}

/** 获取组织的所有成员 (带角色信息) */
export async function listOrgMembers(
  db: Database,
  organizationId: string
) {
  return db
    .select({
      mapping: userRoleMappings,
      role: roles,
    })
    .from(userRoleMappings)
    .innerJoin(roles, eq(userRoleMappings.roleId, roles.id))
    .where(
      and(
        eq(userRoleMappings.scopeType, SCOPE_TYPE.ORGANIZATION),
        eq(userRoleMappings.scopeId, organizationId),
        buildActiveRoleConditions()
      )
    );
}

/** 获取用户所属的所有组织 ID */
export async function listUserOrganizations(
  db: Database,
  userId: string
) {
  const result = await db
    .select({ scopeId: userRoleMappings.scopeId })
    .from(userRoleMappings)
    .where(
      and(
        eq(userRoleMappings.userId, userId),
        eq(userRoleMappings.scopeType, SCOPE_TYPE.ORGANIZATION),
        buildActiveRoleConditions()
      )
    );
  // 过滤 null 并去重
  return [
    ...new Set(result.map(r => r.scopeId).filter(Boolean)),
  ] as string[];
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 用户角色列表返回类型 */
export type GetUserRolesResult = Awaited<
  ReturnType<typeof getUserRoles>
>;

/** 角色用户列表返回类型 */
export type GetRoleUsersResult = Awaited<
  ReturnType<typeof getRoleUsers>
>;

/** 单个映射返回类型（可能为 null） */
export type GetMappingResult = Awaited<
  ReturnType<typeof getMappingById>
>;

/** 分配角色返回类型 */
export type AssignRoleResult = Awaited<ReturnType<typeof assignRole>>;

/** 撤销角色返回类型 */
export type RevokeRoleResult = Awaited<ReturnType<typeof revokeRole>>;

/** 用户组织角色列表返回类型 */
export type GetUserOrgRolesResult = Awaited<
  ReturnType<typeof getUserOrgRoles>
>;

/** 组织成员列表返回类型 */
export type ListOrgMembersResult = Awaited<
  ReturnType<typeof listOrgMembers>
>;

/** 分配组织角色返回类型 */
export type AssignOrgRoleResult = Awaited<
  ReturnType<typeof assignOrgRole>
>;

/** 用户所属组织列表返回类型 */
export type ListUserOrganizationsResult = Awaited<
  ReturnType<typeof listUserOrganizations>
>;
