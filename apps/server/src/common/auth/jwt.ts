/**
 * JWT 认证服务
 *
 * 使用 jose 库实现 JWT 签名和验证
 * 设计说明:
 * - Payload 包含用户核心信息和角色列表
 * - 使用 Role['code'] 类型保证类型安全
 * - 包含 jti (JWT ID) 用于黑名单管理
 * - 包含 sessionId 用于会话关联
 */

import type { Role } from '@/modules/core/access-control/roles/schema';
import type { User } from '@/modules/core/identify/users/schema';
import type { AuthUser } from '@/types/index';
import { randomUUID } from 'crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../env';

// ========== JWT 配置 ==========
const JWT_ALG = 'HS256';
const JWT_ISSUER = 'rapid-s';
const JWT_AUDIENCE = 'rapid-s-client';

/** 从环境变量获取 secret，转换为 Uint8Array */
function getSecret(): Uint8Array {
  return new TextEncoder().encode(env.jwtSecret);
}

// ========== JWT Payload 类型 ==========

/** JWT 自定义载荷（从 User 和 Role 推断类型） */
export interface JwtUserPayload extends JWTPayload {
  /** 用户 ID（作为 subject） */
  sub: User['id'];
  /** JWT ID（用于黑名单管理） */
  jti: string;
  /** 会话 ID（关联登录会话） */
  sessionId: string;
  /** 用户名 */
  username: User['username'];
  /** 邮箱 */
  email: User['email'];
  /** 角色 code 列表 */
  roles: Role['code'][];
}

/** 签发 Token 的额外选项 */
export interface SignTokenOptions {
  /** 会话 ID（必须提供） */
  sessionId: string;
  /** 自定义 jti（可选，默认自动生成） */
  jti?: string;
}

// ========== 签发 JWT ==========

/** 签发 JWT Token */
export async function signToken(
  user: AuthUser,
  options: SignTokenOptions
): Promise<{ token: string; jti: string }> {
  const secret = getSecret();
  const jti = options.jti ?? randomUUID();

  const token = await new SignJWT({
    username: user.username,
    email: user.email,
    roles: user.roles,
    sessionId: options.sessionId,
  } satisfies Omit<JwtUserPayload, keyof JWTPayload | 'sub'>)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(user.id)
    .setJti(jti)
    .setExpirationTime(env.jwtExpiresIn)
    .sign(secret);

  return { token, jti };
}

// ========== 验证 JWT ==========

/** Token 验证结果 */
export interface VerifyTokenResult {
  /** 是否有效 */
  valid: boolean;
  /** 用户信息（有效时） */
  user?: AuthUser;
  /** JWT ID（有效时） */
  jti?: string;
  /** 会话 ID（有效时） */
  sessionId?: string;
  /** 错误原因（无效时） */
  error?:
    | 'INVALID_TOKEN'
    | 'EXPIRED'
    | 'BLACKLISTED'
    | 'MISSING_FIELDS';
}

/**
 * 验证 JWT Token（基础验证，不检查黑名单）
 *
 * 注意：此函数仅做 JWT 签名验证，不检查黑名单
 * 完整验证请使用 auth 模块的中间件
 */
export async function verifyToken(
  token: string
): Promise<VerifyTokenResult> {
  try {
    const secret = getSecret();

    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // 类型守卫：验证必要字段存在
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.jti !== 'string' ||
      typeof payload.sessionId !== 'string' ||
      typeof payload.username !== 'string' ||
      !Array.isArray(payload.roles)
    ) {
      return { valid: false, error: 'MISSING_FIELDS' };
    }

    const userPayload = payload as JwtUserPayload;

    return {
      valid: true,
      user: {
        id: userPayload.sub,
        username: userPayload.username,
        nickname: null,
        email: userPayload.email ?? null,
        phone: null,
        avatarUrl: null,
        status: 'active',
        roles: userPayload.roles,
      },
      jti: userPayload.jti,
      sessionId: userPayload.sessionId,
    };
  } catch (error) {
    // 判断是否是过期错误
    if (error instanceof Error && error.message.includes('expired')) {
      return { valid: false, error: 'EXPIRED' };
    }
    return { valid: false, error: 'INVALID_TOKEN' };
  }
}

/**
 * 旧版验证函数（兼容）
 * @deprecated 请使用 verifyToken 获取完整结果
 */
export async function verifyTokenLegacy(
  token: string
): Promise<AuthUser | null> {
  const result = await verifyToken(token);
  return result.valid ? result.user ?? null : null;
}
