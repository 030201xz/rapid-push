/**
 * Protocol 子域聚合入口
 *
 * 客户端协议域：App 客户端使用的接口
 * - manifest: 检查更新（核心协议）
 * - analytics: 事件上报
 */

import { router } from '@/common/trpc';

// ========== 导入各模块路由 ==========
import { analyticsRouter } from './analytics';
import { manifestRouter } from './manifest';

// ========== Protocol 子域路由聚合 ==========
export const protocolRouter = router({
  manifest: manifestRouter,
  analytics: analyticsRouter,
});

// ========== 重导出各模块 ==========
export {
  ANALYTICS_EVENT_TYPE,
  analyticsRouter,
  AnalyticsService,
  type AnalyticsEvent,
  type AnalyticsEventType,
} from './analytics';
export {
  manifestRouter,
  ManifestService,
  RESPONSE_TYPE,
  type CheckUpdateRequest,
  type CheckUpdateResponse,
  type Manifest,
  type ManifestAsset,
  type Platform,
} from './manifest';
