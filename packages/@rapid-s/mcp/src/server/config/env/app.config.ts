/**
 * 应用配置聚合
 *
 * 将环境变量转换为语义化的应用配置
 * 便于在代码中使用，同时保持类型安全
 */

import { env } from './env';

/** 服务器配置 */
export const serverConfig = {
  /** 服务端口 */
  port: env.port,

  /** 是否为开发环境 */
  isDevelopment: env.nodeEnv === 'development',

  /** 是否为生产环境 */
  isProduction: env.nodeEnv === 'production',

  /** 是否为测试环境 */
  isTest: env.nodeEnv === 'test',
} as const;

/** GraphQL 配置 */
export const graphqlConfig = {
  /** 是否启用 Playground */
  enablePlayground: env.enablePlayground,

  /** GraphQL 端点路径 */
  endpoint: '/graphql',
} as const;

/** 日志配置 */
export const loggerConfig = {
  /** 日志级别 */
  level: env.logLevel,

  /** 是否启用彩色输出（开发环境启用） */
  color: env.nodeEnv === 'development',

  /** 日志格式（生产环境使用 JSON） */
  format: env.nodeEnv === 'production' ? 'json' : 'pretty',
} as const;

/**
 * 构建数据库连接 URL
 * 优先使用环境变量中的完整 URL，否则从独立配置组合
 */
function buildDatabaseUrl(): string {
  const { url, user, password, host, port, name } = env.database;
  if (url) return url;
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}

/** 数据库配置 */
export const databaseConfig = {
  /** 数据库连接字符串 */
  url: buildDatabaseUrl(),

  /** 数据库主机 */
  host: env.database.host,

  /** 数据库端口 */
  port: env.database.port,

  /** 数据库用户名 */
  user: env.database.user,

  /** 数据库名称 */
  database: env.database.name,

  /** 数据库 Schema */
  schema: env.database.schema,

  /** 是否启用查询日志（开发环境启用） */
  logging: env.nodeEnv === 'development',

  /** 连接池配置 */
  pool: env.database.pool,
} as const;

/** 应用配置类型 */
export type ServerConfig = typeof serverConfig;
export type GraphQLConfig = typeof graphqlConfig;
export type LoggerConfig = typeof loggerConfig;
export type DatabaseConfig = typeof databaseConfig;
