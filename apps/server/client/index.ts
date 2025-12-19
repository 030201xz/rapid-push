/**
 * tRPC 客户端
 *
 * 端到端类型安全的 API 客户端，用于测试和前端调用
 *
 * @example
 * ```typescript
 * import { createClient } from '@rapid-s/server/client';
 *
 * const client = createClient('http://localhost:3000/trpc');
 *
 * // 登录
 * const result = await client.auth.login.mutate({
 *   username: 'admin',
 *   password: '123456',
 * });
 *
 * // 带 Token 的请求
 * const authedClient = createClient('http://localhost:3000/trpc', {
 *   token: result.accessToken,
 * });
 * const me = await authedClient.auth.me.query();
 * ```
 */

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../src/types';

// ========== 客户端配置类型 ==========

/** 客户端配置选项 */
export interface ClientOptions {
  /** Bearer Token（用于认证请求） */
  token?: string;
  /** 自定义 headers */
  headers?: Record<string, string>;
  /** 自定义 fetch（用于测试 mock） */
  fetch?: typeof fetch;
}

// ========== 创建客户端 ==========

/**
 * 创建 tRPC 客户端
 *
 * @param url - tRPC 服务端地址（如 http://localhost:3000/trpc）
 * @param options - 可选配置（token、headers 等）
 * @returns 类型安全的 tRPC 客户端实例
 */
export function createClient(
  url: string,
  options: ClientOptions = {}
) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url,
        // 动态生成请求头
        async headers() {
          const headers: Record<string, string> = {
            ...options.headers,
          };
          // 自动添加 Authorization header
          if (options.token) {
            headers['Authorization'] = `Bearer ${options.token}`;
          }
          return headers;
        },
        // 允许自定义 fetch（便于测试）
        ...(options.fetch && { fetch: options.fetch }),
      }),
    ],
  });
}

// ========== 类型导出 ==========

/** tRPC 客户端类型 */
export type Client = ReturnType<typeof createClient>;

// 重新导出服务端类型，便于前端使用
export type {
  AppRouter,
  RouterInput,
  RouterOutput,
} from '../src/types';
