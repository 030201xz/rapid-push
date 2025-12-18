/**
 * @x/config 核心类型定义
 *
 * 支持结构化配置的类型安全环境变量管理
 */

import type { z } from "zod";

/**
 * 嵌套 Schema 类型
 * 可以是 Zod Schema 或嵌套对象
 */
export type NestedSchema = z.ZodTypeAny | NestedSchemaRecord;

/**
 * 嵌套 Schema 记录类型
 */
export type NestedSchemaRecord = {
  [key: string]: NestedSchema;
};

/**
 * 递归推导嵌套 Schema 的类型
 *
 * @example
 * ```typescript
 * const schema = {
 *   port: z.number(),
 *   database: {
 *     host: z.string(),
 *     pool: { max: z.number() }
 *   }
 * };
 * type Config = InferNestedSchema<typeof schema>;
 * // { port: number; database: { host: string; pool: { max: number } } }
 * ```
 */
export type InferNestedSchema<T> = T extends z.ZodTypeAny
  ? z.infer<T>
  : T extends NestedSchemaRecord
    ? { readonly [K in keyof T]: InferNestedSchema<T[K]> }
    : never;

/**
 * 配置来源类型
 */
export type RuntimeEnvSource =
  | NodeJS.ProcessEnv
  | Record<string, string | undefined>;

/**
 * createEnv 配置选项
 *
 * @template TSchema 服务端配置 Schema（支持嵌套）
 */
export interface CreateEnvOptions<TSchema extends NestedSchemaRecord> {
  /**
   * 配置 Schema 定义
   * 支持嵌套结构，自动映射到扁平环境变量
   *
   * @example
   * ```typescript
   * schema: {
   *   port: portSchema,           // -> PORT
   *   database: {
   *     host: hostSchema,         // -> DATABASE_HOST
   *     pool: {
   *       max: z.number()         // -> DATABASE_POOL_MAX
   *     }
   *   }
   * }
   * ```
   */
  schema: TSchema;

  /**
   * 运行时环境变量来源
   * @default process.env
   */
  runtimeEnv?: RuntimeEnvSource;

  /**
   * 将空字符串视为 undefined
   * @default true
   */
  emptyStringAsUndefined?: boolean;

  /**
   * 是否跳过验证（仅用于测试）
   * @default false
   */
  skipValidation?: boolean;

  /**
   * 验证失败时的错误处理器
   */
  onValidationError?: (error: z.ZodError) => never;
}

/**
 * 标准化的验证错误类型
 */
export interface EnvValidationError {
  /** 出错的变量名 */
  variable: string;
  /** 错误消息 */
  message: string;
  /** 期望的类型 */
  expected?: string;
  /** 实际收到的值 */
  received?: string;
}

/**
 * 配置验证结果
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: EnvValidationError[] };
