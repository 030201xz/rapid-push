/**
 * 环境变量工具函数
 */

import { env } from './schema';

/**
 * 构建数据库连接 URL
 *
 * 优先使用 DATABASE_URL，否则从各字段拼接
 */
export function getDatabaseUrl(): string {
  if (env.database.url) return env.database.url;

  const { user, password, host, port, name } = env.database;
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}
