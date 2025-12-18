# @x/requests

> 类型安全的 HTTP 客户端,基于 Zod Schema 实现请求和响应的完整类型推断

## ✨ 特性

- 🎯 **完全类型安全** - 通过 Zod Schema 实现请求和响应的类型推断
- 🚫 **零 any 类型** - 完全避免 any,充分利用 TypeScript 类型系统
- ✅ **运行时验证** - Zod 自动验证请求体和响应体,错误信息清晰
- ⚡ **基于 Bun** - 充分利用 Bun 的 fetch 扩展特性 (proxy, unix socket, TLS 等)
- 🔄 **自动重试** - 支持指数退避的智能重试策略
- 🎭 **拦截器** - 灵活的请求和响应拦截器
- 🧩 **中间件** - 可扩展的中间件系统

## 📦 安装

```bash
bun add @x/requests zod
```

## 🚀 快速开始

### 基础用法

```typescript
import { createClient } from '@x/requests';
import { z } from 'zod';

// 定义响应 Schema
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email()
});

// 创建客户端
const api = createClient({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Authorization': 'Bearer token'
  }
});

// 发起请求 - 类型自动推断!
const user = await api.get('/users/:id', {
  params: { id: 1 },
  responseSchema: UserSchema
});

console.log(user.name); // ✓ 类型安全: string
```

### POST 请求

```typescript
const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email()
});

const newUser = await api.post('/users', {
  bodySchema: CreateUserSchema,
  responseSchema: UserSchema,
  body: {
    name: 'John',
    email: 'john@example.com'
  }
  // ✓ body 会被 Zod 验证
  // ✓ 响应也会被验证
});
```

### 查询参数

```typescript
const QuerySchema = z.object({
  status: z.enum(['active', 'inactive']),
  page: z.number().min(1)
});

const users = await api.get('/users', {
  query: { status: 'active', page: 1 },
  querySchema: QuerySchema,
  responseSchema: z.array(UserSchema)
});
```

## 🎨 高级功能

### 拦截器

```typescript
// 请求拦截器
api.interceptRequest((config) => {
  config.headers = {
    ...config.headers,
    'X-Request-Time': new Date().toISOString()
  };
  return config;
});

// 响应拦截器
api.interceptResponse({
  onFulfilled: (response) => {
    console.log('Response received');
    return response;
  },
  onRejected: (error) => {
    if (error.statusCode === 401) {
      // 刷新 token 逻辑
    }
    throw error;
  }
});
```

### 中间件

```typescript
import { loggerMiddleware, authMiddleware } from '@x/requests';

// 日志中间件
api.use(loggerMiddleware(logger));

// 认证中间件
api.use(authMiddleware(() => getToken()));

// 自定义中间件
api.use(async (config, next) => {
  console.log('Before request');
  const response = await next(config);
  console.log('After response');
  return response;
});
```

### 自动重试

```typescript
const data = await api.get('/unstable-endpoint', {
  responseSchema: DataSchema,
  retry: {
    times: 3,              // 重试 3 次
    delay: 1000,           // 基础延迟 1 秒
    exponentialBackoff: true, // 指数退避: 1s, 2s, 4s
    onRetry: (error, attempt) => {
      console.log(`Retry ${attempt}: ${error.message}`);
    },
    shouldRetry: (error) => {
      // 自定义重试条件
      return error instanceof NetworkError;
    }
  }
});
```

### 超时和取消

```typescript
// 超时控制
const user = await api.get('/users/:id', {
  params: { id: 1 },
  responseSchema: UserSchema,
  timeout: 5000 // 5 秒超时
});

// 手动取消
const controller = new AbortController();

setTimeout(() => controller.abort(), 3000);

await api.get('/users/:id', {
  params: { id: 1 },
  responseSchema: UserSchema,
  signal: controller.signal
});
```

### Bun 特性

```typescript
// 使用代理
await api.get('/data', {
  responseSchema: DataSchema,
  bunOptions: {
    proxy: 'http://proxy.com'
  }
});

// 详细日志
await api.get('/data', {
  responseSchema: DataSchema,
  bunOptions: {
    verbose: true // 或 'curl'
  }
});

// TLS 配置
await api.get('/secure', {
  responseSchema: DataSchema,
  bunOptions: {
    tls: {
      rejectUnauthorized: false
    }
  }
});

// Unix Socket
await api.post('/api/data', {
  bodySchema: BodySchema,
  responseSchema: DataSchema,
  body: { message: 'Hello' },
  bunOptions: {
    unix: '/var/run/app.sock'
  }
});
```

## 🔗 与其他包集成

### 与 @x/logger 集成

```typescript
import logger from '@x/logger';
import { createClient } from '@x/requests';

const api = createClient({
  baseURL: 'https://api.example.com',
  logger: logger.child('API')
});

// 自动记录所有请求和响应
await api.get('/users/:id', {
  params: { id: 1 },
  responseSchema: UserSchema
});
// [API] → GET /users/1
// [API] ← GET /users/1 - 200 (123ms)
```

### 与 @x/cron 配合

```typescript
import { cron } from '@x/cron';
import { createClient } from '@x/requests';
import { z } from 'zod';

const api = createClient({
  baseURL: 'https://api.example.com'
});

const HealthSchema = z.object({
  status: z.enum(['healthy', 'unhealthy'])
});

// 定期健康检查
cron.every(30).seconds().do(async () => {
  const health = await api.get('/health', {
    responseSchema: HealthSchema
  });
  return health;
}).then((ctx) => {
  if (ctx.status !== 'healthy') {
    logger.warn('Service unhealthy!');
  }
});
```

## 🛡️ 错误处理

所有错误都继承自 `RequestError`,包含详细的错误信息:

```typescript
import {
  RequestError,
  ValidationError,
  HttpError,
  NetworkError,
  TimeoutError,
  AbortError
} from '@x/requests';

try {
  await api.get('/users/:id', {
    params: { id: 1 },
    responseSchema: UserSchema
  });
} catch (error) {
  if (error instanceof ValidationError) {
    // Zod 验证失败
    console.error('Validation failed:', error.zodErrors);
  } else if (error instanceof HttpError) {
    // HTTP 错误 (4xx, 5xx)
    console.error('HTTP error:', error.statusCode);
  } else if (error instanceof TimeoutError) {
    // 超时
    console.error('Request timeout');
  } else if (error instanceof AbortError) {
    // 请求被取消
    console.error('Request aborted');
  } else if (error instanceof NetworkError) {
    // 网络错误
    console.error('Network error');
  }
}
```

### 错误信息

所有错误包含以下信息:

- `message`: 错误描述
- `statusCode`: HTTP 状态码 (如果有)
- `zodErrors`: Zod 验证错误详情 (如果有)
- `url`: 请求 URL
- `method`: 请求方法
- `responseBody`: 响应体 (如果有)

## 📖 API 文档

### `createClient(config)`

创建 HTTP 客户端实例。

```typescript
interface ClientConfig {
  baseURL?: string;              // 基础 URL
  headers?: Record<string, string>; // 默认请求头
  timeout?: number;              // 默认超时(毫秒)
  retry?: RetryConfig;           // 默认重试配置
  bunOptions?: BunFetchOptions;  // Bun 特定选项
  logger?: Logger;               // Logger 实例
}
```

### 请求方法

- `get<T>(url, config)` - GET 请求
- `post<T, B>(url, config)` - POST 请求
- `put<T, B>(url, config)` - PUT 请求
- `patch<T, B>(url, config)` - PATCH 请求
- `delete<T>(url, config)` - DELETE 请求
- `head(url, config)` - HEAD 请求
- `options(url, config)` - OPTIONS 请求

### RequestConfig

```typescript
interface RequestConfig<TResponseSchema, TBodySchema, TQuerySchema> {
  responseSchema: TResponseSchema;  // 响应 Schema (必需)
  bodySchema?: TBodySchema;         // 请求体 Schema
  querySchema?: TQuerySchema;       // 查询参数 Schema
  
  body?: z.infer<TBodySchema>;      // 请求体 (自动推断类型)
  query?: z.infer<TQuerySchema>;    // 查询参数 (自动推断类型)
  params?: Record<string, string | number>; // 路径参数
  headers?: Record<string, string>; // 请求头
  
  timeout?: number;                 // 超时时间
  retry?: RetryConfig;              // 重试配置
  signal?: AbortSignal;             // 取消信号
  bunOptions?: BunFetchOptions;     // Bun 选项
  skipValidation?: boolean;         // 跳过响应验证
}
```

## 🎯 设计理念

1. **类型安全优先**: 通过 Zod Schema 实现编译时和运行时的双重类型保证
2. **零学习成本**: API 设计类似原生 fetch,但增强了类型安全
3. **渐进式增强**: 从简单的 get/post 开始,逐步使用高级功能
4. **可组合性**: 拦截器、中间件、重试等功能可灵活组合
5. **错误友好**: 详细的错误信息和类型,便于调试

## 📝 示例

查看 `examples/` 目录获取更多示例:

- `basic.ts` - 基础用法
- `advanced.ts` - 高级功能 (拦截器、中间件、重试等)
- `with-cron.ts` - 与 @x/cron 配合使用

运行示例:

```bash
bun run examples/basic.ts
bun run examples/advanced.ts
```

## 📄 License

MIT
