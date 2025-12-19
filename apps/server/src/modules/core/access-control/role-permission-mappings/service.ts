/**
 * 角色权限映射服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 返回类型由 TypeScript 自动推断，保持 DRY 原则
 */

import { and, eq, inArray } from 'drizzle-orm';
import type { RapidSDatabase as Database } from '../../../../common/database/postgresql/rapid-s';
import {
  rolePermissionMappings,
  type NewRolePermissionMapping,
} from './schema';

// ========== 查询操作 ==========

/** 获取角色的所有权限映射 */
export async function getRolePermissions(db: Database, roleId: string) {
  return db
    .select()
    .from(rolePermissionMappings)
    .where(eq(rolePermissionMappings.roleId, roleId));
}

/** 获取多个角色的所有权限映射 */
export async function getRolesPermissions(db: Database, roleIds: string[]) {
  if (roleIds.length === 0) return [];
  return db
    .select()
    .from(rolePermissionMappings)
    .where(inArray(rolePermissionMappings.roleId, roleIds));
}

/** 获取拥有某权限的所有角色映射 */
export async function getPermissionRoles(db: Database, permissionId: string) {
  return db
    .select()
    .from(rolePermissionMappings)
    .where(eq(rolePermissionMappings.permissionId, permissionId));
}

/** 根据 ID 获取映射 */
export async function getMappingById(db: Database, id: string) {
  const result = await db
    .select()
    .from(rolePermissionMappings)
    .where(eq(rolePermissionMappings.id, id));
  return result[0] ?? null;
}

/** 检查角色是否拥有某权限 */
export async function hasPermission(
  db: Database,
  roleId: string,
  permissionId: string,
): Promise<boolean> {
  const result = await db
    .select()
    .from(rolePermissionMappings)
    .where(
      and(
        eq(rolePermissionMappings.roleId, roleId),
        eq(rolePermissionMappings.permissionId, permissionId),
      ),
    );
  return result.length > 0;
}

// ========== 写入操作 ==========

/** 为角色分配权限 */
export async function assignPermission(
  db: Database,
  data: NewRolePermissionMapping,
) {
  const [mapping] = await db
    .insert(rolePermissionMappings)
    .values(data)
    .returning();
  if (!mapping) throw new Error('分配权限失败');
  return mapping;
}

/** 批量为角色分配权限 */
export async function assignPermissions(
  db: Database,
  roleId: string,
  permissionIds: string[],
) {
  if (permissionIds.length === 0) return [];
  const values = permissionIds.map(permissionId => ({
    roleId,
    permissionId,
  }));
  return db.insert(rolePermissionMappings).values(values).returning();
}

/** 移除映射 */
export async function removeMapping(db: Database, id: string) {
  const result = await db
    .delete(rolePermissionMappings)
    .where(eq(rolePermissionMappings.id, id))
    .returning();
  return result.length > 0;
}

/** 移除角色的某个权限 */
export async function removeRolePermission(
  db: Database,
  roleId: string,
  permissionId: string,
) {
  const result = await db
    .delete(rolePermissionMappings)
    .where(
      and(
        eq(rolePermissionMappings.roleId, roleId),
        eq(rolePermissionMappings.permissionId, permissionId),
      ),
    )
    .returning();
  return result.length > 0;
}

/** 移除角色的所有权限 */
export async function removeAllRolePermissions(db: Database, roleId: string) {
  const result = await db
    .delete(rolePermissionMappings)
    .where(eq(rolePermissionMappings.roleId, roleId))
    .returning();
  return result.length;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 角色权限列表返回类型 */
export type GetRolePermissionsResult = Awaited<
  ReturnType<typeof getRolePermissions>
>;

/** 权限角色列表返回类型 */
export type GetPermissionRolesResult = Awaited<
  ReturnType<typeof getPermissionRoles>
>;

/** 单个映射返回类型（可能为 null） */
export type GetMappingResult = Awaited<ReturnType<typeof getMappingById>>;

/** 分配权限返回类型 */
export type AssignPermissionResult = Awaited<
  ReturnType<typeof assignPermission>
>;

/** 移除映射返回类型 */
export type RemoveMappingResult = Awaited<ReturnType<typeof removeMapping>>;
