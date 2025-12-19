/**
 * 环境变量 Schema 定义
 *
 * 使用 @rapid-s/config 实现类型安全 + 运行时校验
 */

import {
  createEnv,
  databaseUrlSchema,
  hostSchema,
  logLevelSchema,
  nodeEnvSchema,
  portSchema,
} from '@rapid-s/config';
import { join } from 'node:path';
import { z } from 'zod';

/** 存储类型 Schema */
const storageTypeSchema = z.enum(['local', 's3', 'r2', 'webdav']);

export const env = createEnv({
  schema: {
    // ========== 服务配置 ==========
    host: hostSchema.default('localhost'),
    /** 服务端口 -> PORT */
    port: portSchema.default(3000),
    /** 运行环境 -> NODE_ENV */
    nodeEnv: nodeEnvSchema.default('development'),
    /** 日志级别 -> LOG_LEVEL */
    logLevel: logLevelSchema.default('info'),

    // ========== JWT 认证配置 ==========
    /** JWT 密钥 -> JWT_SECRET */
    jwtSecret: z
      .string()
      .min(32)
      .default('your-super-secret-key-change-in-production'),
    /** JWT 过期时间 -> JWT_EXPIRES_IN */
    jwtExpiresIn: z.string().default('7d'),

    // ========== 数据库配置 ==========
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
      /** PostgreSQL Schema（命名空间）-> DATABASE_SCHEMA */
      schema: z.string().optional(),

      /** 连接池配置 */
      pool: {
        /** 最大连接数 -> DATABASE_POOL_MAX */
        max: z.coerce.number().int().min(1).max(100).default(10),
        /** 空闲超时 -> DATABASE_POOL_IDLE_TIMEOUT */
        idleTimeout: z.coerce.number().int().min(0).default(20),
      },
    },

    // ========== Redis 配置 ==========
    redis: {
      /** 主机 -> REDIS_HOST */
      host: hostSchema.default('localhost'),
      /** 端口 -> REDIS_PORT */
      port: portSchema.default(6379),
      /** 密码 -> REDIS_PASSWORD */
      password: z.string().optional(),
      /** 数据库编号 -> REDIS_DB */
      db: z.coerce.number().int().min(0).max(15).default(0),
      /** 键前缀 -> REDIS_KEY_PREFIX */
      keyPrefix: z.string().default(''),
      /** 连接超时毫秒数 -> REDIS_CONNECT_TIMEOUT */
      connectTimeout: z.coerce.number().int().min(0).default(10_000),
      /** 每次请求最大重试次数 -> REDIS_MAX_RETRIES */
      maxRetriesPerRequest: z.coerce.number().int().min(0).default(3),
    },

    // ========== 存储配置 ==========
    storage: {
      /** 存储类型 -> STORAGE_TYPE */
      type: storageTypeSchema.default('local'),
      /** 本地存储路径 -> STORAGE_LOCAL_PATH */
      localPath: z.string().default(join(process.cwd(), 'storage')),

      // S3 配置
      /** S3 存储桶 -> S3_BUCKET */
      s3Bucket: z.string().optional(),
      /** S3 访问密钥 ID -> S3_ACCESS_KEY_ID */
      s3AccessKeyId: z.string().optional(),
      /** S3 访问密钥 -> S3_SECRET_ACCESS_KEY */
      s3SecretAccessKey: z.string().optional(),
      /** S3 端点 -> S3_ENDPOINT */
      s3Endpoint: z.string().optional(),
      /** S3 区域 -> S3_REGION */
      s3Region: z.string().optional(),

      // R2 配置
      /** R2 账户 ID -> R2_ACCOUNT_ID */
      r2AccountId: z.string().optional(),
      /** R2 存储桶 -> R2_BUCKET */
      r2Bucket: z.string().optional(),
      /** R2 访问密钥 ID -> R2_ACCESS_KEY_ID */
      r2AccessKeyId: z.string().optional(),
      /** R2 访问密钥 -> R2_SECRET_ACCESS_KEY */
      r2SecretAccessKey: z.string().optional(),

      // WebDAV 配置
      /** WebDAV URL -> WEBDAV_URL */
      webdavUrl: z.string().optional(),
      /** WebDAV 用户名 -> WEBDAV_USERNAME */
      webdavUsername: z.string().optional(),
      /** WebDAV 密码 -> WEBDAV_PASSWORD */
      webdavPassword: z.string().optional(),
    },
  },
});

/** 环境变量类型（自动推导） */
export type Env = typeof env;
