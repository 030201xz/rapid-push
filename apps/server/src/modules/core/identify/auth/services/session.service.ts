/**
 * Session 服务层
 *
 * 负责会话的创建、查询、撤销等操作
 * 纯函数设计，依赖注入 db
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { and, eq, gt, lt } from 'drizzle-orm';
import type { RevokeReason } from '../constants';
import { userSessions, type NewUserSession } from '../schemas';

// ============================================================================
// 查询操作
// ============================================================================

/** 根据 sessionId 获取会话 */
export async function getSessionBySessionId(
  db: Database,
  sessionId: string
) {
  const result = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.sessionId, sessionId));
  return result[0] ?? null;
}

/** 根据 ID 获取会话 */
export async function getSessionById(db: Database, id: string) {
  const result = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.id, id));
  return result[0] ?? null;
}

/** 获取用户的所有活跃会话 (未撤销且未过期) */
export async function getActiveSessionsByUserId(
  db: Database,
  userId: string
) {
  const now = new Date();
  return db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.userId, userId),
        eq(userSessions.isRevoked, false),
        gt(userSessions.expiresAt, now)
      )
    )
    .orderBy(userSessions.lastActivityAt);
}

/** 获取用户的所有会话 (包括已撤销和过期的) */
export async function getAllSessionsByUserId(
  db: Database,
  userId: string
) {
  return db
    .select()
    .from(userSessions)
    .where(eq(userSessions.userId, userId))
    .orderBy(userSessions.createdAt);
}

// ============================================================================
// 写入操作
// ============================================================================

/** 创建新会话 */
export async function createSession(
  db: Database,
  data: NewUserSession
) {
  const [session] = await db
    .insert(userSessions)
    .values(data)
    .returning();
  if (!session) throw new Error('创建会话失败');
  return session;
}

/** 更新会话最后活跃时间 */
export async function updateSessionActivity(
  db: Database,
  sessionId: string,
  ipAddress?: string
) {
  const now = new Date();
  const result = await db
    .update(userSessions)
    .set({
      lastActivityAt: now,
      updatedAt: now,
      ...(ipAddress && { ipAddress }),
    })
    .where(
      and(
        eq(userSessions.sessionId, sessionId),
        eq(userSessions.isRevoked, false)
      )
    )
    .returning();
  return result[0] ?? null;
}

/** 撤销单个会话 */
export async function revokeSession(
  db: Database,
  sessionId: string,
  reason: RevokeReason
) {
  const now = new Date();
  const result = await db
    .update(userSessions)
    .set({
      isRevoked: true,
      revokedAt: now,
      revokeReason: reason,
      updatedAt: now,
    })
    .where(eq(userSessions.sessionId, sessionId))
    .returning();
  return result[0] ?? null;
}

/** 撤销用户的所有活跃会话 */
export async function revokeAllUserSessions(
  db: Database,
  userId: string,
  reason: RevokeReason
) {
  const now = new Date();
  const result = await db
    .update(userSessions)
    .set({
      isRevoked: true,
      revokedAt: now,
      revokeReason: reason,
      updatedAt: now,
    })
    .where(
      and(
        eq(userSessions.userId, userId),
        eq(userSessions.isRevoked, false)
      )
    )
    .returning();
  return result.length;
}

/** 清理过期会话 (定时任务使用) */
export async function cleanupExpiredSessions(db: Database) {
  const now = new Date();
  const result = await db
    .delete(userSessions)
    .where(lt(userSessions.expiresAt, now))
    .returning();
  return result.length;
}

// ============================================================================
// 验证操作
// ============================================================================

/** 验证会话是否有效 */
export async function validateSession(
  db: Database,
  sessionId: string
) {
  const session = await getSessionBySessionId(db, sessionId);
  if (!session)
    return { valid: false, reason: 'SESSION_NOT_FOUND' } as const;
  if (session.isRevoked)
    return { valid: false, reason: 'SESSION_REVOKED' } as const;
  if (session.expiresAt < new Date())
    return { valid: false, reason: 'SESSION_EXPIRED' } as const;
  return { valid: true, session } as const;
}

// ============================================================================
// 类型导出
// ============================================================================

export type GetSessionResult = Awaited<
  ReturnType<typeof getSessionBySessionId>
>;
export type CreateSessionResult = Awaited<
  ReturnType<typeof createSession>
>;
export type ValidateSessionResult = Awaited<
  ReturnType<typeof validateSession>
>;
