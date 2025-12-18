import { eq } from 'drizzle-orm';
import type { RapidSDatabase as Database } from '../../common/database/postgresql/rapid-s';
import { users, type NewUser, type UpdateUser, type User } from './schema';

// ========== 业务逻辑：纯函数，依赖注入 db ==========

/** 获取所有用户 */
export async function listUsers(db: Database): Promise<User[]> {
  return db.select().from(users);
}

/** 根据 ID 获取用户 */
export async function getUserById(db: Database, id: number): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0] ?? null;
}

/** 根据 Email 获取用户 */
export async function getUserByEmail(db: Database, email: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.email, email));
  return result[0] ?? null;
}

/** 创建用户 */
export async function createUser(db: Database, data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  if (!user) throw new Error('创建用户失败');
  return user;
}

/** 更新用户 */
export async function updateUser(
  db: Database,
  id: number,
  data: UpdateUser
): Promise<User | null> {
  const result = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result[0] ?? null;
}

/** 删除用户 */
export async function deleteUser(db: Database, id: number): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, id)).returning();
  return result.length > 0;
}
