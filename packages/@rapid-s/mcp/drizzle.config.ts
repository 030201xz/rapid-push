/**
 * Drizzle Kit 配置
 *
 * 数据库迁移和 Schema 管理工具配置
 * 使用 src/config 的类型安全配置
 */

import type { Config } from 'drizzle-kit';
import { databaseConfig } from './src/server/config';

export default {
  // 输出目录
  out: './drizzle',

  // Schema 定义文件
  schema: './src/server/infrastructure/database/schema/index.ts',

  // 数据库方言
  dialect: 'postgresql',

  // 数据库连接凭证（使用应用配置）
  dbCredentials: {
    url: databaseConfig.url,
  },

  // 操作的 Schema（PostgreSQL schema）
  schemaFilter: [databaseConfig.schema],

  // 详细输出
  verbose: true,

  // 严格模式
  strict: true,
} satisfies Config;
