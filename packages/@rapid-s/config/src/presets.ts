/**
 * 常用 Schema 预设
 *
 * 提供后端服务常见配置项的类型安全 Schema
 */

import { z } from "zod";

// ============================================================================
// 基础类型转换 Schema
// ============================================================================

/**
 * 字符串转数字
 * 将环境变量字符串转换为数字类型
 */
export const numberSchema = z.string().transform((val) => {
  const num = Number(val);
  if (Number.isNaN(num)) {
    throw new Error(`无法将 "${val}" 转换为数字`);
  }
  return num;
});

/**
 * 字符串转整数
 * 确保结果为整数
 */
export const integerSchema = z.string().transform((val) => {
  const num = Number.parseInt(val, 10);
  if (Number.isNaN(num)) {
    throw new Error(`无法将 "${val}" 转换为整数`);
  }
  return num;
});

/**
 * 字符串转布尔值
 * 支持 "true", "1", "yes" 等常见表示
 */
export const booleanSchema = z.string().transform((val) => {
  const lowered = val.toLowerCase().trim();
  return lowered === "true" || lowered === "1" || lowered === "yes";
});

/**
 * 严格布尔值 Schema
 * 仅接受 "true" 或 "false"
 */
export const strictBooleanSchema = z
  .string()
  .refine((val) => val === "true" || val === "false", {
    message: '值必须为 "true" 或 "false"',
  })
  .transform((val) => val === "true");

/**
 * 字符串数组 Schema
 * 将逗号分隔的字符串转换为数组
 */
export const stringArraySchema = z.string().transform((val) =>
  val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

/**
 * JSON Schema
 * 解析 JSON 字符串
 */
export function jsonSchema<T extends z.ZodTypeAny>(schema: T) {
  return z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      const result = schema.safeParse(parsed);
      if (!result.success) {
        // Zod v4: 使用字符串字面量代替弃用的 ZodIssueCode
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            code: "custom",
            message: issue.message,
            path: issue.path,
          });
        });
        return z.NEVER;
      }
      return result.data as z.infer<T>;
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "无效的 JSON 格式",
      });
      return z.NEVER;
    }
  });
}

// ============================================================================
// 网络相关 Schema
// ============================================================================

/**
 * 端口号 Schema
 * 验证有效端口范围 (1-65535)
 */
export const portSchema = z
  .string()
  .transform((val) => Number.parseInt(val, 10))
  .refine((val) => val >= 1 && val <= 65535, {
    message: "端口号必须在 1-65535 范围内",
  });

/**
 * URL Schema
 * 验证有效 URL 格式
 */
export const urlSchema = z.string().url("无效的 URL 格式");

/**
 * 数据库连接 URL Schema
 * 支持常见数据库连接格式
 */
export const databaseUrlSchema = z.string().refine(
  (val) => {
    const protocols = [
      "postgres://",
      "postgresql://",
      "mysql://",
      "mongodb://",
      "mongodb+srv://",
      "redis://",
      "rediss://",
    ];
    return protocols.some((p) => val.startsWith(p));
  },
  {
    message: "数据库 URL 格式不正确，请使用标准连接字符串格式",
  }
);

/**
 * Redis URL Schema
 */
export const redisUrlSchema = z
  .string()
  .refine((val) => val.startsWith("redis://") || val.startsWith("rediss://"), {
    message: "Redis URL 必须以 redis:// 或 rediss:// 开头",
  });

/**
 * 主机地址 Schema
 * 支持 IP 地址或域名
 */
export const hostSchema = z.string().min(1, "主机地址不能为空");

// ============================================================================
// 环境相关 Schema
// ============================================================================

/**
 * Node 环境 Schema
 */
export const nodeEnvSchema = z.enum(["development", "production", "test"]);

/**
 * 日志级别 Schema
 */
export const logLevelSchema = z.enum([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);

// ============================================================================
// 安全相关 Schema
// ============================================================================

/**
 * 密钥 Schema
 * 验证最小长度
 */
export function secretSchema(minLength = 32) {
  return z.string().min(minLength, `密钥长度不能少于 ${minLength} 个字符`);
}

/**
 * JWT Secret Schema
 */
export const jwtSecretSchema = secretSchema(32);

/**
 * API Key Schema
 */
export const apiKeySchema = z
  .string()
  .min(16, "API Key 长度不能少于 16 个字符");

// ============================================================================
// 时间相关 Schema
// ============================================================================

/**
 * 持续时间 Schema
 * 支持 "1h", "30m", "60s" 等格式，转换为毫秒
 */
export const durationSchema = z.string().transform((val, ctx) => {
  const match = val.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    ctx.addIssue({
      code: "custom",
      message: '无效的时间格式，请使用如 "1h", "30m", "60s" 格式',
    });
    return z.NEVER;
  }

  const [, numStr, unit] = match;
  const num = Number.parseInt(numStr, 10);

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return num * multipliers[unit];
});

/**
 * 时间戳 Schema
 * 转换为 Date 对象
 */
export const timestampSchema = z.string().transform((val, ctx) => {
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: "custom",
      message: "无效的时间戳格式",
    });
    return z.NEVER;
  }
  return date;
});

// ============================================================================
// 常用组合 Schema
// ============================================================================

/**
 * 数据库配置 Schema 工厂
 * 创建完整的数据库配置验证
 */
export function createDatabaseSchema(prefix = "DATABASE") {
  return {
    [`${prefix}_URL`]: databaseUrlSchema,
    [`${prefix}_POOL_MIN`]: integerSchema.optional(),
    [`${prefix}_POOL_MAX`]: integerSchema.optional(),
    [`${prefix}_SSL`]: booleanSchema.optional(),
  };
}

/**
 * Redis 配置 Schema 工厂
 */
export function createRedisSchema(prefix = "REDIS") {
  return {
    [`${prefix}_URL`]: redisUrlSchema.optional(),
    [`${prefix}_HOST`]: hostSchema.optional(),
    [`${prefix}_PORT`]: portSchema.optional(),
    [`${prefix}_PASSWORD`]: z.string().optional(),
    [`${prefix}_DB`]: integerSchema.optional(),
  };
}

/**
 * 服务配置 Schema 工厂
 */
export function createServiceSchema(prefix = "SERVICE") {
  return {
    [`${prefix}_NAME`]: z.string().min(1),
    [`${prefix}_HOST`]: hostSchema.default("0.0.0.0"),
    [`${prefix}_PORT`]: portSchema,
  };
}
