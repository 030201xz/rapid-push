import { eq } from 'drizzle-orm';
import type { RapidSDatabase as Database } from '../../common/database/postgresql/rapid-s';
import { users, type NewUser, type UpdateUser } from './schema';

// ========== 业务逻辑：纯函数，依赖注入 db ==========
// 返回类型由 TypeScript 自动推断，保持 DRY 原则

/** 获取所有用户 */
export async function listUsers(db: Database) {
  return db.select().from(users);
}

/** 根据 ID 获取用户 */
export async function getUserById(db: Database, id: number) {
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0] ?? null;
}

/** 根据 Email 获取用户 */
export async function getUserByEmail(db: Database, email: string) {
  const result = await db.select().from(users).where(eq(users.email, email));
  return result[0] ?? null;
}

/** 创建用户 */
export async function createUser(db: Database, data: NewUser) {
  const [user] = await db.insert(users).values(data).returning();
  if (!user) throw new Error('创建用户失败');
  return user;
}

/** 更新用户 */
export async function updateUser(db: Database, id: number, data: UpdateUser) {
  const result = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result[0] ?? null;
}

/** 删除用户 */
export async function deleteUser(db: Database, id: number) {
  const result = await db.delete(users).where(eq(users.id, id)).returning();
  return result.length > 0;
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
