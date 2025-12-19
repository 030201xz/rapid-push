/**
 * 统计上报模块
 *
 * 使用 tRPC 客户端上报统计事件到服务端
 */

import type { AnalyticsEvent, AnalyticsEventType } from '../types/server';
import { getDeviceId, Storage, StorageKeys } from './storage';
import { Updater } from './updater';

// ==================== 配置 ====================

interface AnalyticsConfig {
  /** 服务端地址 */
  serverUrl: string;
  /** 渠道密钥 */
  channelKey: string;
  /** 是否启用 */
  enabled: boolean;
}

let analyticsConfig: AnalyticsConfig | null = null;
let eventQueue: AnalyticsEvent[] = [];

// ==================== 核心功能 ====================

/**
 * 配置统计模块
 */
export function configureAnalytics(config: AnalyticsConfig): void {
  analyticsConfig = config;
  // 尝试恢复待上报事件
  restorePendingEvents();
}

/**
 * 记录统计事件
 */
export async function trackEvent(
  type: AnalyticsEventType,
  extra?: Record<string, unknown>,
): Promise<void> {
  if (!analyticsConfig?.enabled) {
    return;
  }

  const deviceId = await getDeviceId();
  const currentUpdate = Updater.getCurrentUpdate();

  // 使用条件展开，只在有值时包含可选属性（符合 exactOptionalPropertyTypes）
  const event: AnalyticsEvent = {
    type,
    deviceId,
    timestamp: new Date().toISOString(),
    ...(currentUpdate.updateId != null && { updateId: currentUpdate.updateId }),
    ...(currentUpdate.runtimeVersion != null && { runtimeVersion: currentUpdate.runtimeVersion }),
    ...(extra != null && { extra }),
  };

  eventQueue.push(event);

  // 队列超过 10 条时自动刷新
  if (eventQueue.length >= 10) {
    await flushAnalytics();
  } else {
    // 持久化待上报事件，防止应用关闭丢失
    await persistPendingEvents();
  }
}

/**
 * 刷新统计队列（上报到服务器）
 */
export async function flushAnalytics(): Promise<void> {
  if (!analyticsConfig?.enabled || eventQueue.length === 0) {
    return;
  }

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    // 使用 fetch 直接调用 tRPC 接口
    // 这样避免引入完整的 tRPC 客户端依赖
    const response = await fetch(
      `${analyticsConfig.serverUrl}/trpc/hotUpdate.protocol.analytics.report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelKey: analyticsConfig.channelKey,
          events: eventsToSend,
        }),
      },
    );

    if (!response.ok) {
      // 上报失败，重新放回队列
      eventQueue = [...eventsToSend, ...eventQueue];
      await persistPendingEvents();
    } else {
      // 上报成功，清除持久化
      await Storage.remove(StorageKeys.PENDING_ANALYTICS);
    }
  } catch {
    // 网络错误，重新放回队列
    eventQueue = [...eventsToSend, ...eventQueue];
    await persistPendingEvents();
  }
}

/**
 * 持久化待上报事件
 */
async function persistPendingEvents(): Promise<void> {
  if (eventQueue.length > 0) {
    await Storage.setObject(StorageKeys.PENDING_ANALYTICS, eventQueue);
  }
}

/**
 * 恢复待上报事件
 */
async function restorePendingEvents(): Promise<void> {
  const pending = await Storage.getObject<AnalyticsEvent[]>(StorageKeys.PENDING_ANALYTICS);
  if (pending && pending.length > 0) {
    eventQueue = [...pending, ...eventQueue];
  }
}

// ==================== 便捷方法 ====================

/**
 * 记录检查更新事件
 */
export async function trackCheckEvent(): Promise<void> {
  await trackEvent('update_check');
}

/**
 * 记录下载开始事件
 */
export async function trackDownloadStart(updateId: string): Promise<void> {
  await trackEvent('download_start', { updateId });
}

/**
 * 记录下载完成事件
 */
export async function trackDownloadComplete(updateId: string): Promise<void> {
  await trackEvent('download_complete', { updateId });
}

/**
 * 记录下载失败事件
 */
export async function trackDownloadFailed(updateId: string, error: string): Promise<void> {
  await trackEvent('download_failed', { updateId, error });
}

/**
 * 记录应用更新成功事件
 */
export async function trackApplySuccess(updateId: string): Promise<void> {
  await trackEvent('apply_success', { updateId });
}

/**
 * 记录应用更新失败事件
 */
export async function trackApplyFailed(updateId: string, error: string): Promise<void> {
  await trackEvent('apply_failed', { updateId, error });
}
