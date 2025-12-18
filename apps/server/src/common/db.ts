import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseUrl, env } from './env';
import { dbLogger } from './logger';

// ========== PostgreSQL 连接（postgres-js，性能更强） ==========
const connectionUrl = getDatabaseUrl();
dbLogger.debug('连接数据库', { host: env.database.host, port: env.database.port });

const client = postgres(connectionUrl, {
  max: env.database.pool.max,
  idle_timeout: env.database.pool.idleTimeout,
});

// ========== Drizzle 实例 ==========
export const db = drizzle(client);

// 类型导出，用于依赖注入
export type Database = typeof db;
