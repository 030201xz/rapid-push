/**
 * Analytics Schema - 事件类型定义
 */

import { z } from 'zod';

// ========== 事件类型枚举 ==========
export const ANALYTICS_EVENT_TYPE = {
  /** 检查更新 */
  UPDATE_CHECK: 'update_check',
  /** 开始下载 */
  DOWNLOAD_START: 'download_start',
  /** 下载完成 */
  DOWNLOAD_COMPLETE: 'download_complete',
  /** 下载失败 */
  DOWNLOAD_FAILED: 'download_failed',
  /** 开始应用更新 */
  APPLY_START: 'apply_start',
  /** 应用成功 */
  APPLY_SUCCESS: 'apply_success',
  /** 应用失败 */
  APPLY_FAILED: 'apply_failed',
  /** 回滚 */
  ROLLBACK: 'rollback',
} as const;

export type AnalyticsEventType =
  (typeof ANALYTICS_EVENT_TYPE)[keyof typeof ANALYTICS_EVENT_TYPE];

// ========== Zod Schema ==========

/** 事件类型 Schema */
export const analyticsEventTypeSchema = z.enum([
  'update_check',
  'download_start',
  'download_complete',
  'download_failed',
  'apply_start',
  'apply_success',
  'apply_failed',
  'rollback',
]);

/** 单个事件 Schema */
export const analyticsEventSchema = z.object({
  /** 事件类型 */
  type: analyticsEventTypeSchema,
  /** 更新 ID（可选） */
  updateId: z.uuid().optional(),
  /** 运行时版本（可选） */
  runtimeVersion: z.string().optional(),
  /** 设备 ID */
  deviceId: z.string().min(1),
  /** 事件时间戳 */
  timestamp: z.coerce.date(),
  /** 额外信息 */
  extra: z.record(z.string(), z.unknown()).optional(),
});

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

/** 批量上报请求 Schema */
export const reportEventsSchema = z.object({
  /** 渠道密钥（用于验证） */
  channelKey: z.string().min(1),
  /** 事件列表（最多 100 条） */
  events: z.array(analyticsEventSchema).min(1).max(100),
});

export type ReportEventsInput = z.infer<typeof reportEventsSchema>;
