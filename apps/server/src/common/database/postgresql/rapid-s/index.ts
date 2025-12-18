/**
 * rapid-s 数据库模块入口
 *
 * 导出：
 * - 数据库客户端工厂
 * - 类型定义
 * - 事务管理 API
 * - 初始化函数
 */

import { env } from '../../../env';
import { dbLogger } from '../../../logger';

// ============================================================================
// 类型导出
// ============================================================================

export type {
  // 数据库实例类型
  RapidSDatabase,
  RapidSTransactionClient,
  RapidSDbContext,
  // 配置类型
  DatabaseConnectionConfig,
  ResolvedDatabaseConfig,
  SSLConfig,
  // 健康检查类型
  DatabaseHealthStatus,
} from './types';

// ============================================================================
// 客户端导出
// ============================================================================

export {
  createDatabaseClient,
  buildDatabaseUrl,
  type DatabaseClient,
} from './client';

// ============================================================================
// 事务管理导出
// ============================================================================

export {
  getCurrentTransaction,
  getDbContext,
  runInTransaction,
  withTransaction,
  createTransactionWrapper,
} from './transaction';

// ============================================================================
// 全局单例
// ============================================================================

import { createDatabaseClient, type DatabaseClient } from './client';

/** 全局数据库客户端引用 */
let globalClient: DatabaseClient | null = null;

/**
 * 初始化数据库（从 env 自动读取配置）
 *
 * 在应用启动时自动调用
 */
export function initDatabase(): DatabaseClient {
  if (globalClient) {
    return globalClient;
  }

  dbLogger.debug('连接数据库', { host: env.database.host, port: env.database.port });

  globalClient = createDatabaseClient({
    host: env.database.host,
    port: env.database.port,
    database: env.database.name,
    username: env.database.user,
    password: env.database.password,
    maxConnections: env.database.pool.max,
    idleTimeout: env.database.pool.idleTimeout,
  });

  return globalClient;
}

/**
 * 获取全局数据库客户端
 *
 * @throws 如果未初始化
 */
export function getGlobalClient(): DatabaseClient {
  if (!globalClient) {
    // 自动初始化
    return initDatabase();
  }
  return globalClient;
}

/**
 * 获取全局 Drizzle 数据库实例（便捷访问）
 */
export function getDb(): DatabaseClient['db'] {
  return getGlobalClient().db;
}
