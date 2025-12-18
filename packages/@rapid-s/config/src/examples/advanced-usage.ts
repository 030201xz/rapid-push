/**
 * 高级用法示例
 *
 * 展示结构化配置的高级特性
 */

import { z } from "zod";
import {
  booleanSchema,
  createEnv,
  durationSchema,
  hostSchema,
  jsonSchema,
  portSchema,
} from "../index";

// ============================================================================
// 示例 1: 完整的数据库配置
// ============================================================================

/**
 * 使用结构化配置管理复杂的数据库设置
 * 所有配置自动映射到扁平环境变量
 */
export const dbEnv = createEnv({
  schema: {
    database: {
      /** 数据库连接 URL（可选） -> DATABASE_URL */
      url: z.url().optional(),
      /** 主机 -> DATABASE_HOST */
      host: hostSchema.default("localhost"),
      /** 端口 -> DATABASE_PORT */
      port: portSchema.default(5432),
      /** 用户名 -> DATABASE_USER */
      user: z.string().default("postgres"),
      /** 密码 -> DATABASE_PASSWORD */
      password: z.string().default(""),
      /** 数据库名 -> DATABASE_NAME */
      name: z.string().default("mydb"),

      /** SSL 配置 */
      ssl: {
        /** 是否启用 SSL -> DATABASE_SSL_ENABLED */
        enabled: booleanSchema.default(false),
        /** 是否拒绝未授权证书 -> DATABASE_SSL_REJECT_UNAUTHORIZED */
        rejectUnauthorized: booleanSchema.default(true),
      },

      /** 连接池配置 */
      pool: {
        /** 最大连接数 -> DATABASE_POOL_MAX */
        max: z.coerce.number().int().min(1).max(100).default(10),
        /** 最小连接数 -> DATABASE_POOL_MIN */
        min: z.coerce.number().int().min(0).default(2),
        /** 空闲超时（秒） -> DATABASE_POOL_IDLE_TIMEOUT */
        idleTimeout: z.coerce.number().int().min(0).default(30),
        /** 连接超时（秒） -> DATABASE_POOL_CONNECT_TIMEOUT */
        connectTimeout: z.coerce.number().int().min(1).default(10),
      },
    },
  },
});

// 构建连接 URL 的辅助函数
export function buildConnectionUrl() {
  const { url, user, password, host, port, name } = dbEnv.database;
  if (url) return url;
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}

// ============================================================================
// 示例 2: JSON 配置解析
// ============================================================================

/**
 * 使用 jsonSchema 解析复杂的 JSON 配置
 * 场景：从环境变量中读取 JSON 格式的配置
 */

// 定义 JSON 配置的结构
const featureFlagsSchema = z.object({
  enableNewUI: z.boolean().default(false),
  maxUploadSize: z.number().default(10),
  allowedOrigins: z.array(z.string()).default([]),
});

export const featureEnv = createEnv({
  schema: {
    /** 特性开关（JSON 格式） -> FEATURE_FLAGS */
    featureFlags: jsonSchema(featureFlagsSchema),
  },
  runtimeEnv: {
    FEATURE_FLAGS: JSON.stringify({
      enableNewUI: true,
      maxUploadSize: 20,
      allowedOrigins: ["https://example.com"],
    }),
  },
});

// 类型安全的访问
// featureEnv.featureFlags.enableNewUI   -> boolean
// featureEnv.featureFlags.maxUploadSize -> number
// featureEnv.featureFlags.allowedOrigins -> string[]

// ============================================================================
// 示例 3: 缓存和时间配置
// ============================================================================

/**
 * 使用 durationSchema 处理时间配置
 * 自动将 "1h", "30m", "60s" 等格式转换为毫秒
 */
export const cacheEnv = createEnv({
  schema: {
    cache: {
      /** 缓存 TTL -> CACHE_TTL */
      ttl: durationSchema,
      /** 是否启用 -> CACHE_ENABLED */
      enabled: booleanSchema.default(true),
    },
    session: {
      /** Session 超时 -> SESSION_TIMEOUT */
      timeout: durationSchema,
      /** 刷新间隔 -> SESSION_REFRESH_INTERVAL */
      refreshInterval: durationSchema,
    },
  },
  runtimeEnv: {
    CACHE_TTL: "1h", // -> 3600000 毫秒
    SESSION_TIMEOUT: "30m", // -> 1800000 毫秒
    SESSION_REFRESH_INTERVAL: "5m", // -> 300000 毫秒
  },
});

// ============================================================================
// 示例 4: 与外部配置源结合
// ============================================================================

/**
 * 从 Consul 或其他配置中心获取配置，合并后验证
 */
function createConfigFromConsul(consulData: Record<string, string>) {
  // 合并 Consul 配置和环境变量
  const mergedEnv = {
    ...process.env,
    ...consulData,
  };

  return createEnv({
    schema: {
      api: {
        host: hostSchema,
        port: portSchema,
        timeout: z.coerce.number().default(5000),
      },
    },
    runtimeEnv: mergedEnv,
  });
}

// 使用示例
export const apiConfig = createConfigFromConsul({
  API_HOST: "api.example.com",
  API_PORT: "443",
  API_TIMEOUT: "10000",
});
