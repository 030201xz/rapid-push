/**
 * 用户仓储 Drizzle 实现
 *
 * 基于 PostgreSQL + Drizzle ORM 的实际数据库实现
 */

import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { injectable } from '../../core/di';
import { getDatabase } from '../../infrastructure/database';
import * as schema from '../../infrastructure/database/schema';
import { users } from '../../infrastructure/database/schema';
import { type User, type UserId, createUserId } from './user.entity';
import type { IUserRepository } from './user.repository';

/** 数据库用户记录类型 */
type DbUser = typeof users.$inferSelect;
type NewDbUser = typeof users.$inferInsert;

/**
 * 将数据库记录转换为领域实体
 */
function toDomainUser(dbUser: DbUser): User {
  return {
    id: createUserId(dbUser.id),
    username: dbUser.username,
    email: dbUser.email,
    passwordHash: dbUser.passwordHash,
    status: dbUser.isActive ? 'active' : 'inactive',
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  };
}

/**
 * 将领域实体转换为数据库记录
 */
function toDbUser(user: User): NewDbUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    passwordHash: user.passwordHash,
    isActive: user.status === 'active',
    displayName: null,
  };
}

/**
 * Drizzle 用户仓储实现
 */
@injectable()
export class DrizzleUserRepository implements IUserRepository {
  /** 获取数据库实例（延迟获取，避免初始化顺序问题） */
  private get db(): PostgresJsDatabase<typeof schema> {
    return getDatabase();
  }

  async findById(id: UserId): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] ? toDomainUser(result[0]) : null;
  }

  async findAll(): Promise<User[]> {
    const result = await this.db.select().from(users);
    return result.map(toDomainUser);
  }

  async save(entity: User): Promise<User> {
    const dbUser = toDbUser(entity);

    // Upsert: 插入或更新
    const result = await this.db
      .insert(users)
      .values(dbUser)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: dbUser.username,
          email: dbUser.email,
          passwordHash: dbUser.passwordHash,
          isActive: dbUser.isActive,
          updatedAt: new Date(),
        },
      })
      .returning();

    return toDomainUser(result[0]);
  }

  async delete(id: UserId): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return result[0] ? toDomainUser(result[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] ? toDomainUser(result[0]) : null;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const result = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return result.length > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result.length > 0;
  }

  /**
   * 获取用户总数
   */
  async count(): Promise<number> {
    const result = await this.db.select().from(users);
    return result.length;
  }

  /**
   * 分页查询用户
   */
  async findPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ items: User[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const [items, allUsers] = await Promise.all([
      this.db.select().from(users).limit(pageSize).offset(offset),
      this.db.select().from(users),
    ]);

    return {
      items: items.map(toDomainUser),
      total: allUsers.length,
    };
  }
}
