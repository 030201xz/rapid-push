/**
 * @rapid-s/sdk
 *
 * React Native SDK for Rapid-S hot update server
 * Thin wrapper around expo-updates with full TypeScript support
 */

// ==================== React 模块 ====================

export {
  // Provider
  RapidSProvider,
  RapidSContext,
  useRapidSContext,
  type RapidSContextValue,
  // Hooks
  useUpdater,
  useUpdateInfo,
} from './react';

// ==================== 核心模块 ====================

export {
  // Updater
  Updater,
  checkForUpdate,
  downloadUpdate,
  applyUpdate,
  getCurrentUpdate,
  isUpdaterAvailable,
  // Storage
  Storage,
  StorageKeys,
  getDeviceId,
  DismissedUpdates,
  getLastCheckTime,
  setLastCheckTime,
  // Analytics
  configureAnalytics,
  trackEvent,
  flushAnalytics,
  trackCheckEvent,
  trackDownloadStart,
  trackDownloadComplete,
  trackDownloadFailed,
  trackApplySuccess,
  trackApplyFailed,
} from './core';

// ==================== 类型导出 ====================

export type {
  // 服务端类型（复用）
  Manifest,
  ManifestAsset,
  Directive,
  DirectiveType,
  CheckUpdateResponse,
  ResponseType,
  Platform,
  AnalyticsEvent,
  AnalyticsEventType,
  // 配置类型
  RapidSConfig,
  RapidSProviderProps,
  UpdaterError,
  UpdaterErrorCode,
  // 状态类型
  UpdaterState,
  UpdaterActions,
  CurrentUpdateInfo,
  UseUpdaterResult,
  UseUpdateInfoResult,
} from './types';

// ==================== 常量导出 ====================

export { RESPONSE_TYPE, ANALYTICS_EVENT_TYPE } from './types';
