/**
 * Auth Redis 服务层
 *
 * 使用 Redis 进行:
 * 1. AT (Access Token) 黑名单管理 - 用于主动失效短期 Token
 * 2. Session 缓存 - 加速会话验证
 * 3. 用户活跃会话列表 - 快速查询用户在线设备
 *
 * 设计说明:
 * - AT 是无状态的 JWT，存储在客户端，验证时不查数据库
 * - 当需要主动失效 AT 时（登出、密码更改），将其 jti 加入黑名单
 * - RT 需要持久化存储在 PostgreSQL，用于家族追踪和审计
 * - Session 信息缓存在 Redis，减少数据库查询
 */

import type { RedisClient } from '@/common/database/redis/rapid-s';
import {
  AT_EXPIRES_IN_SECONDS,
  REDIS_AT_BLACKLIST_PREFIX,
  REDIS_SESSION_REVOKED_PREFIX,
  REDIS_USER_SESSIONS_PREFIX,
  SESSION_EXPIRES_IN_SECONDS,
} from '../constants';

// ============================================================================
// Redis Key 生成器
// ============================================================================

/** 生成 AT 黑名单 Key */
export function getAtBlacklistKey(jti: string): string {
  return `${REDIS_AT_BLACKLIST_PREFIX}${jti}`;
}

/** 生成用户活跃会话 Key */
export function getUserSessionsKey(userId: string): string {
  return `${REDIS_USER_SESSIONS_PREFIX}${userId}`;
}

/** 生成 Session 缓存 Key */
export function getSessionCacheKey(sessionId: string): string {
  return `auth:session:${sessionId}`;
}

/** 生成 Session 撤销列表 Key */
export function getSessionRevokedKey(sessionId: string): string {
  return `${REDIS_SESSION_REVOKED_PREFIX}${sessionId}`;
}

// ============================================================================
// AT 黑名单管理
// ============================================================================

/**
 * 将 AT 加入黑名单
 *
 * 用于主动失效尚未过期的 AT（登出、密码更改等场景）
 * TTL 设置为 AT 的过期时间，过期后自动清理
 */
export async function blacklistAccessToken(
  redis: RedisClient,
  jti: string
): Promise<void> {
  const key = getAtBlacklistKey(jti);
  await redis.set(key, '1', AT_EXPIRES_IN_SECONDS);
}

/**
 * 检查 AT 是否在黑名单中
 *
 * 在验证 AT 时调用，如果在黑名单中则拒绝请求
 */
export async function isAccessTokenBlacklisted(
  redis: RedisClient,
  jti: string
): Promise<boolean> {
  const key = getAtBlacklistKey(jti);
  return redis.exists(key);
}

/**
 * 批量将 AT 加入黑名单
 *
 * 用于撤销用户所有会话时，批量失效所有 AT
 */
export async function blacklistMultipleTokens(
  redis: RedisClient,
  jtis: string[]
): Promise<void> {
  // 使用 pipeline 批量写入
  const pipeline = redis.redis.pipeline();
  for (const jti of jtis) {
    const key = getAtBlacklistKey(jti);
    pipeline.setex(key, AT_EXPIRES_IN_SECONDS, '1');
  }
  await pipeline.exec();
}

// ============================================================================
// Session 撤销管理
// ============================================================================

/**
 * 将 Session 加入撤销列表
 *
 * 当会话被撤销时调用，AT 验证时会检查 Session 是否在撤销列表中
 * TTL 设置为 AT 的过期时间，因为 AT 过期后无需再检查
 */
export async function revokeSession(
  redis: RedisClient,
  sessionId: string
): Promise<void> {
  const key = getSessionRevokedKey(sessionId);
  // 只需保留 AT 过期时间，AT 过期后此记录自动删除
  await redis.set(key, '1', AT_EXPIRES_IN_SECONDS);
}

/**
 * 批量将 Session 加入撤销列表
 *
 * 用于全设备登出时批量撤销会话
 */
export async function revokeMultipleSessions(
  redis: RedisClient,
  sessionIds: string[]
): Promise<void> {
  if (sessionIds.length === 0) return;
  const pipeline = redis.redis.pipeline();
  for (const sessionId of sessionIds) {
    const key = getSessionRevokedKey(sessionId);
    pipeline.setex(key, AT_EXPIRES_IN_SECONDS, '1');
  }
  await pipeline.exec();
}

/**
 * 检查 Session 是否已被撤销
 *
 * 在验证 AT 时调用，如果 Session 已撤销则拒绝请求
 */
export async function isSessionRevoked(
  redis: RedisClient,
  sessionId: string
): Promise<boolean> {
  const key = getSessionRevokedKey(sessionId);
  return redis.exists(key);
}

// ============================================================================
// Session 缓存管理
// ============================================================================

/** Session 缓存数据结构 */
export interface SessionCacheData {
  userId: string;
  sessionId: string;
  deviceId?: string;
  isRevoked: boolean;
  expiresAt: number; // timestamp
}

/**
 * 缓存 Session 信息
 *
 * 用于加速会话验证，避免每次都查数据库
 */
export async function cacheSession(
  redis: RedisClient,
  sessionId: string,
  data: SessionCacheData
): Promise<void> {
  const key = getSessionCacheKey(sessionId);
  // 缓存时间与会话过期时间一致
  await redis.set(key, data, SESSION_EXPIRES_IN_SECONDS);
}

/**
 * 获取缓存的 Session 信息
 */
export async function getCachedSession(
  redis: RedisClient,
  sessionId: string
): Promise<SessionCacheData | null> {
  const key = getSessionCacheKey(sessionId);
  return redis.get<SessionCacheData>(key);
}

/**
 * 使 Session 缓存失效
 *
 * 在会话撤销时调用
 */
export async function invalidateSessionCache(
  redis: RedisClient,
  sessionId: string
): Promise<void> {
  const key = getSessionCacheKey(sessionId);
  await redis.del(key);
}

/**
 * 更新缓存中的 Session 为已撤销状态
 */
export async function markSessionRevokedInCache(
  redis: RedisClient,
  sessionId: string
): Promise<void> {
  const cached = await getCachedSession(redis, sessionId);
  if (cached) {
    cached.isRevoked = true;
    await cacheSession(redis, sessionId, cached);
  }
}

// ============================================================================
// 用户活跃会话管理
// ============================================================================

/**
 * 添加用户活跃会话
 *
 * 使用 Redis Set 存储用户的所有活跃 sessionId
 */
export async function addUserActiveSession(
  redis: RedisClient,
  userId: string,
  sessionId: string
): Promise<void> {
  const key = getUserSessionsKey(userId);
  await redis.redis.sadd(key, sessionId);
  // 设置过期时间为最长会话时间
  await redis.redis.expire(key, SESSION_EXPIRES_IN_SECONDS);
}

/**
 * 获取用户所有活跃会话 ID
 */
export async function getUserActiveSessionIds(
  redis: RedisClient,
  userId: string
): Promise<string[]> {
  const key = getUserSessionsKey(userId);
  return redis.redis.smembers(key);
}

/**
 * 移除用户活跃会话
 */
export async function removeUserActiveSession(
  redis: RedisClient,
  userId: string,
  sessionId: string
): Promise<void> {
  const key = getUserSessionsKey(userId);
  await redis.redis.srem(key, sessionId);
}

/**
 * 清空用户所有活跃会话
 *
 * 在全设备登出时调用
 */
export async function clearUserActiveSessions(
  redis: RedisClient,
  userId: string
): Promise<void> {
  const key = getUserSessionsKey(userId);
  await redis.del(key);
}

/**
 * 获取用户活跃会话数量
 */
export async function getUserActiveSessionCount(
  redis: RedisClient,
  userId: string
): Promise<number> {
  const key = getUserSessionsKey(userId);
  return redis.redis.scard(key);
}

// ============================================================================
// 类型导出
// ============================================================================

// SessionCacheData 已在上方导出
