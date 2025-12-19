/**
 * rapid-s Redis 客户端
 *
 * 设计原则：
 * - 简洁：函数式工厂，避免过度 OOP
 * - 可测试：配置与实例分离
 * - 类型安全：完整类型推导
 * - 自动序列化：JSON 自动编解码
 */

import Redis from 'ioredis';
import { redisLogger } from '../../../logger';

import type {
  RedisConnectionConfig,
  ResolvedRedisConfig,
  RapidSRedis,
  RedisHealthStatus,
} from './types';

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG = {
  db: 0,
  keyPrefix: '',
  connectTimeout: 10_000,
  maxRetriesPerRequest: 3,
  connectionName: 'rapid-s-redis',
} as const;

// ============================================================================
// 配置解析
// ============================================================================

/** 合并用户配置与默认配置 */
function resolveConfig(config: RedisConnectionConfig): ResolvedRedisConfig {
  return {
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db ?? DEFAULT_CONFIG.db,
    keyPrefix: config.keyPrefix ?? DEFAULT_CONFIG.keyPrefix,
    connectTimeout: config.connectTimeout ?? DEFAULT_CONFIG.connectTimeout,
    maxRetriesPerRequest:
      config.maxRetriesPerRequest ?? DEFAULT_CONFIG.maxRetriesPerRequest,
    connectionName: config.connectionName ?? DEFAULT_CONFIG.connectionName,
  };
}

// ============================================================================
// 客户端接口
// ============================================================================

/** Redis 客户端实例 */
export interface RedisClient {
  /** ioredis 原始客户端 */
  readonly redis: RapidSRedis;

  /** 解析后的配置 */
  readonly config: ResolvedRedisConfig;

  /** 健康检查 */
  healthCheck(): Promise<RedisHealthStatus>;

  /** 关闭连接 */
  close(): Promise<void>;

  // ========== 便捷 API ==========

  /**
   * 获取值（自动 JSON 解析）
   *
   * @param key - 键名
   * @returns 解析后的值，不存在返回 null
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 设置值（自动 JSON 序列化）
   *
   * @param key - 键名
   * @param value - 值
   * @param ttlSeconds - 过期时间（秒），可选
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * 删除键
   *
   * @param key - 键名
   * @returns 是否成功删除
   */
  del(key: string): Promise<boolean>;

  /**
   * 检查键是否存在
   *
   * @param key - 键名
   * @returns 是否存在
   */
  exists(key: string): Promise<boolean>;
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 Redis 客户端
 *
 * @example
 * ```ts
 * const client = createRedisClient({
 *   host: 'localhost',
 *   port: 6379,
 *   password: 'your-password',
 * });
 *
 * // 使用便捷 API
 * await client.set('user:1', { name: 'Alice' }, 3600);
 * const user = await client.get<{ name: string }>('user:1');
 *
 * // 使用原始客户端（高级操作）
 * const pipeline = client.redis.pipeline();
 * pipeline.set('key1', 'value1');
 * pipeline.set('key2', 'value2');
 * await pipeline.exec();
 *
 * // 健康检查
 * const health = await client.healthCheck();
 *
 * // 关闭连接
 * await client.close();
 * ```
 */
export function createRedisClient(config: RedisConnectionConfig): RedisClient {
  const resolvedConfig = resolveConfig(config);

  // 创建 ioredis 客户端
  const redis = new Redis({
    host: resolvedConfig.host,
    port: resolvedConfig.port,
    password: resolvedConfig.password,
    db: resolvedConfig.db,
    keyPrefix: resolvedConfig.keyPrefix,
    connectTimeout: resolvedConfig.connectTimeout,
    maxRetriesPerRequest: resolvedConfig.maxRetriesPerRequest,
    name: resolvedConfig.connectionName,
    // 自动重连策略
    retryStrategy: (times) => {
      if (times > 30) {
        redisLogger.error('Redis 重连次数已达上限，放弃重连');
        return null;
      }
      // 指数退避，最大 30 秒
      const delay = Math.min(times * 1000, 30_000);
      redisLogger.info(`尝试重连 Redis (${times}/30)，等待 ${delay}ms`);
      return delay;
    },
  });

  // 连接事件监听
  redis.on('connect', () => {
    redisLogger.debug('Redis 连接已建立');
  });

  redis.on('ready', () => {
    redisLogger.info('Redis 已就绪');
  });

  redis.on('error', (err) => {
    redisLogger.error('Redis 错误', { error: err.message });
  });

  redis.on('close', () => {
    redisLogger.warn('Redis 连接已关闭');
  });

  // 关闭标记
  let closed = false;

  /** 确保未关闭 */
  function ensureOpen(): void {
    if (closed) {
      throw new Error('Redis 客户端已关闭');
    }
  }

  return {
    redis,
    config: resolvedConfig,

    async healthCheck(): Promise<RedisHealthStatus> {
      const startTime = performance.now();
      const checkedAt = new Date();

      try {
        await redis.ping();
        return {
          healthy: true,
          latencyMs: Math.round(performance.now() - startTime),
          checkedAt,
        };
      } catch (error) {
        return {
          healthy: false,
          latencyMs: Math.round(performance.now() - startTime),
          error: error instanceof Error ? error.message : String(error),
          checkedAt,
        };
      }
    },

    async close(): Promise<void> {
      if (closed) {
        return;
      }

      redisLogger.info('正在关闭 Redis 连接...');
      closed = true;
      await redis.quit();
      redisLogger.info('Redis 连接已关闭');
    },

    async get<T>(key: string): Promise<T | null> {
      ensureOpen();
      const value = await redis.get(key);
      if (value === null) {
        return null;
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        // 非 JSON 字符串，直接返回
        return value as T;
      }
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      ensureOpen();
      const serialized =
        typeof value === 'string' ? value : JSON.stringify(value);

      if (ttlSeconds !== undefined && ttlSeconds > 0) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
    },

    async del(key: string): Promise<boolean> {
      ensureOpen();
      const result = await redis.del(key);
      return result > 0;
    },

    async exists(key: string): Promise<boolean> {
      ensureOpen();
      const result = await redis.exists(key);
      return result > 0;
    },
  };
}
