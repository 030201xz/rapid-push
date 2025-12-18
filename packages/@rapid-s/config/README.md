# @rapid-s/config

类型安全的结构化配置管理，支持嵌套 Schema 定义。

## 特性

- 🔒 **完全类型安全** - 基于 Zod Schema 的编译时和运行时双重验证
- 🚀 **零 `any` 类型** - 所有配置项都有精确的 TypeScript 类型推断
- 🎯 **结构化配置** - 支持嵌套定义，自动映射到扁平环境变量
- 📦 **丰富的预设 Schema** - 开箱即用的常见配置验证器
- 🎯 **友好的错误提示** - 清晰的中文错误信息

## 安装

```bash
bun add @rapid-s/config zod
```

## 快速开始

```typescript
// src/env.ts
import {
  createEnv,
  portSchema,
  hostSchema,
  nodeEnvSchema,
  logLevelSchema,
} from "@rapid-s/config";
import { z } from "zod";

export const env = createEnv({
  schema: {
    // 服务端口 -> PORT
    port: portSchema.default(4000),

    // 运行环境 -> NODE_ENV
    nodeEnv: nodeEnvSchema.default("development"),

    // 日志级别 -> LOG_LEVEL
    logLevel: logLevelSchema.default("info"),

    // 数据库配置（嵌套结构）
    database: {
      // -> DATABASE_HOST
      host: hostSchema.default("localhost"),
      // -> DATABASE_PORT
      port: portSchema.default(5432),
      // -> DATABASE_USER
      user: z.string().default("postgres"),

      // 连接池（深层嵌套）
      pool: {
        // -> DATABASE_POOL_MAX
        max: z.coerce.number().default(10),
        // -> DATABASE_POOL_IDLE_TIMEOUT
        idleTimeout: z.coerce.number().default(20),
      },
    },
  },
});

// 类型安全的结构化访问
console.log(env.port); // number
console.log(env.nodeEnv); // 'development' | 'production' | 'test'
console.log(env.database.host); // string
console.log(env.database.pool.max); // number
```

## 映射规则

环境变量名称自动从 camelCase 转换为 SCREAMING_SNAKE_CASE，嵌套结构用下划线分隔：

| Schema 路径                 | 环境变量名                   |
| --------------------------- | ---------------------------- |
| `port`                      | `PORT`                       |
| `nodeEnv`                   | `NODE_ENV`                   |
| `database.host`             | `DATABASE_HOST`              |
| `database.pool.max`         | `DATABASE_POOL_MAX`          |
| `database.pool.idleTimeout` | `DATABASE_POOL_IDLE_TIMEOUT` |

## API 参考

### `createEnv(options)`

创建类型安全的结构化环境变量配置对象。

#### 选项

| 选项                     | 类型                 | 默认值        | 说明                 |
| ------------------------ | -------------------- | ------------- | -------------------- |
| `schema`                 | `NestedSchemaRecord` | **必填**      | 嵌套配置 Schema      |
| `runtimeEnv`             | `object`             | `process.env` | 运行时环境变量来源   |
| `emptyStringAsUndefined` | `boolean`            | `true`        | 空字符串转 undefined |
| `skipValidation`         | `boolean`            | `false`       | 跳过验证（仅测试用） |
| `onValidationError`      | `function`           | 默认处理器    | 验证错误处理器       |

## 预设 Schema

### 基础类型转换

```typescript
import {
  numberSchema, // 字符串 → 数字
  integerSchema, // 字符串 → 整数
  booleanSchema, // "true"/"1"/"yes" → true
  strictBooleanSchema, // 仅 "true"/"false"
  stringArraySchema, // "a,b,c" → ['a', 'b', 'c']
  jsonSchema, // JSON 字符串解析
} from "@rapid-s/config";
```

### 网络相关

```typescript
import {
  portSchema, // 端口号 (1-65535)
  urlSchema, // URL 格式验证
  databaseUrlSchema, // 数据库连接 URL
  redisUrlSchema, // Redis URL
  hostSchema, // 主机地址
} from "@rapid-s/config";
```

### 环境相关

```typescript
import {
  nodeEnvSchema, // 'development' | 'production' | 'test'
  logLevelSchema, // 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
} from "@rapid-s/config";
```

### 安全相关

```typescript
import {
  secretSchema, // 密钥（可指定最小长度）
  jwtSecretSchema, // JWT 密钥 (min 32)
  apiKeySchema, // API Key (min 16)
} from "@rapid-s/config";
```

### 时间相关

```typescript
import {
  durationSchema, // "1h"/"30m"/"60s" → 毫秒
  timestampSchema, // 时间字符串 → Date
} from "@rapid-s/config";
```

## 高级用法

### 完整的数据库配置示例

```typescript
import {
  createEnv,
  portSchema,
  hostSchema,
  nodeEnvSchema,
  booleanSchema,
  logLevelSchema,
} from "@rapid-s/config";
import { z } from "zod";

export const env = createEnv({
  schema: {
    port: portSchema.default(4000),
    nodeEnv: nodeEnvSchema.default("development"),
    enablePlayground: booleanSchema.default(true),
    logLevel: logLevelSchema.default("info"),

    database: {
      url: z.url().optional(),
      host: hostSchema.default("localhost"),
      port: portSchema.default(5432),
      user: z.string().min(1).default("postgres"),
      password: z.string().min(1).default("postgres"),
      name: z.string().min(1).default("mydb"),
      schema: z.string().min(1).default("public"),

      pool: {
        max: z.coerce.number().int().min(1).max(100).default(10),
        idleTimeout: z.coerce.number().int().min(0).default(20),
        connectTimeout: z.coerce.number().int().min(1).default(10),
        maxLifetime: z.coerce.number().int().min(0).default(3600),
      },
    },
  },
});

// 在应用配置中使用
export const databaseConfig = {
  url: env.database.url ?? buildConnectionUrl(),
  host: env.database.host,
  port: env.database.port,
  pool: env.database.pool, // 直接使用嵌套对象
} as const;

function buildConnectionUrl() {
  const { user, password, host, port, name } = env.database;
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}
```

### 与 Consul 配置结合

```typescript
import { createEnv } from "@rapid-s/config";
import { consulConfig } from "./consul";

// 合并 Consul 配置和环境变量
const runtimeEnv = {
  ...process.env,
  DATABASE_HOST: consulConfig.database.host,
  DATABASE_PORT: String(consulConfig.database.port),
};

export const env = createEnv({
  schema: {
    database: {
      host: hostSchema,
      port: portSchema,
    },
  },
  runtimeEnv,
});
```

## 设计理念

本库借鉴 T3 Env 的核心理念并进行简化重构：

1. **运行时验证** - 在应用启动时立即发现配置错误
2. **类型推断** - 无需手动维护类型定义
3. **结构化配置** - 嵌套 Schema 自动映射到扁平环境变量
4. **开发体验** - 友好的错误提示和自动补全

与原版 T3 Env 的区别：

- 使用嵌套 Schema 定义，更符合配置的逻辑结构
- 自动处理 camelCase → SCREAMING_SNAKE_CASE 转换
- 专注后端服务场景，简化 API
- 中文错误提示，对中文开发者更友好

## License

MIT
