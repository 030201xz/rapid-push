/**
 * Auth 模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== 常量类型 ==========
export type {
  AuthErrorCode,
  DeviceType,
  LoginType,
  RevokeReason,
} from './constants';

export {
  AT_EXPIRES_IN_SECONDS,
  AUTH_ERROR_CODE,
  DEVICE_TYPE,
  LOGIN_TYPE,
  REVOKE_REASON,
  RT_EXPIRES_IN_DAYS,
  SESSION_EXPIRES_IN_DAYS,
} from './constants';

// ========== Schema 类型 ==========
export type {
  NewUserDevice,
  NewUserRefreshToken,
  NewUserSession,
  UserDevice,
  UserRefreshToken,
  UserSession,
} from './schemas';

export {
  insertDeviceSchema,
  insertRefreshTokenSchema,
  insertSessionSchema,
  selectDeviceSchema,
  selectRefreshTokenSchema,
  selectSessionSchema,
} from './schemas';

// ========== Service 返回类型 ==========
export type {
  CreateRefreshTokenResult,
  CreateSessionResult,
  GetDeviceResult,
  GetSessionResult,
  LoginInput,
  LoginResult,
  LogoutResult,
  RefreshResult,
  RotateRefreshTokenResult,
  UpsertDeviceResult,
  ValidateRefreshTokenResult,
  ValidateSessionResult,
} from './services';
