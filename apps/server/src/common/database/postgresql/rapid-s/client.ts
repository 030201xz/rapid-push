/**
 * rapid-s 数据库客户端
 *
 * 设计原则：
 * - 简洁：函数式工厂，避免过度 OOP
 * - 可测试：配置与实例分离
 * - 类型安全：完整类型推导
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

import type {
  DatabaseConnectionConfig,
  ResolvedDatabaseConfig,
  RapidSDatabase,
  DatabaseHealthStatus,
  RapidSTransactionClient,
} from './types';

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG = {
  maxConnections: 10,
  idleTimeout: 20,
  maxLifetime: 60 * 30, // 30 分钟
  connectTimeout: 10,
  prepare: true,
  applicationName: 'rapid-s',
  ssl: false,
} as const;

// ============================================================================
// 配置解析
// ============================================================================

/** 合并用户配置与默认配置 */
function resolveConfig(config: DatabaseConnectionConfig): ResolvedDatabaseConfig {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    ssl: config.ssl ?? DEFAULT_CONFIG.ssl,
    maxConnections: config.maxConnections ?? DEFAULT_CONFIG.maxConnections,
    idleTimeout: config.idleTimeout ?? DEFAULT_CONFIG.idleTimeout,
    maxLifetime: config.maxLifetime ?? DEFAULT_CONFIG.maxLifetime,
    connectTimeout: config.connectTimeout ?? DEFAULT_CONFIG.connectTimeout,
    prepare: config.prepare ?? DEFAULT_CONFIG.prepare,
    applicationName: config.applicationName ?? DEFAULT_CONFIG.applicationName,
  };
}

// ============================================================================
// 客户端接口
// ============================================================================

/** 数据库客户端实例 */
export interface DatabaseClient {
  /** Drizzle 数据库实例 */
  readonly db: RapidSDatabase;

  /** 原始 postgres-js 客户端（用于高级操作） */
  readonly raw: Sql;

  /** 解析后的配置 */
  readonly config: ResolvedDatabaseConfig;

  /** 健康检查 */
  healthCheck(): Promise<DatabaseHealthStatus>;

  /** 执行事务 */
  transaction<T>(fn: (tx: RapidSTransactionClient) => Promise<T>): Promise<T>;

  /** 关闭连接 */
  close(options?: { timeout?: number }): Promise<void>;
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建数据库客户端
 *
 * @example
 * ```ts
 * const client = createDatabaseClient({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'rapid_s',
 *   username: 'postgres',
 *   password: 'postgres',
 * });
 *
 * // 使用 Drizzle
 * const users = await client.db.select().from(usersTable);
 *
 * // 健康检查
 * const health = await client.healthCheck();
 *
 * // 关闭连接
 * await client.close();
 * ```
 */
export function createDatabaseClient(config: DatabaseConnectionConfig): DatabaseClient {
  const resolvedConfig = resolveConfig(config);

  // 创建 postgres-js 客户端
  const raw = postgres({
    host: resolvedConfig.host,
    port: resolvedConfig.port,
    database: resolvedConfig.database,
    username: resolvedConfig.username,
    password: resolvedConfig.password,
    ssl: resolvedConfig.ssl,
    max: resolvedConfig.maxConnections,
    idle_timeout: resolvedConfig.idleTimeout,
    max_lifetime: resolvedConfig.maxLifetime,
    connect_timeout: resolvedConfig.connectTimeout,
    prepare: resolvedConfig.prepare,
    connection: {
      application_name: resolvedConfig.applicationName,
    },
  });

  // 创建 Drizzle 实例
  const db = drizzle(raw) as RapidSDatabase;

  return {
    db,
    raw,
    config: resolvedConfig,

    async healthCheck(): Promise<DatabaseHealthStatus> {
      const startTime = performance.now();
      const checkedAt = new Date();

      try {
        await raw`SELECT 1`;
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

    async transaction<T>(fn: (tx: RapidSTransactionClient) => Promise<T>): Promise<T> {
      return db.transaction(fn);
    },

    async close(options?: { timeout?: number }): Promise<void> {
      const timeout = options?.timeout ?? 5;
      await raw.end({ timeout });
    },
  };
}

// ============================================================================
// URL 构建工具
// ============================================================================

/** 从配置构建连接 URL */
export function buildDatabaseUrl(config: {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
}): string {
  const { user, password, host, port, database } = config;
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
