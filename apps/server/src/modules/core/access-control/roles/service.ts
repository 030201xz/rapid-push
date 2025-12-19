/**
 * 角色服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 返回类型由 TypeScript 自动推断，保持 DRY 原则
 */

import { and, eq } from 'drizzle-orm';
import type { RapidSDatabase as Database } from '../../../../common/database/postgresql/rapid-s';
import { roles, type NewRole, type UpdateRole } from './schema';

// ========== 查询操作 ==========

/** 获取所有活跃角色（排除已删除） */
export async function listRoles(db: Database) {
  return db.select().from(roles).where(eq(roles.isDeleted, false));
}

/** 根据 ID 获取角色 */
export async function getRoleById(db: Database, id: string) {
  const result = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), eq(roles.isDeleted, false)));
  return result[0] ?? null;
}

/** 根据 code 获取角色 */
export async function getRoleByCode(db: Database, code: string) {
  const result = await db
    .select()
    .from(roles)
    .where(and(eq(roles.code, code), eq(roles.isDeleted, false)));
  return result[0] ?? null;
}

// ========== 写入操作 ==========

/** 创建角色 */
export async function createRole(db: Database, data: NewRole) {
  const [role] = await db.insert(roles).values(data).returning();
  if (!role) throw new Error('创建角色失败');
  return role;
}

/** 更新角色 */
export async function updateRole(
  db: Database,
  id: string,
  data: UpdateRole
) {
  const result = await db
    .update(roles)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(roles.id, id), eq(roles.isDeleted, false)))
    .returning();
  return result[0] ?? null;
}

/** 软删除角色（系统角色不可删除） */
export async function deleteRole(db: Database, id: string) {
  const result = await db
    .update(roles)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(roles.id, id), eq(roles.isSystem, false)))
    .returning();
  return result.length > 0;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 角色列表返回类型 */
export type ListRolesResult = Awaited<ReturnType<typeof listRoles>>;

/** 单个角色返回类型（可能为 null） */
export type GetRoleResult = Awaited<ReturnType<typeof getRoleById>>;

/** 创建角色返回类型 */
export type CreateRoleResult = Awaited<ReturnType<typeof createRole>>;

/** 更新角色返回类型 */
export type UpdateRoleResult = Awaited<ReturnType<typeof updateRole>>;

/** 删除角色返回类型 */
export type DeleteRoleResult = Awaited<ReturnType<typeof deleteRole>>;
