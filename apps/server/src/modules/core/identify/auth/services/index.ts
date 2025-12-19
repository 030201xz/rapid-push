/**
 * Auth Services 统一导出
 */

// ========== Session Service ==========
export * as sessionService from './session.service';
export type {
  CreateSessionResult,
  GetSessionResult,
  ValidateSessionResult,
} from './session.service';

// ========== Device Service ==========
export * as deviceService from './device.service';
export type {
  GetDeviceResult,
  UpsertDeviceResult,
} from './device.service';

// ========== Refresh Token Service ==========
export * as refreshTokenService from './refresh-token.service';
export type {
  CreateRefreshTokenResult,
  RotateRefreshTokenResult,
  ValidateRefreshTokenResult,
} from './refresh-token.service';

// ========== Login Service ==========
export {
  login,
  type LoginInput,
  type LoginResult,
} from './login.service';

// ========== Logout Service ==========
export {
  forceLogoutSession,
  logoutAllSessions,
  logoutSession,
  type LogoutResult,
} from './logout.service';

// ========== Refresh Service ==========
export { refreshTokens, type RefreshResult } from './refresh.service';

// ========== Redis Service ==========
export * as redisService from './redis.service';
