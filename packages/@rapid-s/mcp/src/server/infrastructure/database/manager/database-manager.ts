/**
 * 数据库管理器 - 单例模式
 *
 * 提供统一的数据库连接管理和生命周期控制
 * 使用类型安全的 Logger 服务
 */

import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type postgres from 'postgres';
import { createAppLogger, type Logger } from '../../logger';
import * as schema from '../schema';
import { createConnection } from './connection-factory';
import { DatabaseStatus, type ConnectionStats } from './types';

/**
 * 数据库管理器
 *
 * 单例模式，负责数据库连接的创建、管理和销毁
 */
export class DatabaseManager {
  private static instance: DatabaseManager;

  private connection: ReturnType<typeof postgres> | null = null;
  private db: PostgresJsDatabase<typeof schema> | null = null;
  private status: DatabaseStatus = DatabaseStatus.DISCONNECTED;
  private connectionStartTime?: Date;
  private readonly logger: Logger;

  private constructor() {
    this.logger = createAppLogger('DatabaseManager');
  }

  /**
   * 获取数据库管理器实例
   */
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * 初始化数据库连接
   */
  async initialize(): Promise<void> {
    if (this.status === DatabaseStatus.CONNECTED) {
      this.logger.debug('数据库已连接，跳过初始化');
      return;
    }

    try {
      this.status = DatabaseStatus.CONNECTING;
      this.logger.info('🔌 正在初始化数据库连接...');

      // 创建连接
      const result = createConnection();
      this.connection = result.connection;
      this.db = result.db;

      // 验证连接
      await this.verifyConnection();

      this.connectionStartTime = new Date();
      this.status = DatabaseStatus.CONNECTED;
      this.logger.info('✅ 数据库连接初始化完成');
    } catch (error) {
      this.status = DatabaseStatus.ERROR;
      this.logger.error('❌ 数据库连接初始化失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      // 清理失败的连接
      await this.cleanup();
      throw error;
    }
  }

  /**
   * 验证数据库连接
   */
  private async verifyConnection(): Promise<void> {
    if (!this.db) {
      throw new Error('数据库实例未创建');
    }

    // 执行简单查询验证连接（使用 sql 模板标签）
    await this.db.execute(sql`SELECT 1`);
  }

  /**
   * 清理连接资源
   */
  private async cleanup(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.end();
      } catch (cleanupError) {
        this.logger.warn('清理连接时出错', {
          error:
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
        });
      }
      this.connection = null;
    }
    this.db = null;
  }

  /**
   * 获取数据库实例
   *
   * @throws 如果数据库未初始化
   */
  getDatabase(): PostgresJsDatabase<typeof schema> {
    if (!this.db) {
      throw new Error('数据库未初始化，请先调用 initialize()');
    }
    return this.db;
  }

  /**
   * 获取连接状态
   */
  getStatus(): DatabaseStatus {
    return this.status;
  }

  /**
   * 获取运行时间（毫秒）
   */
  getUptime(): number {
    if (!this.connectionStartTime) {
      return 0;
    }
    return Date.now() - this.connectionStartTime.getTime();
  }

  /**
   * 获取连接统计信息
   */
  getStats(): ConnectionStats {
    return {
      status: this.status,
      uptime: this.getUptime(),
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.verifyConnection();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 关闭数据库连接
   */
  async shutdown(): Promise<void> {
    this.logger.info('🔌 正在关闭数据库连接...');
    await this.cleanup();
    this.status = DatabaseStatus.DISCONNECTED;
    this.connectionStartTime = undefined;
    this.logger.info('✅ 数据库连接已关闭');
  }
}
