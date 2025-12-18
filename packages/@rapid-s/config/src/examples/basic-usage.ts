/**
 * 基础用法示例
 *
 * 展示 @x/config 的结构化配置和类型安全特性
 */

import { z } from "zod";
import {
  createEnv,
  hostSchema,
  logLevelSchema,
  nodeEnvSchema,
  portSchema,
} from "../index";

// ============================================================================
// 定义类型安全的结构化环境变量配置
// ============================================================================

export const env = createEnv({
  schema: {
    /** 服务端口 -> PORT */
    port: portSchema.default(4000),

    /** 运行环境 -> NODE_ENV */
    nodeEnv: nodeEnvSchema.default("development"),

    /** 日志级别 -> LOG_LEVEL */
    logLevel: logLevelSchema.default("info"),

    /** 应用名称 -> APP_NAME */
    appName: z.string().default("my-app"),

    /** 数据库配置（嵌套结构） */
    database: {
      /** -> DATABASE_HOST */
      host: hostSchema.default("localhost"),
      /** -> DATABASE_PORT */
      port: portSchema.default(5432),
      /** -> DATABASE_USER */
      user: z.string().default("postgres"),
      /** -> DATABASE_NAME */
      name: z.string().default("mydb"),

      /** 连接池配置（深层嵌套） */
      pool: {
        /** -> DATABASE_POOL_MAX */
        max: z.coerce.number().default(10),
        /** -> DATABASE_POOL_IDLE_TIMEOUT */
        idleTimeout: z.coerce.number().default(20),
      },
    },
  },
});

// ============================================================================
// 类型安全的使用示例
// ============================================================================

/**
 * env 对象现在具有完整的类型推断和结构化访问：
 *
 * env.port              -> number
 * env.nodeEnv           -> "development" | "production" | "test"
 * env.logLevel          -> "trace" | "debug" | "info" | "warn" | "error" | "fatal"
 * env.database.host     -> string
 * env.database.port     -> number
 * env.database.pool.max -> number
 */

function example() {
  // ✅ 类型安全：port 是 number 类型
  const port: number = env.port;

  // ✅ 类型安全：nodeEnv 是联合类型
  if (env.nodeEnv === "production") {
    console.log("生产环境");
  }

  // ✅ 类型安全：结构化访问数据库配置
  const dbConfig = {
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    database: env.database.name,
    poolSize: env.database.pool.max,
  };

  // ❌ 类型错误示例（取消注释会看到 TypeScript 报错）：
  // env.port = 3000;              // Error: 只读属性
  // env.nodeEnv === "staging"     // Error: 不在枚举值中
  // env.database.pool.undefined   // Error: 属性不存在

  console.log(`${env.appName} 启动在端口 ${port}`);
  console.log("数据库配置:", dbConfig);
}

// 运行
example();
