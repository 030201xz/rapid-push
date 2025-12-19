/**
 * API 客户端
 *
 * 封装与服务端 tRPC API 的通信
 */

import type { AppRouter } from '@rapid-s/server/types';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

import type {
  AnalyticsEvent,
  CheckUpdateRequest,
  CheckUpdateResponse,
  RapidPushConfig,
} from '../types';
import { createError, toRapidPushError } from '../utils';

/** API 客户端配置 */
export interface ApiClientConfig {
  /** 服务端 URL */
  readonly serverUrl: string;
  /** 渠道密钥 */
  readonly channelKey: string;
}

/**
 * API 客户端
 *
 * 负责与服务端 tRPC API 通信
 */
export class ApiClient {
  private readonly client: ReturnType<
    typeof createTRPCClient<AppRouter>
  >;
  private readonly channelKey: string;

  constructor(config: ApiClientConfig) {
    this.channelKey = config.channelKey;

    // 创建 tRPC 客户端
    this.client = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${config.serverUrl}/trpc`,
          // 自定义 fetch 添加请求头
          fetch: (input, init) => {
            const url =
              typeof input === 'string'
                ? input
                : input instanceof URL
                ? input.toString()
                : input.url;
            return fetch(url, {
              ...init,
              headers: {
                ...init?.headers,
                // Expo Updates 协议头
                'expo-protocol-version': '1',
              },
            });
          },
        }),
      ],
    });
  }

  /**
   * 检查更新
   *
   * 调用服务端 manifest.check 接口
   */
  async checkForUpdate(
    params: Omit<CheckUpdateRequest, 'channelKey'>
  ): Promise<CheckUpdateResponse> {
    try {
      const result =
        await this.client.hotUpdate.protocol.manifest.check.query({
          channelKey: this.channelKey,
          ...params,
        });
      return result;
    } catch (error) {
      throw toRapidPushError(error);
    }
  }

  /**
   * 上报统计事件
   */
  async reportAnalytics(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      await this.client.hotUpdate.protocol.analytics.report.mutate({
        channelKey: this.channelKey,
        events,
      });
    } catch (error) {
      // 统计上报失败不抛出错误，仅记录
      console.warn('[RapidPush] 统计上报失败:', error);
    }
  }
}

/**
 * 创建 API 客户端
 */
export function createApiClient(config: RapidPushConfig): ApiClient {
  if (!config.serverUrl) {
    throw createError('CONFIG_INVALID', 'serverUrl 不能为空');
  }
  if (!config.channelKey) {
    throw createError('CONFIG_INVALID', 'channelKey 不能为空');
  }

  return new ApiClient({
    serverUrl: config.serverUrl,
    channelKey: config.channelKey,
  });
}
