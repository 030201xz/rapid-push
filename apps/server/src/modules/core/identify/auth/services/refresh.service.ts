/**
 * Refresh 服务层
 *
 * 负责 Token 刷新流程：验证 RT → 轮换 Token → 生成新 AT
 * 实现 Token 轮换和重放攻击防护
 * 纯函数设计，依赖注入 db 和 redis
 */

import { signToken } from '@/common/auth';
import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import type { RedisClient } from '@/common/database/redis/rapid-s';
import type { AuthUser } from '@/types/index';
import { getUserById } from '../../users/service';
import { AUTH_ERROR_CODE, REVOKE_REASON } from '../constants';
import * as refreshTokenService from './refresh-token.service';
import * as sessionService from './session.service';

// ============================================================================
// 刷新结果类型
// ============================================================================

export interface RefreshResult {
  /** 是否成功 */
  success: boolean;
  /** 错误代码 (失败时) */
  errorCode?: string;
  /** 错误消息 (失败时) */
  errorMessage?: string;
  /** 新的 Access Token (成功时) */
  accessToken?: string;
  /** 新的 Refresh Token (成功时) */
  refreshToken?: string;
  /** 用户信息 (成功时) */
  user?: AuthUser;
}

// ============================================================================
// 刷新核心逻辑
// ============================================================================

/**
 * 刷新 Token
 *
 * 流程:
 * 1. 验证 RT (检测重放攻击)
 * 2. 验证关联的会话
 * 3. 标记当前 RT 为已使用
 * 4. 生成新的 RT (轮换)
 * 5. 更新会话活跃时间
 * 6. 生成新的 AT
 * 7. 返回新的 Token 对
 */
export async function refreshTokens(
  db: Database,
  _redis: RedisClient,
  rawRefreshToken: string,
  getUserRoles: (db: Database, userId: string) => Promise<string[]>,
  ipAddress?: string,
  userAgent?: string
): Promise<RefreshResult> {
  // 1. 验证 RT
  const validation = await refreshTokenService.validateRefreshToken(
    db,
    rawRefreshToken
  );

  if (!validation.valid) {
    // 处理不同的失败原因
    switch (validation.reason) {
      case 'TOKEN_NOT_FOUND':
        return {
          success: false,
          errorCode: AUTH_ERROR_CODE.UNAUTHORIZED,
          errorMessage: '无效的刷新令牌',
        };
      case 'TOKEN_EXPIRED':
        return {
          success: false,
          errorCode: AUTH_ERROR_CODE.TOKEN_EXPIRED,
          errorMessage: '刷新令牌已过期，请重新登录',
        };
      case 'TOKEN_REVOKED':
        return {
          success: false,
          errorCode: AUTH_ERROR_CODE.TOKEN_REVOKED,
          errorMessage: '刷新令牌已撤销，请重新登录',
        };
      case 'REPLAY_DETECTED':
        // 重放攻击已自动撤销整个家族
        return {
          success: false,
          errorCode: AUTH_ERROR_CODE.REPLAY_DETECTED,
          errorMessage:
            '检测到安全异常，所有会话已被撤销，请重新登录',
        };
      default:
        return {
          success: false,
          errorCode: AUTH_ERROR_CODE.UNAUTHORIZED,
          errorMessage: '令牌验证失败',
        };
    }
  }

  const currentRt = validation.token;

  // 2. 验证关联的会话
  const sessionValidation = await sessionService.validateSession(
    db,
    currentRt.sessionId
  );

  if (!sessionValidation.valid) {
    // 会话无效，撤销整个家族的 Token
    await refreshTokenService.revokeTokenFamily(
      db,
      currentRt.family,
      REVOKE_REASON.SESSION_REVOKED
    );

    return {
      success: false,
      errorCode: AUTH_ERROR_CODE.SESSION_EXPIRED,
      errorMessage:
        sessionValidation.reason === 'SESSION_REVOKED'
          ? '会话已撤销，请重新登录'
          : '会话已过期，请重新登录',
    };
  }

  const session = sessionValidation.session;

  // 3. 获取用户信息
  const user = await getUserById(db, session.userId);
  if (!user) {
    return {
      success: false,
      errorCode: AUTH_ERROR_CODE.UNAUTHORIZED,
      errorMessage: '用户不存在',
    };
  }

  // 检查用户状态
  if (user.status !== 'active') {
    // 用户状态异常，撤销会话
    await sessionService.revokeSession(
      db,
      session.sessionId,
      REVOKE_REASON.USER_LOGOUT
    );
    await refreshTokenService.revokeTokenFamily(
      db,
      currentRt.family,
      REVOKE_REASON.USER_LOGOUT
    );

    return {
      success: false,
      errorCode: AUTH_ERROR_CODE.USER_NOT_ACTIVE,
      errorMessage: '账号状态异常，请联系管理员',
    };
  }

  // 4. 标记当前 RT 为已使用
  await refreshTokenService.markTokenAsUsed(db, currentRt.id);

  // 5. 轮换生成新的 RT
  const { rawToken: newRefreshToken } =
    await refreshTokenService.rotateRefreshToken(db, currentRt, {
      ipAddress,
      userAgent,
    });

  // 6. 更新会话活跃时间
  await sessionService.updateSessionActivity(
    db,
    session.sessionId,
    ipAddress
  );

  // 7. 获取用户角色并构建 AuthUser
  const roles = await getUserRoles(db, user.id);
  const authUser: AuthUser = {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    status: user.status,
    roles,
  };

  // 8. 生成新的 AT
  const { token: newAccessToken } = await signToken(authUser, {
    sessionId: session.sessionId,
  });

  return {
    success: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: authUser,
  };
}
