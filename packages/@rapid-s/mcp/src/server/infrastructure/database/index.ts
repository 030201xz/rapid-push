/**
 * 数据库模块统一导出
 */

// 导出数据库管理器
export {
  DatabaseManager,
  DatabaseStatus,
  getDatabase,
  getDatabaseStats,
  getDatabaseStatus,
  healthCheck,
  initializeDatabase,
  shutdownDatabase,
  type ConnectionStats,
} from './manager';

// 导出 schema
export * from './schema';
