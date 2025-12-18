/**
 * createEnv 核心实现
 *
 * 支持结构化配置的类型安全环境变量管理
 * 自动将嵌套 schema 映射到扁平环境变量
 */

import { z } from "zod";
import type {
  CreateEnvOptions,
  EnvValidationError,
  InferNestedSchema,
  NestedSchema,
  NestedSchemaRecord,
} from "./types";

/**
 * 判断是否为 Zod Schema
 */
function isZodSchema(value: NestedSchema): value is z.ZodTypeAny {
  return value instanceof z.ZodType;
}

/**
 * camelCase 转 SCREAMING_SNAKE_CASE
 *
 * @example
 * camelToScreamingSnake('poolMax') // 'POOL_MAX'
 * camelToScreamingSnake('databaseHost') // 'DATABASE_HOST'
 */
function camelToScreamingSnake(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toUpperCase();
}

/**
 * 展平嵌套 Schema 为环境变量映射
 *
 * @returns Map<环境变量名, { schema: ZodSchema, path: 属性路径数组 }>
 */
function flattenSchema(
  schema: NestedSchemaRecord,
  prefix: string[] = []
): Map<string, { schema: z.ZodTypeAny; path: string[] }> {
  const result = new Map<string, { schema: z.ZodTypeAny; path: string[] }>();

  for (const [key, value] of Object.entries(schema)) {
    const currentPath = [...prefix, key];

    if (isZodSchema(value)) {
      // 叶子节点：生成环境变量名
      const envKey = currentPath.map(camelToScreamingSnake).join("_");
      result.set(envKey, { schema: value, path: currentPath });
    } else {
      // 嵌套对象：递归展平
      const nested = flattenSchema(value, currentPath);
      for (const [k, v] of nested) {
        result.set(k, v);
      }
    }
  }

  return result;
}

/**
 * 将扁平数据重组为嵌套结构
 */
function unflattenData(
  flatData: Record<string, unknown>,
  schemaMap: Map<string, { schema: z.ZodTypeAny; path: string[] }>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [envKey, { path }] of schemaMap) {
    const value = flatData[envKey];

    // 沿路径创建嵌套结构
    let current = result;
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (!(segment in current)) {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }

    // 设置叶子值
    const leafKey = path[path.length - 1];
    current[leafKey] = value;
  }

  return result;
}

/**
 * 默认验证错误处理器
 */
function defaultOnValidationError(error: z.ZodError): never {
  const formattedErrors = error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `  ❌ ${path}: ${issue.message}`;
  });

  const message = [
    "",
    "┌─────────────────────────────────────────────────────┐",
    "│          环境变量验证失败 / Invalid Env             │",
    "└─────────────────────────────────────────────────────┘",
    "",
    ...formattedErrors,
    "",
  ].join("\n");

  throw new Error(message);
}

/**
 * 将 Zod 错误转换为标准化错误格式
 */
export function formatZodError(error: z.ZodError): EnvValidationError[] {
  return error.issues.map((issue) => ({
    variable: issue.path.join("."),
    message: issue.message,
    expected: "expected" in issue ? String(issue.expected) : undefined,
    received: "received" in issue ? String(issue.received) : undefined,
  }));
}

/**
 * 创建类型安全的结构化环境变量配置
 *
 * 支持嵌套 schema 定义，自动映射到扁平环境变量
 *
 * @example
 * ```typescript
 * import { createEnv, portSchema, hostSchema } from '@x/config';
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
 *         idleTimeout: z.coerce.number().default(20), // -> DATABASE_POOL_IDLE_TIMEOUT
 *       },
 *     },
 *   },
 * });
 *
 * // 类型安全的结构化访问
 * env.port                    // number
 * env.database.host           // string
 * env.database.pool.max       // number
 * ```
 */
export function createEnv<TSchema extends NestedSchemaRecord>(
  options: CreateEnvOptions<TSchema>
): InferNestedSchema<TSchema> {
  const {
    schema,
    runtimeEnv = process.env,
    emptyStringAsUndefined = true,
    skipValidation = false,
    onValidationError = defaultOnValidationError,
  } = options;

  // 展平嵌套 schema
  const schemaMap = flattenSchema(schema);

  // 预处理环境变量值
  const processedEnv: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(runtimeEnv)) {
    if (emptyStringAsUndefined && value === "") {
      processedEnv[key] = undefined;
    } else {
      processedEnv[key] = value;
    }
  }

  // 跳过验证模式
  if (skipValidation) {
    console.warn("⚠️ 环境变量验证已跳过，生产环境请勿使用此选项");
    const flatData: Record<string, unknown> = {};
    for (const envKey of schemaMap.keys()) {
      flatData[envKey] = processedEnv[envKey];
    }
    return Object.freeze(
      unflattenData(flatData, schemaMap)
    ) as InferNestedSchema<TSchema>;
  }

  // 构建扁平 Zod Schema
  const flatSchemaShape: Record<string, z.ZodTypeAny> = {};
  for (const [envKey, { schema: zodSchema }] of schemaMap) {
    flatSchemaShape[envKey] = zodSchema;
  }
  const flatSchema = z.object(flatSchemaShape);

  // 执行验证
  const parsed = flatSchema.safeParse(processedEnv);

  if (!parsed.success) {
    return onValidationError(parsed.error);
  }

  // 将验证后的扁平数据重组为嵌套结构
  const nestedData = unflattenData(parsed.data, schemaMap);

  return Object.freeze(nestedData) as InferNestedSchema<TSchema>;
}
