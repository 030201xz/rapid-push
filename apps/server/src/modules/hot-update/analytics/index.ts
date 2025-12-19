/**
 * Analytics 模块入口
 */

export { analyticsRouter } from './router';
export {
  ANALYTICS_EVENT_TYPE,
  analyticsEventSchema,
  analyticsEventTypeSchema,
  reportEventsSchema,
} from './schema';
export * as AnalyticsService from './service';
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  ReportEventsInput,
} from './types';
