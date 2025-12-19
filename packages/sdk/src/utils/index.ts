/**
 * 工具模块统一导出
 */

export {
  getDeviceId,
  getDeviceInfo,
  getPlatform,
  getPlatformVersion,
} from './device';

export {
  ERROR_MESSAGES,
  createError,
  isRapidPushError,
  toRapidPushError,
} from './error';

export {
  DismissedUpdates,
  STORAGE_KEYS,
  Storage,
  type StorageAdapter,
  type StorageKey,
} from './storage';
