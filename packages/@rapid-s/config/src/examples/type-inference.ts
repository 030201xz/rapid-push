/**
 * 类型推断演示
 *
 * 展示 @x/config 结构化配置的完整类型推断能力
 * 所有类型都是自动推断的，无需手动声明
 */

import { z } from "zod";
import {
  booleanSchema,
  createEnv,
  hostSchema,
  nodeEnvSchema,
  portSchema,
} from "../index";

// ============================================================================
// 定义配置 - 类型会自动推断
// ============================================================================

const env = createEnv({
  schema: {
    // 基础类型
    /** string */
    appName: z.string().default("my-app"),
    /** number（通过 portSchema 转换） */
    port: portSchema.default(3000),
    /** boolean（通过 booleanSchema 转换） */
    debug: booleanSchema.default(false),
    /** 联合类型 */
    nodeEnv: nodeEnvSchema.default("development"),

    // 嵌套结构 - 自动推断为对象类型
    database: {
      host: hostSchema.default("localhost"),
      port: portSchema.default(5432),
      name: z.string().default("mydb"),

      // 深层嵌套
      pool: {
        max: z.coerce.number().default(10),
        min: z.coerce.number().default(2),
      },
    },

    // 可选配置
    optional: {
      /** string | undefined */
      apiKey: z.string().optional(),
      /** 带默认值的可选项 -> string */
      region: z.string().default("us-east-1"),
    },

    // 数组类型（通过 transform）
    /** string[] */
    allowedOrigins: z
      .string()
      .default("localhost,127.0.0.1")
      .transform((v) => v.split(",")),
  },
});

// ============================================================================
// 类型推断验证 - 悬停查看类型
// ============================================================================

// 将鼠标悬停在变量上，IDE 会显示推断的类型

// string
const appName: string = env.appName;

// number (不是 string！通过 portSchema 自动转换)
const port: number = env.port;

// boolean (不是 string！通过 booleanSchema 自动转换)
const isDebug: boolean = env.debug;

// "development" | "production" | "test"
const nodeEnv: "development" | "production" | "test" = env.nodeEnv;

// 嵌套对象访问 - 完整类型推断
const dbHost: string = env.database.host;
const dbPort: number = env.database.port;
const poolMax: number = env.database.pool.max;

// 可选值
const apiKey: string | undefined = env.optional.apiKey;
const region: string = env.optional.region;

// 数组
const origins: string[] = env.allowedOrigins;

// ============================================================================
// 类型安全演示 - 以下代码会产生 TypeScript 错误
// ============================================================================

// 取消注释以下代码，查看 TypeScript 的类型检查错误：

// ❌ 错误：port 是 number 类型，不能赋值给 string
// const wrongType: string = env.port;

// ❌ 错误：nodeEnv 只能是 "development" | "production" | "test"
// if (env.nodeEnv === "staging") { }

// ❌ 错误：不存在的属性
// console.log(env.database.pool.undefined);

// ❌ 错误：env 是只读的，不能修改
// env.port = 8080;

// ============================================================================
// 实际使用示例
// ============================================================================

function startServer() {
  // 条件分支中类型会自动收窄
  if (env.nodeEnv === "production") {
    console.log("启动生产服务器...");
  } else if (env.nodeEnv === "development") {
    console.log("启动开发服务器...");

    if (env.debug) {
      console.log("调试模式已开启");
    }
  }

  // 直接使用数字类型，无需转换
  const serverConfig = {
    port: env.port,
    host: "0.0.0.0",
    database: {
      host: env.database.host,
      port: env.database.port,
      name: env.database.name,
      poolSize: env.database.pool.max,
    },
  };

  // 数组操作
  const isLocalAllowed = env.allowedOrigins.includes("localhost");

  console.log("服务器配置:", serverConfig);
  console.log(`本地访问允许: ${isLocalAllowed}`);
}

export {
  apiKey,
  appName,
  dbHost,
  dbPort,
  env,
  isDebug,
  nodeEnv,
  origins,
  poolMax,
  port,
  region,
  startServer,
};
