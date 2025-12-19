/**
 * Logout 服务层
 *
 * 负责用户登出流程：撤销会话 → 撤销 Token → 清理 Redis
 * 纯函数设计，依赖注入 db 和 redis
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import type { RedisClient } from '@/common/database/redis/rapid-s';
import { REVOKE_REASON } from '../constants';
import * as redisService from './redis.service';
import * as refreshTokenService from './refresh-token.service';
import * as sessionService from './session.service';

// ============================================================================
// 登出结果类型
// ============================================================================

export interface LogoutResult {
  /** 是否成功 */
  success: boolean;
  /** 撤销的会话数量 */
  revokedSessions?: number;
  /** 撤销的 Token 数量 */
  revokedTokens?: number;
}

// ============================================================================
// 登出核心逻辑
// ============================================================================

/**
 * 单会话登出 (退出当前设备)
 *
 * 流程:
 * 1. 撤销会话 (PostgreSQL)
 * 2. 撤销该会话的所有 RT (PostgreSQL)
 * 3. 将当前 AT 加入黑名单 (Redis)
 * 4. 将 Session 加入撤销列表 (Redis) - 使该会话的所有 AT 失效
 * 5. 使 Session 缓存失效 (Redis)
 * 6. 从用户活跃会话列表移除 (Redis)
 */
export async function logoutSession(
  db: Database,
  redis: RedisClient,
  sessionId: string,
  currentAtJti?: string
): Promise<LogoutResult> {
  // 1. 获取会话信息 (用于获取 userId)
  const session = await sessionService.getSessionBySessionId(
    db,
    sessionId
  );
  if (!session) {
    return { success: false };
  }

  // 2. 撤销会话 (PostgreSQL)
  await sessionService.revokeSession(
    db,
    sessionId,
    REVOKE_REASON.USER_LOGOUT
  );

  // 3. 撤销该会话的所有 RT (PostgreSQL)
  const revokedTokens =
    await refreshTokenService.revokeAllSessionTokens(
      db,
      sessionId,
      REVOKE_REASON.USER_LOGOUT
    );

  // 4. 将当前 AT 加入黑名单 (Redis)
  if (currentAtJti) {
    await redisService.blacklistAccessToken(redis, currentAtJti);
  }

  // 5. 将 Session 加入撤销列表 (Redis) - 使该会话的所有 AT 立即失效
  await redisService.revokeSession(redis, sessionId);

  // 6. 使 Session 缓存失效 (Redis)
  await redisService.invalidateSessionCache(redis, sessionId);

  // 7. 从用户活跃会话列表移除 (Redis)
  await redisService.removeUserActiveSession(
    redis,
    session.userId,
    sessionId
  );

  return {
    success: true,
    revokedSessions: 1,
    revokedTokens,
  };
}

/**
 * 全设备登出 (退出所有设备)
 *
 * 流程:
 * 1. 撤销用户的所有活跃会话 (PostgreSQL)
 * 2. 撤销所有关联的 RT (PostgreSQL)
 * 3. 将当前 AT 加入黑名单 (Redis)
 * 4. 将所有 Session 加入撤销列表 (Redis) - 确保其他设备的 AT 也失效
 * 5. 清空用户活跃会话列表 (Redis)
 * 6. 使所有 Session 缓存失效 (Redis)
 */
export async function logoutAllSessions(
  db: Database,
  redis: RedisClient,
  userId: string,
  currentAtJti?: string
): Promise<LogoutResult> {
  // 1. 获取用户的所有活跃会话
  const activeSessions =
    await sessionService.getActiveSessionsByUserId(db, userId);

  // 2. 撤销所有会话 (PostgreSQL)
  const revokedSessions = await sessionService.revokeAllUserSessions(
    db,
    userId,
    REVOKE_REASON.USER_LOGOUT
  );

  // 3. 撤销所有会话的 RT (PostgreSQL) 并使缓存失效
  let totalRevokedTokens = 0;
  for (const session of activeSessions) {
    const count = await refreshTokenService.revokeAllSessionTokens(
      db,
      session.sessionId,
      REVOKE_REASON.USER_LOGOUT
    );
    totalRevokedTokens += count;

    // 使每个 Session 缓存失效 (Redis)
    await redisService.invalidateSessionCache(
      redis,
      session.sessionId
    );
  }

  // 4. 将当前 AT 加入黑名单 (Redis)
  if (currentAtJti) {
    await redisService.blacklistAccessToken(redis, currentAtJti);
  }

  // 5. 将所有 Session 加入撤销列表 (Redis)
  // 确保其他设备的 AT 在验证时也会被拒绝
  const sessionIds = activeSessions.map(s => s.sessionId);
  await redisService.revokeMultipleSessions(redis, sessionIds);

  // 6. 清空用户活跃会话列表 (Redis)
  await redisService.clearUserActiveSessions(redis, userId);

  return {
    success: true,
    revokedSessions,
    revokedTokens: totalRevokedTokens,
  };
}

/**
 * 强制登出指定会话 (管理员操作)
 */
export async function forceLogoutSession(
  db: Database,
  redis: RedisClient,
  sessionId: string
): Promise<LogoutResult> {
  // 获取会话信息
  const session = await sessionService.getSessionBySessionId(
    db,
    sessionId
  );
  if (!session) {
    return { success: false };
  }

  // 撤销会话 (PostgreSQL)
  await sessionService.revokeSession(
    db,
    sessionId,
    REVOKE_REASON.ADMIN_REVOKE
  );

  // 撤销所有 RT (PostgreSQL)
  const revokedTokens =
    await refreshTokenService.revokeAllSessionTokens(
      db,
      sessionId,
      REVOKE_REASON.ADMIN_REVOKE
    );

  // 使 Session 缓存失效 (Redis)
  await redisService.invalidateSessionCache(redis, sessionId);

  // 从用户活跃会话列表移除 (Redis)
  await redisService.removeUserActiveSession(
    redis,
    session.userId,
    sessionId
  );

  return {
    success: true,
    revokedSessions: 1,
    revokedTokens,
  };
}

// ============================================================================
// AT 黑名单管理 (委托给 redisService)
// ============================================================================

/**
 * 将 AT 加入黑名单
 * @deprecated 请使用 redisService.blacklistAccessToken
 */
export async function blacklistAccessToken(
  redis: RedisClient,
  jti: string
): Promise<void> {
  return redisService.blacklistAccessToken(redis, jti);
}

/**
 * 检查 AT 是否在黑名单中
 * @deprecated 请使用 redisService.isAccessTokenBlacklisted
 */
export async function isAccessTokenBlacklisted(
  redis: RedisClient,
  jti: string
): Promise<boolean> {
  return redisService.isAccessTokenBlacklisted(redis, jti);
}
