import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './env';

// ========== PostgreSQL 连接（postgres-js，性能更强） ==========
const client = postgres(env.DATABASE_URL);

// ========== Drizzle 实例 ==========
export const db = drizzle(client);

// 类型导出，用于依赖注入
export type Database = typeof db;
