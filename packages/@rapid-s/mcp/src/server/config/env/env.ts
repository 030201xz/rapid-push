/**
 * 环境变量配置
 *
 * 使用 @x/config 实现类型安全的结构化环境变量管理
 * 支持嵌套定义，自动映射到扁平环境变量
 */

import {
  booleanSchema,
  createEnv,
  hostSchema,
  logLevelSchema,
  nodeEnvSchema,
  portSchema,
} from '@x/config';
import { z } from 'zod';

/**
 * 环境变量配置 - 结构化定义，类型自动推导
 *
 * 映射规则：camelCase -> SCREAMING_SNAKE_CASE
 * 嵌套用下划线分隔，如 database.pool.max -> DATABASE_POOL_MAX
 */
export const env = createEnv({
  schema: {
    /** 服务端口 -> PORT */
    port: portSchema.default(4000),

    /** 运行环境 -> NODE_ENV */
    nodeEnv: nodeEnvSchema.default('development'),

    /** 是否启用 GraphQL Playground -> ENABLE_PLAYGROUND */
    enablePlayground: booleanSchema.default(true),

    /** 日志级别 -> LOG_LEVEL */
    logLevel: logLevelSchema.default('info'),

    /** 数据库配置 */
    database: {
      /** 数据库连接字符串（优先使用，可选） -> DATABASE_URL */
      url: z.url().optional(),

      /** 数据库主机 -> DATABASE_HOST */
      host: hostSchema.default('localhost'),

      /** 数据库端口 -> DATABASE_PORT */
      port: portSchema.default(5434),

      /** 数据库用户名 -> DATABASE_USER */
      user: z.string().min(1).default('postgres'),

      /** 数据库密码 -> DATABASE_PASSWORD */
      password: z.string().min(1).default('postgres123'),

      /** 数据库名称 -> DATABASE_NAME */
      name: z.string().min(1).default('ego_db'),

      /** 数据库 Schema -> DATABASE_SCHEMA */
      schema: z.string().min(1).default('ego'),

      /** 连接池配置 */
      pool: {
        /** 最大连接数 -> DATABASE_POOL_MAX */
        max: z.coerce.number().int().min(1).max(100).default(10),

        /** 空闲超时（秒） -> DATABASE_POOL_IDLE_TIMEOUT */
        idleTimeout: z.coerce.number().int().min(0).default(20),

        /** 连接超时（秒） -> DATABASE_POOL_CONNECT_TIMEOUT */
        connectTimeout: z.coerce.number().int().min(1).default(10),

        /** 最大存活时间（秒） -> DATABASE_POOL_MAX_LIFETIME */
        maxLifetime: z.coerce.number().int().min(0).default(3600),
      },
    },
  },
});

/** 环境变量类型导出 */
export type Env = typeof env;
