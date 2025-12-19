/**
 * rapid-s Redis 类型定义
 *
 * 设计原则：
 * - 零 any：完全类型推导
 * - 类型复用：从 ioredis 提取类型
 * - 简洁明确：不过度设计
 */

import type Redis from 'ioredis';

// ============================================================================
// Redis 实例类型
// ============================================================================

/**
 * rapid-s Redis 实例类型
 *
 * 直接使用 ioredis 客户端类型
 */
export type RapidSRedis = Redis;

// ============================================================================
// 连接配置类型
// ============================================================================

/**
 * Redis 连接配置
 */
export interface RedisConnectionConfig {
  /** 主机地址 */
  readonly host: string;

  /** 端口 */
  readonly port: number;

  /** 密码（可选） */
  readonly password?: string;

  /** 数据库编号（默认 0） */
  readonly db?: number;

  /** 键前缀（如 'rapid-s:'） */
  readonly keyPrefix?: string;

  /** 连接超时毫秒数 (默认: 10000) */
  readonly connectTimeout?: number;

  /** 每次请求最大重试次数（默认 3） */
  readonly maxRetriesPerRequest?: number;

  /** 连接名称（用于标识） */
  readonly connectionName?: string;
}

/**
 * 完整配置（合并默认值后）
 */
export interface ResolvedRedisConfig {
  readonly host: string;
  readonly port: number;
  readonly password: string | undefined;
  readonly db: number;
  readonly keyPrefix: string;
  readonly connectTimeout: number;
  readonly maxRetriesPerRequest: number;
  readonly connectionName: string;
}

// ============================================================================
// 健康检查类型
// ============================================================================

/** Redis 健康状态 */
export interface RedisHealthStatus {
  /** 是否健康 */
  readonly healthy: boolean;

  /** 延迟毫秒数 */
  readonly latencyMs: number;

  /** 错误信息（如果有） */
  readonly error?: string;

  /** 检查时间 */
  readonly checkedAt: Date;
}
