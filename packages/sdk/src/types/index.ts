/**
 * 类型统一导出
 */

// 服务端复用类型
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  CheckUpdateResponse,
  Directive,
  DirectiveType,
  Manifest,
  ManifestAsset,
  Platform,
  ResponseType,
} from './server';

export { ANALYTICS_EVENT_TYPE, RESPONSE_TYPE } from './server';

// 配置类型
export type {
  RapidSConfig,
  RapidSProviderProps,
  UpdaterError,
  UpdaterErrorCode,
} from './config';

// 状态类型
export type {
  CurrentUpdateInfo,
  UpdaterActions,
  UpdaterState,
  UseUpdateInfoResult,
  UseUpdaterResult,
} from './state';
