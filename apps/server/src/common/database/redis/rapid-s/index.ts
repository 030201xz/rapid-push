/**
 * rapid-s Redis 模块入口
 *
 * 导出：
 * - Redis 客户端工厂
 * - 类型定义
 * - 初始化函数
 */

import { env } from '../../../env';
import { redisLogger } from '../../../logger';

// ============================================================================
// 类型导出
// ============================================================================

export type {
  // Redis 实例类型
  RapidSRedis,
  // 配置类型
  RedisConnectionConfig,
  ResolvedRedisConfig,
  // 健康检查类型
  RedisHealthStatus,
} from './types';

// ============================================================================
// 客户端导出
// ============================================================================

export { createRedisClient, type RedisClient } from './client';

// ============================================================================
// 全局单例
// ============================================================================

import { createRedisClient, type RedisClient } from './client';

/** 全局 Redis 客户端引用 */
let globalClient: RedisClient | null = null;

/**
 * 初始化 Redis（从 env 自动读取配置）
 *
 * 在应用启动时自动调用
 */
export function initRedis(): RedisClient {
  if (globalClient) {
    return globalClient;
  }

  redisLogger.debug('连接 Redis', {
    host: env.redis.host,
    port: env.redis.port,
  });

  globalClient = createRedisClient({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
    db: env.redis.db,
    keyPrefix: env.redis.keyPrefix,
    connectTimeout: env.redis.connectTimeout,
    maxRetriesPerRequest: env.redis.maxRetriesPerRequest,
  });

  return globalClient;
}

/**
 * 获取全局 Redis 客户端
 *
 * @throws 如果未初始化
 */
export function getGlobalRedisClient(): RedisClient {
  if (!globalClient) {
    // 自动初始化
    return initRedis();
  }
  return globalClient;
}

/**
 * 关闭全局 Redis 连接
 */
export async function closeRedis(): Promise<void> {
  if (globalClient) {
    await globalClient.close();
    globalClient = null;
  }
}
