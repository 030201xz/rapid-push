/**
 * JWT 认证服务
 * 使用 jose 库实现 JWT 签名和验证
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../env';
import type { AuthUser } from '../../types';

// ========== JWT 配置 ==========
const JWT_ALG = 'HS256';
const JWT_ISSUER = 'rapid-s';
const JWT_AUDIENCE = 'rapid-s-client';

// 从环境变量获取 secret，转换为 Uint8Array
function getSecret(): Uint8Array {
  const secret = env.jwtSecret;
  return new TextEncoder().encode(secret);
}

// ========== JWT Payload 类型 ==========
export interface JwtUserPayload extends JWTPayload {
  sub: string; // 用户 ID
  email: string;
  role: 'user' | 'admin';
}

// ========== 签发 JWT ==========
export async function signToken(user: AuthUser): Promise<string> {
  const secret = getSecret();
  
  const jwt = await new SignJWT({
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(String(user.id)) // 用户 ID 作为 subject
    .setExpirationTime(env.jwtExpiresIn) // 从环境变量读取过期时间
    .sign(secret);

  return jwt;
}

// ========== 验证 JWT ==========
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const secret = getSecret();
    
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // 类型守卫：验证必要字段存在
    if (!payload.sub || !payload.email || !payload.role) {
      return null;
    }

    const userPayload = payload as JwtUserPayload;
    
    return {
      id: Number.parseInt(userPayload.sub, 10),
      email: userPayload.email,
      role: userPayload.role,
    };
  } catch {
    // JWT 验证失败（过期、签名错误等）
    return null;
  }
}
