/**
 * Refresh Token 服务层
 *
 * 负责 RT 的创建、验证、轮换、撤销等操作
 * 实现 Token 家族追踪和重放攻击检测
 * 纯函数设计，依赖注入 db
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { createHash, randomBytes } from 'crypto';
import { and, eq, lt } from 'drizzle-orm';
import {
  REVOKE_REASON,
  RT_EXPIRES_IN_SECONDS,
  type RevokeReason,
} from '../constants';
import { userRefreshTokens } from '../schemas';

// ============================================================================
// 辅助函数
// ============================================================================

/** 生成 Refresh Token (随机字符串) */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** 生成 Token 家族 ID */
export function generateTokenFamily(): string {
  return randomBytes(16).toString('base64url');
}

/** 计算 Token 哈希值 (用于存储) */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 计算 RT 过期时间 */
export function calculateRtExpiresAt(): Date {
  return new Date(Date.now() + RT_EXPIRES_IN_SECONDS * 1000);
}

// ============================================================================
// 查询操作
// ============================================================================

/** 根据 Token 哈希获取 RT */
export async function getRefreshTokenByHash(
  db: Database,
  tokenHash: string
) {
  const result = await db
    .select()
    .from(userRefreshTokens)
    .where(eq(userRefreshTokens.tokenHash, tokenHash));
  return result[0] ?? null;
}

/** 根据 ID 获取 RT */
export async function getRefreshTokenById(db: Database, id: string) {
  const result = await db
    .select()
    .from(userRefreshTokens)
    .where(eq(userRefreshTokens.id, id));
  return result[0] ?? null;
}

/** 获取会话的所有 RT */
export async function getRefreshTokensBySessionId(
  db: Database,
  sessionId: string
) {
  return db
    .select()
    .from(userRefreshTokens)
    .where(eq(userRefreshTokens.sessionId, sessionId))
    .orderBy(userRefreshTokens.generation);
}

/** 获取家族的所有 RT */
export async function getRefreshTokensByFamily(
  db: Database,
  family: string
) {
  return db
    .select()
    .from(userRefreshTokens)
    .where(eq(userRefreshTokens.family, family))
    .orderBy(userRefreshTokens.generation);
}

/** 获取家族中最新一代的 RT */
export async function getLatestTokenInFamily(
  db: Database,
  family: string
) {
  const result = await db
    .select()
    .from(userRefreshTokens)
    .where(eq(userRefreshTokens.family, family))
    .orderBy(userRefreshTokens.generation)
    .limit(1);
  return result[0] ?? null;
}

// ============================================================================
// 写入操作
// ============================================================================

/** 创建初始 RT (登录时) */
export async function createInitialRefreshToken(
  db: Database,
  data: {
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const rawToken = generateRefreshToken();
  const tokenHash = hashToken(rawToken);
  const family = generateTokenFamily();
  const expiresAt = calculateRtExpiresAt();

  const [rt] = await db
    .insert(userRefreshTokens)
    .values({
      sessionId: data.sessionId,
      tokenHash,
      family,
      generation: 1,
      parentTokenId: null,
      expiresAt,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    })
    .returning();

  if (!rt) throw new Error('创建 Refresh Token 失败');

  // 返回原始 token (用于发送给客户端) 和存储的记录
  return { rawToken, record: rt };
}

/** 轮换 RT (刷新时) */
export async function rotateRefreshToken(
  db: Database,
  parentToken: typeof userRefreshTokens.$inferSelect,
  data: {
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const rawToken = generateRefreshToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = calculateRtExpiresAt();

  const [newRt] = await db
    .insert(userRefreshTokens)
    .values({
      sessionId: parentToken.sessionId,
      tokenHash,
      family: parentToken.family,
      generation: parentToken.generation + 1,
      parentTokenId: parentToken.id,
      expiresAt,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    })
    .returning();

  if (!newRt) throw new Error('轮换 Refresh Token 失败');

  return { rawToken, record: newRt };
}

/** 标记 RT 为已使用 */
export async function markTokenAsUsed(db: Database, tokenId: string) {
  const now = new Date();
  const result = await db
    .update(userRefreshTokens)
    .set({
      isUsed: true,
      usedAt: now,
      updatedAt: now,
    })
    .where(eq(userRefreshTokens.id, tokenId))
    .returning();
  return result[0] ?? null;
}

/** 撤销单个 RT */
export async function revokeRefreshToken(
  db: Database,
  tokenId: string,
  reason: RevokeReason
) {
  const now = new Date();
  const result = await db
    .update(userRefreshTokens)
    .set({
      isRevoked: true,
      revokedAt: now,
      revokeReason: reason,
      updatedAt: now,
    })
    .where(eq(userRefreshTokens.id, tokenId))
    .returning();
  return result[0] ?? null;
}

/** 撤销整个家族的所有 RT (重放攻击检测时使用) */
export async function revokeTokenFamily(
  db: Database,
  family: string,
  reason: RevokeReason
) {
  const now = new Date();
  const result = await db
    .update(userRefreshTokens)
    .set({
      isRevoked: true,
      revokedAt: now,
      revokeReason: reason,
      updatedAt: now,
    })
    .where(
      and(
        eq(userRefreshTokens.family, family),
        eq(userRefreshTokens.isRevoked, false)
      )
    )
    .returning();
  return result.length;
}

/** 撤销会话的所有 RT */
export async function revokeAllSessionTokens(
  db: Database,
  sessionId: string,
  reason: RevokeReason
) {
  const now = new Date();
  const result = await db
    .update(userRefreshTokens)
    .set({
      isRevoked: true,
      revokedAt: now,
      revokeReason: reason,
      updatedAt: now,
    })
    .where(
      and(
        eq(userRefreshTokens.sessionId, sessionId),
        eq(userRefreshTokens.isRevoked, false)
      )
    )
    .returning();
  return result.length;
}

/** 清理过期的 RT (定时任务使用) */
export async function cleanupExpiredTokens(db: Database) {
  const now = new Date();
  const result = await db
    .delete(userRefreshTokens)
    .where(lt(userRefreshTokens.expiresAt, now))
    .returning();
  return result.length;
}

// ============================================================================
// 验证操作
// ============================================================================

/** 验证 RT 是否有效，并检测重放攻击 */
export async function validateRefreshToken(
  db: Database,
  rawToken: string
) {
  const tokenHash = hashToken(rawToken);
  const rt = await getRefreshTokenByHash(db, tokenHash);

  // Token 不存在
  if (!rt) {
    return { valid: false, reason: 'TOKEN_NOT_FOUND' } as const;
  }

  // Token 已过期
  if (rt.expiresAt < new Date()) {
    return {
      valid: false,
      reason: 'TOKEN_EXPIRED',
      token: rt,
    } as const;
  }

  // Token 已撤销
  if (rt.isRevoked) {
    return {
      valid: false,
      reason: 'TOKEN_REVOKED',
      token: rt,
    } as const;
  }

  // 检测重放攻击: Token 已使用但再次被使用
  if (rt.isUsed) {
    // 立即撤销整个家族
    await revokeTokenFamily(
      db,
      rt.family,
      REVOKE_REASON.REPLAY_DETECTED
    );
    return {
      valid: false,
      reason: 'REPLAY_DETECTED',
      token: rt,
    } as const;
  }

  return { valid: true, token: rt } as const;
}

// ============================================================================
// 类型导出
// ============================================================================

export type CreateRefreshTokenResult = Awaited<
  ReturnType<typeof createInitialRefreshToken>
>;
export type RotateRefreshTokenResult = Awaited<
  ReturnType<typeof rotateRefreshToken>
>;
export type ValidateRefreshTokenResult = Awaited<
  ReturnType<typeof validateRefreshToken>
>;
