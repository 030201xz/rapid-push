/**
 * Drizzle Kit 配置
 *
 * 数据库迁移和 Schema 管理工具配置
 */

import { defineConfig } from 'drizzle-kit';
import { getDatabaseUrl } from './src/common/env';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/*/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  // 支持自定义 PostgreSQL Schema，默认 public
  schemaFilter: [process.env.DATABASE_SCHEMA ?? 'public'],
  verbose: true,
  strict: true,
});
