/**
 * Statistics 模块入口
 */

export { statisticsRouter } from './router';
export * as StatisticsService from './service';
export type {
  ChannelStats,
  GetChannelHistoryResult,
  GetChannelStatsResult,
  GetUpdateStatsResult,
  UpdateStats,
} from './types';
