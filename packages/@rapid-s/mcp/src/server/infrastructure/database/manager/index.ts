/**
 * 数据库管理器模块导出
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../schema';
import { DatabaseManager } from './database-manager';
import { DatabaseStatus, type ConnectionStats } from './types';

// 导出类和类型
export { DatabaseManager } from './database-manager';
export { DatabaseStatus, type ConnectionStats } from './types';

/**
 * 便捷函数：获取数据库实例
 *
 * @returns 数据库实例
 * @throws 如果数据库未初始化
 */
export function getDatabase(): PostgresJsDatabase<typeof schema> {
  return DatabaseManager.getInstance().getDatabase();
}

/**
 * 便捷函数：初始化数据库连接
 */
export async function initializeDatabase(): Promise<void> {
  await DatabaseManager.getInstance().initialize();
}

/**
 * 便捷函数：关闭数据库连接
 */
export async function shutdownDatabase(): Promise<void> {
  await DatabaseManager.getInstance().shutdown();
}

/**
 * 便捷函数：获取连接状态
 */
export function getDatabaseStatus(): DatabaseStatus {
  return DatabaseManager.getInstance().getStatus();
}

/**
 * 便捷函数：获取连接统计
 */
export function getDatabaseStats(): ConnectionStats {
  return DatabaseManager.getInstance().getStats();
}

/**
 * 便捷函数：健康检查
 */
export async function healthCheck(): Promise<boolean> {
  return await DatabaseManager.getInstance().healthCheck();
}
