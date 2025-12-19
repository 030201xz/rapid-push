/**
 * Auth 认证中间件
 *
 * 提供完整的 Token 验证（包含黑名单检查和 Session 撤销检查）
 * 供其他模块使用，实现统一的认证逻辑
 */

import { verifyToken, type VerifyTokenResult } from '@/common/auth';
import { getGlobalRedisClient } from '@/common/database/redis/rapid-s';
import {
  AUTH_ERROR_CODE,
  REDIS_AT_BLACKLIST_PREFIX,
  REDIS_SESSION_REVOKED_PREFIX,
} from '@/modules/core/identify/auth/constants';
import type { AuthUser } from '@/types/index';
import type { Context as HonoContext, Next } from 'hono';

// ============================================================================
// 验证结果类型
// ============================================================================

/** 完整验证结果（包含黑名单检查） */
export interface FullVerifyResult {
  /** 是否有效 */
  valid: boolean;
  /** 用户信息（有效时） */
  user?: AuthUser;
  /** JWT ID（有效时） */
  jti?: string;
  /** 会话 ID（有效时） */
  sessionId?: string;
  /** 错误代码（无效时） */
  errorCode?: string;
  /** 错误消息（无效时） */
  errorMessage?: string;
}

// ============================================================================
// 黑名单与撤销检查 (内联实现，避免循环依赖)
// ============================================================================

/** 检查 AT 是否在黑名单中 */
async function isAccessTokenBlacklisted(
  jti: string
): Promise<boolean> {
  const redis = getGlobalRedisClient();
  const key = `${REDIS_AT_BLACKLIST_PREFIX}${jti}`;
  return redis.exists(key);
}

/** 检查 Session 是否已被撤销 */
async function isSessionRevoked(sessionId: string): Promise<boolean> {
  const redis = getGlobalRedisClient();
  const key = `${REDIS_SESSION_REVOKED_PREFIX}${sessionId}`;
  return redis.exists(key);
}

// ============================================================================
// 核心验证函数
// ============================================================================

/**
 * 完整验证 Access Token
 *
 * 包含：
 * 1. JWT 签名验证
 * 2. 过期时间检查
 * 3. AT 黑名单检查（Redis）
 * 4. Session 撤销状态检查（Redis）
 */
export async function verifyAccessToken(
  token: string
): Promise<FullVerifyResult> {
  // 1. JWT 基础验证
  const jwtResult = await verifyToken(token);

  if (!jwtResult.valid) {
    return mapJwtError(jwtResult);
  }

  // 2. AT 黑名单检查
  const isBlacklisted = await isAccessTokenBlacklisted(
    jwtResult.jti!
  );

  if (isBlacklisted) {
    return {
      valid: false,
      errorCode: AUTH_ERROR_CODE.TOKEN_REVOKED,
      errorMessage: 'Token 已被撤销，请重新登录',
    };
  }

  // 3. Session 撤销状态检查（全设备登出时会撤销 Session）
  const sessionRevoked = await isSessionRevoked(jwtResult.sessionId!);

  if (sessionRevoked) {
    return {
      valid: false,
      errorCode: AUTH_ERROR_CODE.SESSION_REVOKED,
      errorMessage: '会话已被撤销，请重新登录',
    };
  }

  return {
    valid: true,
    user: jwtResult.user,
    jti: jwtResult.jti,
    sessionId: jwtResult.sessionId,
  };
}

/**
 * 从请求头提取并验证 Token
 */
export async function verifyFromHeader(
  authHeader: string | undefined
): Promise<FullVerifyResult> {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      valid: false,
      errorCode: AUTH_ERROR_CODE.UNAUTHORIZED,
      errorMessage: '未提供认证令牌',
    };
  }

  const token = authHeader.slice(7); // 移除 "Bearer " 前缀
  return verifyAccessToken(token);
}

// ============================================================================
// Hono 中间件
// ============================================================================

/**
 * Hono 认证中间件
 *
 * 验证 Authorization header 中的 Bearer token
 * 验证成功后将用户信息和 token 元数据存入 context
 */
export async function authMiddleware(c: HonoContext, next: Next) {
  const authHeader = c.req.header('Authorization');
  const result = await verifyFromHeader(authHeader);

  if (!result.valid) {
    return c.json(
      {
        success: false,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      },
      401
    );
  }

  // 将用户信息存入 context
  c.set('user', result.user);
  c.set('jti', result.jti);
  c.set('sessionId', result.sessionId);

  await next();
}

/**
 * 可选认证中间件
 *
 * 不强制要求认证，但如果提供了 token 则验证
 * 用于公开接口但需要区分登录用户的场景
 */
export async function optionalAuthMiddleware(
  c: HonoContext,
  next: Next
) {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const result = await verifyFromHeader(authHeader);
    if (result.valid) {
      c.set('user', result.user);
      c.set('jti', result.jti);
      c.set('sessionId', result.sessionId);
    }
  }

  await next();
}

// ============================================================================
// 辅助函数
// ============================================================================

/** 映射 JWT 验证错误到完整结果 */
function mapJwtError(result: VerifyTokenResult): FullVerifyResult {
  switch (result.error) {
    case 'EXPIRED':
      return {
        valid: false,
        errorCode: AUTH_ERROR_CODE.TOKEN_EXPIRED,
        errorMessage: 'Token 已过期，请刷新令牌',
      };
    case 'BLACKLISTED':
      return {
        valid: false,
        errorCode: AUTH_ERROR_CODE.TOKEN_REVOKED,
        errorMessage: 'Token 已被撤销，请重新登录',
      };
    case 'MISSING_FIELDS':
    case 'INVALID_TOKEN':
    default:
      return {
        valid: false,
        errorCode: AUTH_ERROR_CODE.UNAUTHORIZED,
        errorMessage: '无效的认证令牌',
      };
  }
}
