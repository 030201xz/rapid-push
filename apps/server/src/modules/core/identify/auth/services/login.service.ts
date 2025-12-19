/**
 * Login 服务层
 *
 * 负责用户登录流程：验证凭证 → 创建会话 → 生成 Token
 * 纯函数设计，依赖注入 db 和 redis
 */

import { signToken } from '@/common/auth';
import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import type { RedisClient } from '@/common/database/redis/rapid-s';
import type { AuthUser } from '@/types/index';
import { randomUUID } from 'crypto';
import { getUserByUsername } from '../../users/service';
import {
  AUTH_ERROR_CODE,
  SESSION_EXPIRES_IN_SECONDS,
} from '../constants';
import * as deviceService from './device.service';
import * as redisService from './redis.service';
import * as refreshTokenService from './refresh-token.service';
import * as sessionService from './session.service';

// ============================================================================
// 登录输入类型
// ============================================================================

/** 登录请求参数 */
export interface LoginInput {
  /** 用户名 */
  username: string;
  /** 密码 (明文，由服务验证) */
  password: string;
  /** 设备指纹 (可选) */
  deviceFingerprint?: string;
  /** 设备名称 (可选) */
  deviceName?: string;
  /** 设备类型 (可选) */
  deviceType?: string;
  /** IP 地址 */
  ipAddress?: string;
  /** User Agent */
  userAgent?: string;
}

/** 登录结果 */
export interface LoginResult {
  /** 是否成功 */
  success: boolean;
  /** 错误代码 (失败时) */
  errorCode?: string;
  /** 错误消息 (失败时) */
  errorMessage?: string;
  /** Access Token (成功时) */
  accessToken?: string;
  /** Refresh Token (成功时) */
  refreshToken?: string;
  /** 用户信息 (成功时) */
  user?: AuthUser;
  /** 会话 ID (成功时) */
  sessionId?: string;
}

// ============================================================================
// 登录核心逻辑
// ============================================================================

/**
 * 用户登录
 *
 * 流程:
 * 1. 验证用户凭证
 * 2. 检查用户状态
 * 3. 创建/更新设备记录
 * 4. 创建会话
 * 5. 生成 AT + RT
 * 6. 返回 Token
 */
export async function login(
  db: Database,
  redis: RedisClient,
  input: LoginInput,
  verifyPassword: (plain: string, hash: string) => Promise<boolean>,
  getUserRoles: (db: Database, userId: string) => Promise<string[]>
): Promise<LoginResult> {
  // 1. 查找用户
  const user = await getUserByUsername(db, input.username);
  if (!user) {
    return {
      success: false,
      errorCode: AUTH_ERROR_CODE.INVALID_CREDENTIALS,
      errorMessage: '用户名或密码错误',
    };
  }

  // 2. 验证密码
  const isValidPassword = await verifyPassword(
    input.password,
    user.passwordHash
  );
  if (!isValidPassword) {
    return {
      success: false,
      errorCode: AUTH_ERROR_CODE.INVALID_CREDENTIALS,
      errorMessage: '用户名或密码错误',
    };
  }

  // 3. 检查用户状态
  if (user.status === 'pending_verification') {
    return {
      success: false,
      errorCode: AUTH_ERROR_CODE.USER_NOT_ACTIVE,
      errorMessage: '账号待验证，请先完成邮箱验证',
    };
  }

  if (user.status === 'disabled') {
    return {
      success: false,
      errorCode: AUTH_ERROR_CODE.USER_NOT_ACTIVE,
      errorMessage: '账号已禁用，请联系管理员',
    };
  }

  if (user.status === 'locked') {
    return {
      success: false,
      errorCode: AUTH_ERROR_CODE.USER_LOCKED,
      errorMessage: `账号已锁定: ${user.lockReason ?? '未知原因'}`,
    };
  }

  // 4. 处理设备 (可选)
  let deviceId: string | undefined;
  if (input.deviceFingerprint) {
    const device = await deviceService.upsertDevice(db, user.id, {
      deviceFingerprint: input.deviceFingerprint,
      deviceName: input.deviceName,
      deviceType: input.deviceType as
        | 'desktop'
        | 'mobile'
        | 'tablet'
        | 'api'
        | 'unknown'
        | undefined,
      lastIpAddress: input.ipAddress,
      browserInfo: extractBrowserInfo(input.userAgent),
      osInfo: extractOsInfo(input.userAgent),
    });
    deviceId = device.id;
  }

  // 5. 获取用户角色
  const roles = await getUserRoles(db, user.id);

  // 6. 构建 AuthUser
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

  // 7. 创建会话
  const sessionId = randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRES_IN_SECONDS * 1000
  );

  await sessionService.createSession(db, {
    userId: user.id,
    sessionId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    deviceId,
    expiresAt,
  });

  // 8. 缓存 Session 到 Redis (加速后续验证)
  await redisService.cacheSession(redis, sessionId, {
    userId: user.id,
    sessionId,
    deviceId,
    isRevoked: false,
    expiresAt: expiresAt.getTime(),
  });

  // 9. 记录用户活跃会话 (用于查询用户在线设备)
  await redisService.addUserActiveSession(redis, user.id, sessionId);

  // 10. 生成 AT
  const { token: accessToken } = await signToken(authUser, {
    sessionId,
  });

  // 11. 生成 RT
  const { rawToken: refreshToken } =
    await refreshTokenService.createInitialRefreshToken(db, {
      sessionId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

  return {
    success: true,
    accessToken,
    refreshToken,
    user: authUser,
    sessionId,
  };
}

// ============================================================================
// 辅助函数
// ============================================================================

/** 从 User-Agent 提取浏览器信息 */
function extractBrowserInfo(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  // 简化实现，实际可用 ua-parser-js 等库
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

/** 从 User-Agent 提取操作系统信息 */
function extractOsInfo(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  // 简化实现
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}
