/**
 * @x/config - 类型安全的结构化配置管理
 *
 * 支持嵌套 schema 定义，自动映射到扁平环境变量
 *
 * @example
 * ```typescript
 * import { createEnv, portSchema, hostSchema, nodeEnvSchema } from '@x/config';
 * import { z } from 'zod';
 *
 * export const env = createEnv({
 *   schema: {
 *     port: portSchema.default(4000),           // -> PORT
 *     nodeEnv: nodeEnvSchema,                   // -> NODE_ENV
 *     database: {
 *       host: hostSchema.default('localhost'),  // -> DATABASE_HOST
 *       port: portSchema.default(5432),         // -> DATABASE_PORT
 *       pool: {
 *         max: z.coerce.number().default(10),   // -> DATABASE_POOL_MAX
 *       },
 *     },
 *   },
 * });
 *
 * // 类型安全的结构化访问
 * env.port                    // number
 * env.nodeEnv                 // 'development' | 'production' | 'test'
 * env.database.host           // string
 * env.database.pool.max       // number
 * ```
 *
 * @packageDocumentation
 */

// 核心函数
export { createEnv, formatZodError } from "./create-env";

// 类型定义
export type {
  CreateEnvOptions,
  EnvValidationError,
  InferNestedSchema,
  NestedSchema,
  NestedSchemaRecord,
  RuntimeEnvSource,
} from "./types";

// 预设 Schema
export {
  apiKeySchema,
  booleanSchema,
  // Schema 工厂
  createDatabaseSchema,
  createRedisSchema,
  createServiceSchema,
  databaseUrlSchema,
  // 时间相关
  durationSchema,
  hostSchema,
  integerSchema,
  jsonSchema,
  jwtSecretSchema,
  logLevelSchema,
  // 环境相关
  nodeEnvSchema,
  // 基础类型转换
  numberSchema,
  // 网络相关
  portSchema,
  redisUrlSchema,
  // 安全相关
  secretSchema,
  strictBooleanSchema,
  stringArraySchema,
  timestampSchema,
  urlSchema,
} from "./presets";
