/**
 * 数据库连接工具
 *
 * 复用主应用的数据库连接配置
 */

import {
  createDatabaseClient,
  type DatabaseClient,
} from '@/common/database/postgresql/rapid-s';
import { createLogger } from '@rapid-s/logger';
import { env } from '../0-env';

/** 初始化脚本专用 Logger */
export const initLogger = createLogger({
  namespace: 'Init',
  level: 'debug',
  format: 'pretty',
  timestamp: true,
  color: true,
});

/** 数据库连接实例 */
let dbClient: DatabaseClient | null = null;

/**
 * 创建数据库连接
 *
 * 单例模式，重复调用返回同一实例
 */
export function createDbConnection(): DatabaseClient {
  if (dbClient) {
    return dbClient;
  }

  initLogger.info('连接数据库...', {
    host: env.database.host,
    port: env.database.port,
    database: env.database.name,
  });

  dbClient = createDatabaseClient({
    host: env.database.host,
    port: env.database.port,
    database: env.database.name,
    username: env.database.user,
    password: env.database.password,
    maxConnections: 1,
  });

  return dbClient;
}

/**
 * 关闭数据库连接
 */
export async function closeDbConnection(): Promise<void> {
  if (dbClient) {
    await dbClient.close();
    dbClient = null;
    initLogger.info('数据库连接已关闭');
  }
}

/**
 * 获取数据库实例
 */
export function getDb(): DatabaseClient['db'] {
  const client = createDbConnection();
  return client.db;
}

export { initLogger as logger };
