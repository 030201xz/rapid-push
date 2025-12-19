/**
 * JWT 认证服务
 *
 * 使用 jose 库实现 JWT 签名和验证
 * 设计说明:
 * - Payload 包含用户核心信息和角色列表
 * - 使用 Role['code'] 类型保证类型安全
 */

import type { Role } from '@/modules/core/access-control/roles/schema';
import type { User } from '@/modules/core/identify/users/schema';
import type { AuthUser } from '@/types/index';
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
  /** 用户名 */
  username: User['username'];
  /** 邮箱 */
  email: User['email'];
  /** 角色 code 列表 */
  roles: Role['code'][];
}

// ========== 签发 JWT ==========

/** 签发 JWT Token */
export async function signToken(user: AuthUser): Promise<string> {
  const secret = getSecret();

  const jwt = await new SignJWT({
    username: user.username,
    email: user.email,
    roles: user.roles,
  } satisfies Omit<JwtUserPayload, keyof JWTPayload | 'sub'>)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(user.id)
    .setExpirationTime(env.jwtExpiresIn)
    .sign(secret);

  return jwt;
}

// ========== 验证 JWT ==========

/** 验证 JWT Token 并返回用户信息 */
export async function verifyToken(
  token: string
): Promise<AuthUser | null> {
  try {
    const secret = getSecret();

    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // 类型守卫：验证必要字段存在
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.username !== 'string' ||
      !Array.isArray(payload.roles)
    ) {
      return null;
    }

    const userPayload = payload as JwtUserPayload;

    // 返回 AuthUser（仅包含 JWT 中的字段）
    return {
      id: userPayload.sub,
      username: userPayload.username,
      nickname: null,
      email: userPayload.email ?? null,
      phone: null,
      avatarUrl: null,
      status: 'active', // JWT 验证通过说明账户处于激活状态
      roles: userPayload.roles,
    };
  } catch {
    // JWT 验证失败（过期、签名错误等）
    return null;
  }
}
