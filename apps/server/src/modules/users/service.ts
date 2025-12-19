/**
 * 用户服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 返回类型由 TypeScript 自动推断，保持 DRY 原则
 */

import { and, eq } from 'drizzle-orm';
import type { RapidSDatabase as Database } from '../../common/database/postgresql/rapid-s';
import { users, type NewUser, type UpdateUser, USER_STATUS } from './schema';

// ========== 查询操作 ==========

/** 获取所有活跃用户（排除已删除） */
export async function listUsers(db: Database) {
  return db.select().from(users).where(eq(users.isDeleted, false));
}

/** 根据 ID 获取用户 */
export async function getUserById(db: Database, id: string) {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.isDeleted, false)));
  return result[0] ?? null;
}

/** 根据用户名获取用户 */
export async function getUserByUsername(db: Database, username: string) {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.username, username), eq(users.isDeleted, false)));
  return result[0] ?? null;
}

/** 根据邮箱获取用户 */
export async function getUserByEmail(db: Database, email: string) {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.isDeleted, false)));
  return result[0] ?? null;
}

// ========== 写入操作 ==========

/** 创建用户 */
export async function createUser(db: Database, data: NewUser) {
  const [user] = await db.insert(users).values(data).returning();
  if (!user) throw new Error('创建用户失败');
  return user;
}

/** 更新用户 */
export async function updateUser(db: Database, id: string, data: UpdateUser) {
  const result = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.isDeleted, false)))
    .returning();
  return result[0] ?? null;
}

/** 软删除用户 */
export async function deleteUser(db: Database, id: string) {
  const result = await db
    .update(users)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result.length > 0;
}

// ========== 状态管理 ==========

/** 激活用户 */
export async function activateUser(db: Database, id: string) {
  const result = await db
    .update(users)
    .set({ status: USER_STATUS.ACTIVE, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result[0] ?? null;
}

/** 锁定用户 */
export async function lockUser(db: Database, id: string, reason: string) {
  const result = await db
    .update(users)
    .set({
      status: USER_STATUS.LOCKED,
      lockReason: reason,
      lockedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return result[0] ?? null;
}

/** 解锁用户 */
export async function unlockUser(db: Database, id: string) {
  const result = await db
    .update(users)
    .set({
      status: USER_STATUS.ACTIVE,
      lockReason: null,
      lockedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return result[0] ?? null;
}

/** 记录登录信息 */
export async function recordLogin(db: Database, id: string, ip: string) {
  const result = await db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return result[0] ?? null;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 用户列表返回类型 */
export type ListUsersResult = Awaited<ReturnType<typeof listUsers>>;

/** 单个用户返回类型（可能为 null） */
export type GetUserResult = Awaited<ReturnType<typeof getUserById>>;

/** 创建用户返回类型 */
export type CreateUserResult = Awaited<ReturnType<typeof createUser>>;

/** 更新用户返回类型 */
export type UpdateUserResult = Awaited<ReturnType<typeof updateUser>>;

/** 删除用户返回类型 */
export type DeleteUserResult = Awaited<ReturnType<typeof deleteUser>>;
