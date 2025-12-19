/**
 * Drizzle Kit 配置
 *
 * 数据库迁移和 Schema 管理工具配置
 */

import { defineConfig } from 'drizzle-kit';
import { getDatabaseUrl } from './src/common/env';

export default defineConfig({
  dialect: 'postgresql',
  // 同时匹配 schema.ts 和 *.schema.ts 两种命名模式
  schema: [
    './src/modules/**/schema.ts',
    './src/modules/**/*.schema.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  // 支持自定义 PostgreSQL Schema，与代码中 appSchema 保持一致
  schemaFilter: [process.env.DATABASE_SCHEMA ?? 'rapid_s'],
  verbose: true,
  strict: true,
});
