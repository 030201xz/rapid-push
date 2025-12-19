/**
 * 权限服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 返回类型由 TypeScript 自动推断，保持 DRY 原则
 */

import { and, eq, isNull } from 'drizzle-orm';
import type { RapidSDatabase as Database } from '../../../../common/database/postgresql/rapid-s';
import { permissions, type NewPermission, type UpdatePermission } from './schema';

// ========== 查询操作 ==========

/** 获取所有活跃权限（排除已删除） */
export async function listPermissions(db: Database) {
  return db.select().from(permissions).where(eq(permissions.isDeleted, false));
}

/** 获取顶级权限（无父权限） */
export async function listRootPermissions(db: Database) {
  return db
    .select()
    .from(permissions)
    .where(
      and(eq(permissions.isDeleted, false), isNull(permissions.parentId)),
    );
}

/** 根据 ID 获取权限 */
export async function getPermissionById(db: Database, id: string) {
  const result = await db
    .select()
    .from(permissions)
    .where(and(eq(permissions.id, id), eq(permissions.isDeleted, false)));
  return result[0] ?? null;
}

/** 根据 code 获取权限 */
export async function getPermissionByCode(db: Database, code: string) {
  const result = await db
    .select()
    .from(permissions)
    .where(and(eq(permissions.code, code), eq(permissions.isDeleted, false)));
  return result[0] ?? null;
}

/** 获取子权限列表 */
export async function getChildPermissions(db: Database, parentId: string) {
  return db
    .select()
    .from(permissions)
    .where(
      and(
        eq(permissions.parentId, parentId),
        eq(permissions.isDeleted, false),
      ),
    );
}

// ========== 写入操作 ==========

/** 创建权限 */
export async function createPermission(db: Database, data: NewPermission) {
  const [permission] = await db.insert(permissions).values(data).returning();
  if (!permission) throw new Error('创建权限失败');
  return permission;
}

/** 更新权限 */
export async function updatePermission(
  db: Database,
  id: string,
  data: UpdatePermission,
) {
  const result = await db
    .update(permissions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(permissions.id, id), eq(permissions.isDeleted, false)))
    .returning();
  return result[0] ?? null;
}

/** 软删除权限 */
export async function deletePermission(db: Database, id: string) {
  const result = await db
    .update(permissions)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(permissions.id, id))
    .returning();
  return result.length > 0;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 权限列表返回类型 */
export type ListPermissionsResult = Awaited<ReturnType<typeof listPermissions>>;

/** 单个权限返回类型（可能为 null） */
export type GetPermissionResult = Awaited<ReturnType<typeof getPermissionById>>;

/** 创建权限返回类型 */
export type CreatePermissionResult = Awaited<ReturnType<typeof createPermission>>;

/** 更新权限返回类型 */
export type UpdatePermissionResult = Awaited<ReturnType<typeof updatePermission>>;

/** 删除权限返回类型 */
export type DeletePermissionResult = Awaited<ReturnType<typeof deletePermission>>;
