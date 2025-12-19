/**
 * Metrics 子域聚合入口
 *
 * 统计指标域：运营统计查询
 * - statistics: 统计数据查询
 */

import { router } from '@/common/trpc';

// ========== 导入各模块路由 ==========
import { statisticsRouter } from './statistics';

// ========== Metrics 子域路由聚合 ==========
export const metricsRouter = router({
  statistics: statisticsRouter,
});

// ========== 重导出各模块 ==========
export {
  statisticsRouter,
  StatisticsService,
  type ChannelStats,
  type UpdateStats,
} from './statistics';
