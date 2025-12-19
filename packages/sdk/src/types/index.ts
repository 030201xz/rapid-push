/**
 * 类型定义统一导出
 */

// 配置类型
export type {
  AutoCheckConfig,
  Platform,
  RapidPushConfig,
  RapidPushProviderProps,
} from './config';

// 协议类型
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  CheckUpdateRequest,
  CheckUpdateResponse,
  CurrentUpdateInfo,
  DeviceInfo,
  Directive,
  Manifest,
  ManifestAsset,
  RapidPushError,
  RapidPushErrorCode,
  ResponseType,
} from './protocol';

export { RESPONSE_TYPE } from './protocol';

// 状态类型
export type {
  DownloadState,
  DownloadStateCompleted,
  DownloadStateDownloading,
  DownloadStateFailed,
  DownloadStateIdle,
  UpdateAction,
  UpdateState,
  UseCurrentUpdateResult,
  UseDeviceInfoResult,
  UseUpdatesResult,
} from './state';

export { INITIAL_UPDATE_STATE, updateReducer } from './state';
