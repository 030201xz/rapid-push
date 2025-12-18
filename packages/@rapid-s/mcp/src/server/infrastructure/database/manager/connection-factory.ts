/**
 * 数据库连接工厂
 *
 * 负责创建 postgres.js 连接和 Drizzle 实例
 * 使用类型安全的配置系统
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { databaseConfig } from '../../../config';
import * as schema from '../schema';

/** 数据库连接结果类型 - 从 postgres 返回类型推导 */
export interface DatabaseConnectionResult {
  connection: ReturnType<typeof postgres>;
  db: PostgresJsDatabase<typeof schema>;
}

/**
 * 创建数据库连接
 *
 * 使用配置层的数据库和连接池配置
 * @returns 数据库连接和 Drizzle 实例
 */
export function createConnection(): DatabaseConnectionResult {
  const { url, pool, logging } = databaseConfig;

  // 使用类型安全的连接池配置创建 postgres.js 连接
  const connection = postgres(url, {
    max: pool.max,
    idle_timeout: pool.idleTimeout,
    connect_timeout: pool.connectTimeout,
    max_lifetime: pool.maxLifetime,
    prepare: false, // 禁用预编译语句，提高连接稳定性
  });

  // 创建 Drizzle 实例，带 schema 类型
  const db = drizzle(connection, {
    schema,
    logger: logging,
  });

  return { connection, db };
}
