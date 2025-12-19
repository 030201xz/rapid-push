/**
 * Hot Update 域聚合入口
 *
 * 按使用场景分为四个子域：
 * - manage: 管理后台域（开发者 CRUD）
 * - storage: 资源存储域（内容寻址存储）
 * - protocol: 客户端协议域（App 使用）
 * - metrics: 统计指标域（运营查询）
 *
 * 路由路径（嵌套结构）：
 * - hotUpdate.manage.organizations / projects / channels / updates / directives / rolloutRules
 * - hotUpdate.storage.assets
 * - hotUpdate.protocol.manifest / analytics
 * - hotUpdate.metrics.statistics
 */

import { router } from '@/common/trpc';

// ========== 导入各子域路由 ==========
import { manageRouter } from './manage';
import { metricsRouter } from './metrics';
import { protocolRouter } from './protocol';
import { storageRouter } from './storage';

// ========== Hot Update 域路由聚合（嵌套结构） ==========
export const hotUpdateRouter = router({
  /** 管理后台域：组织/项目/渠道/更新/指令/灰度规则 */
  manage: manageRouter,
  /** 资源存储域：内容寻址存储 */
  storage: storageRouter,
  /** 客户端协议域：检查更新/事件上报 */
  protocol: protocolRouter,
  /** 统计指标域：统计查询 */
  metrics: metricsRouter,
});

// ========== 重导出子域路由 ==========
export { manageRouter } from './manage';
export { metricsRouter } from './metrics';
export { protocolRouter } from './protocol';
export { storageRouter } from './storage';

// ========== 重导出管理域（类型命名空间 + Schema） ==========
export {
  // Schema
  channels,
  // 路由
  channelsRouter,
  // 类型命名空间
  ChannelsTypes,
  // 常量
  DIRECTIVE_TYPE,
  directives,
  directivesRouter,
  DirectivesTypes,
  organizations,
  organizationsRouter,
  OrganizationsTypes,
  projects,
  projectsRouter,
  ProjectsTypes,
  ROLLOUT_RULE_TYPE,
  rolloutRules,
  rolloutRulesRouter,
  RolloutRulesTypes,
  updates,
  updatesRouter,
  UpdatesTypes,
} from './manage';

// ========== 重导出存储域 ==========
export {
  // Schema
  assets,
  // 路由
  assetsRouter,
  // 类型命名空间
  AssetsTypes,
  // 常量
  PLATFORM,
  updateAssets,
  // 服务
  UpdateAssetsService,
  UpdateAssetsTypes,
} from './storage';

// ========== 重导出协议域 ==========
export {
  // 常量
  ANALYTICS_EVENT_TYPE,
  // 路由
  analyticsRouter,
  // 服务
  AnalyticsService,
  manifestRouter,
  ManifestService,
  RESPONSE_TYPE,
  // 类型
  type AnalyticsEvent,
  type AnalyticsEventType,
  type CheckUpdateRequest,
  type CheckUpdateResponse,
  type Manifest,
  type ManifestAsset,
  type Platform,
} from './protocol';

// ========== 重导出指标域 ==========
export {
  // 路由
  statisticsRouter,
  // 服务
  StatisticsService,
  // 类型
  type ChannelStats,
  type UpdateStats,
} from './metrics';
