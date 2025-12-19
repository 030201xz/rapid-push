/**
 * Auth 模块常量定义
 *
 * 包含 Token 配置、撤销原因、时间常量等
 */

// ============================================================================
// Token 过期时间配置 (秒)
// ============================================================================

/** Access Token 过期时间: 15 分钟 */
export const AT_EXPIRES_IN_SECONDS = 15 * 60;

/** Refresh Token 过期时间: 7 天 */
export const RT_EXPIRES_IN_DAYS = 7;
export const RT_EXPIRES_IN_SECONDS =
  RT_EXPIRES_IN_DAYS * 24 * 60 * 60;

/** 会话过期时间: 30 天 */
export const SESSION_EXPIRES_IN_DAYS = 30;
export const SESSION_EXPIRES_IN_SECONDS =
  SESSION_EXPIRES_IN_DAYS * 24 * 60 * 60;

// ============================================================================
// Redis Key 前缀
// ============================================================================

/** AT 黑名单前缀 (用于主动失效 AT) */
export const REDIS_AT_BLACKLIST_PREFIX = 'auth:at:blacklist:';

/** 用户活跃会话计数前缀 */
export const REDIS_USER_SESSIONS_PREFIX = 'auth:user:sessions:';

// ============================================================================
// 撤销原因枚举
// ============================================================================

export const REVOKE_REASON = {
  /** 用户主动登出 */
  USER_LOGOUT: 'user_logout',
  /** 检测到重放攻击 */
  REPLAY_DETECTED: 'replay_detected',
  /** 会话被撤销 */
  SESSION_REVOKED: 'session_revoked',
  /** 管理员强制撤销 */
  ADMIN_REVOKE: 'admin_revoke',
  /** 安全事件 */
  SECURITY_BREACH: 'security_breach',
  /** Token 过期 */
  EXPIRED: 'expired',
  /** 密码已更改 */
  PASSWORD_CHANGED: 'password_changed',
} as const;

export type RevokeReason =
  (typeof REVOKE_REASON)[keyof typeof REVOKE_REASON];

// ============================================================================
// 登录方式枚举
// ============================================================================

export const LOGIN_TYPE = {
  /** 用户名密码登录 */
  PASSWORD: 'password',
  /** 邮箱验证码登录 */
  EMAIL_CODE: 'email_code',
  /** 手机验证码登录 */
  PHONE_CODE: 'phone_code',
  /** 第三方 OAuth 登录 */
  OAUTH: 'oauth',
} as const;

export type LoginType = (typeof LOGIN_TYPE)[keyof typeof LOGIN_TYPE];

// ============================================================================
// 设备类型枚举
// ============================================================================

export const DEVICE_TYPE = {
  /** 未知设备 */
  UNKNOWN: 'unknown',
  /** 桌面浏览器 */
  DESKTOP: 'desktop',
  /** 移动设备 */
  MOBILE: 'mobile',
  /** 平板设备 */
  TABLET: 'tablet',
  /** API 客户端 */
  API: 'api',
} as const;

export type DeviceType =
  (typeof DEVICE_TYPE)[keyof typeof DEVICE_TYPE];

// ============================================================================
// 错误代码
// ============================================================================

export const AUTH_ERROR_CODE = {
  /** 无效的凭证 */
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  /** 用户未激活 */
  USER_NOT_ACTIVE: 'AUTH_USER_NOT_ACTIVE',
  /** 用户已锁定 */
  USER_LOCKED: 'AUTH_USER_LOCKED',
  /** 会话已过期 */
  SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  /** 会话已撤销 */
  SESSION_REVOKED: 'AUTH_SESSION_REVOKED',
  /** Token 已过期 */
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  /** Token 已撤销 */
  TOKEN_REVOKED: 'AUTH_TOKEN_REVOKED',
  /** Token 已使用 */
  TOKEN_USED: 'AUTH_TOKEN_USED',
  /** 检测到重放攻击 */
  REPLAY_DETECTED: 'AUTH_REPLAY_DETECTED',
  /** 未授权 */
  UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE];
