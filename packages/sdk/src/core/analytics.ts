/**
 * 统计上报器
 *
 * 管理统计事件队列和上报
 */

import type {
  AnalyticsEvent,
  AnalyticsEventType,
  RapidPushConfig,
} from '../types';
import { getDeviceId } from '../utils';
import { ApiClient } from './api-client';

/** 事件队列最大长度 */
const MAX_QUEUE_SIZE = 50;

/** 自动上报间隔（毫秒） */
const AUTO_FLUSH_INTERVAL = 30000;

/** 触发上报的队列长度阈值 */
const FLUSH_THRESHOLD = 10;

/**
 * 统计上报器
 */
export class AnalyticsReporter {
  private readonly apiClient: ApiClient;
  private readonly enabled: boolean;
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private currentUpdateId: string | null = null;
  private runtimeVersion: string | null = null;

  constructor(apiClient: ApiClient, enabled: boolean = true) {
    this.apiClient = apiClient;
    this.enabled = enabled;

    // 启动定时上报
    if (enabled) {
      this.startAutoFlush();
    }
  }

  /**
   * 设置当前更新上下文
   */
  setContext(
    updateId: string | null,
    runtimeVersion: string | null
  ): void {
    this.currentUpdateId = updateId;
    this.runtimeVersion = runtimeVersion;
  }

  /**
   * 记录事件
   */
  async track(
    type: AnalyticsEventType,
    extra?: Record<string, unknown>
  ): Promise<void> {
    if (!this.enabled) return;

    const deviceId = await getDeviceId();

    const event: AnalyticsEvent = {
      type,
      deviceId,
      timestamp: new Date(),
      updateId: this.currentUpdateId ?? undefined,
      runtimeVersion: this.runtimeVersion ?? undefined,
      extra,
    };

    this.queue.push(event);

    // 队列过大时截断
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
    }

    // 达到阈值时立即上报
    if (this.queue.length >= FLUSH_THRESHOLD) {
      await this.flush();
    }
  }

  /**
   * 上报队列中的所有事件
   */
  async flush(): Promise<void> {
    if (!this.enabled || this.queue.length === 0) return;

    // 取出队列中的事件
    const events = [...this.queue];
    this.queue = [];

    try {
      await this.apiClient.reportAnalytics(events);
    } catch {
      // 上报失败，将事件放回队列
      this.queue = [...events, ...this.queue].slice(-MAX_QUEUE_SIZE);
    }
  }

  /**
   * 启动定时上报
   */
  private startAutoFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush().catch(console.warn);
    }, AUTO_FLUSH_INTERVAL);
  }

  /**
   * 停止定时上报
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    this.stop();
    await this.flush();
  }
}

/**
 * 创建统计上报器
 */
export function createAnalyticsReporter(
  apiClient: ApiClient,
  config: RapidPushConfig
): AnalyticsReporter {
  // 默认启用统计
  const enabled = config.enableCodeSigning !== false;
  return new AnalyticsReporter(apiClient, enabled);
}
