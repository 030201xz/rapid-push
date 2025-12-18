import {
  createEnv,
  portSchema,
  hostSchema,
  nodeEnvSchema,
  logLevelSchema,
  databaseUrlSchema,
} from '@rapid-s/config';
import { z } from 'zod';

// ========== 结构化环境变量配置 ==========
// 使用 @rapid-s/config 实现类型安全 + 运行时校验
export const env = createEnv({
  schema: {
    // 服务配置
    /** 服务端口 -> PORT */
    port: portSchema.default(3000),
    /** 运行环境 -> NODE_ENV */
    nodeEnv: nodeEnvSchema.default('development'),
    /** 日志级别 -> LOG_LEVEL */
    logLevel: logLevelSchema.default('info'),

    // 数据库配置（支持嵌套结构）
    database: {
      /** 连接 URL -> DATABASE_URL */
      url: databaseUrlSchema.optional(),
      /** 主机 -> DATABASE_HOST */
      host: hostSchema.default('localhost'),
      /** 端口 -> DATABASE_PORT */
      port: portSchema.default(5433),
      /** 用户名 -> DATABASE_USER */
      user: z.string().default('postgres'),
      /** 密码 -> DATABASE_PASSWORD */
      password: z.string().default('postgres'),
      /** 数据库名 -> DATABASE_NAME */
      name: z.string().default('rapid_s'),

      /** 连接池配置 */
      pool: {
        /** 最大连接数 -> DATABASE_POOL_MAX */
        max: z.coerce.number().int().min(1).max(100).default(10),
        /** 空闲超时 -> DATABASE_POOL_IDLE_TIMEOUT */
        idleTimeout: z.coerce.number().int().min(0).default(20),
      },
    },
  },
});

// ========== 构建数据库连接 URL ==========
export function getDatabaseUrl(): string {
  if (env.database.url) return env.database.url;
  const { user, password, host, port, name } = env.database;
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}

// 类型自动推导
export type Env = typeof env;
