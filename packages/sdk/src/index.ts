/**
 * @rapid-push/sdk
 * 
 * React Native SDK for Rapid Push hot update server
 * 
 * @example
 * ```tsx
 * // 1. Provider 方式（推荐）
 * import { RapidPushProvider, useUpdates } from '@rapid-push/sdk';
 * 
 * function App() {
 *   return (
 *     <RapidPushProvider
 *       config={{
 *         channelKey: 'ch_xxx',
 *         serverUrl: 'https://updates.example.com',
 *       }}
 *       autoCheck={{ onMount: true }}
 *     >
 *       <MainApp />
 *     </RapidPushProvider>
 *   );
 * }
 * 
 * function UpdateScreen() {
 *   const { available, check, download, apply } = useUpdates();
 *   
 *   if (available) {
 *     return (
 *       <Button onPress={async () => {
 *         await download();
 *         await apply();
 *       }}>
 *         更新到 {available.runtimeVersion}
 *       </Button>
 *     );
 *   }
 *   
 *   return <Button onPress={check}>检查更新</Button>;
 * }
 * ```
 * 
 * @example
 * ```ts
 * // 2. 命令式方式
 * import { RapidPush } from '@rapid-push/sdk';
 * 
 * const sdk = RapidPush.create({
 *   channelKey: 'ch_xxx',
 *   serverUrl: 'https://updates.example.com',
 * });
 * 
 * const result = await sdk.checkForUpdate();
 * if (result.type === 'updateAvailable') {
 *   await sdk.downloadUpdate(result.manifest);
 *   await sdk.applyUpdate();
 * }
 * ```
 */

// ==================== 核心类 ====================

export { RapidPush, type CheckOptions } from './core';

// ==================== Provider 组件 ====================

export { RapidPushProvider, useRapidPushContext } from './provider';

// ==================== React Hooks ====================

export { useUpdates, useCurrentUpdate, useDeviceInfo } from './hooks';

// ==================== 类型导出 ====================

export type {
  // 配置类型
  RapidPushConfig,
  RapidPushProviderProps,
  AutoCheckConfig,
  Platform,

  // 协议类型
  CheckUpdateRequest,
  CheckUpdateResponse,
  Manifest,
  ManifestAsset,
  Directive,
  AnalyticsEvent,
  AnalyticsEventType,

  // 状态类型
  UpdateState,
  DownloadState,
  CurrentUpdateInfo,
  DeviceInfo,

  // Hook 返回类型
  UseUpdatesResult,
  UseCurrentUpdateResult,
  UseDeviceInfoResult,

  // 错误类型
  RapidPushError,
  RapidPushErrorCode,
} from './types';

export { RESPONSE_TYPE } from './types';

// ==================== 工具函数 ====================

export {
  // 设备
  getDeviceId,
  getDeviceInfo,
  getPlatform,
  getPlatformVersion,

  // 错误
  createError,
  isRapidPushError,
  toRapidPushError,
  ERROR_MESSAGES,

  // 存储
  Storage,
  STORAGE_KEYS,
} from './utils';
