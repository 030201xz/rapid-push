# @rapid-s/logger

通用跨平台日志库 - 零依赖,支持浏览器和 Node.js/Bun 终端环境

## ✨ 特性

- 🚀 **零依赖** - 仅使用原生 API
- 🎨 **彩色输出** - 浏览器 CSS 样式 + 终端 ANSI 颜色
- 🔧 **环境变量配置** - 支持 `LOG_LEVEL` 等环境变量
- 📦 **模块化导入** - 按需引入浏览器或终端版本
- 🎯 **TypeScript** - 完整类型支持
- ⚡ **轻量级** - < 5KB gzipped
- 🌍 **跨平台** - 浏览器/Node.js/Bun

## 📦 安装

```bash
bun add @rapid-s/logger
# 或
npm install @rapid-s/logger
```

## 🚀 快速开始

### Node.js / Bun 终端环境

```typescript
import logger from '@rapid-s/logger';

logger.trace('trace message');
logger.debug('debug info');
logger.info('info message');
logger.warn('warning message');
logger.error('error occurred');
logger.fatal('fatal error');

// 带上下文数据
logger.info('user login', { userId: 123, ip: '127.0.0.1' });
```

### 浏览器环境

```typescript
import logger from '@rapid-s/logger/browser';

logger.info('Hello from browser!');
logger.error('Something went wrong', { code: 500 });
```

## 🎨 日志级别

```typescript
import { LogLevel } from '@rapid-s/logger';

// 级别从低到高
LogLevel.TRACE   // 0 - 🔍 最详细
LogLevel.DEBUG   // 1 - 🐛 调试信息
LogLevel.INFO    // 2 - ℹ️  一般信息
LogLevel.WARN    // 3 - ⚠️  警告
LogLevel.ERROR   // 4 - ❌ 错误
LogLevel.FATAL   // 5 - 💀 致命错误
LogLevel.SILENT  // 999 - 静默

// 设置日志级别
logger.setLevel('debug');
logger.setLevel(LogLevel.DEBUG);
```

## ⚙️ 配置

### 环境变量配置

**Node.js / Bun:**
```bash
export LOG_LEVEL=debug
export LOG_FORMAT=pretty
export LOG_TIMESTAMP=true
export LOG_COLOR=true
```

**浏览器:**
```typescript
// 通过 localStorage
localStorage.setItem('LOG_LEVEL', 'debug');

// 或通过 URL 参数
// ?LOG_LEVEL=debug&LOG_COLOR=true
```

### 代码配置

```typescript
import { createLogger } from '@rapid-s/logger';

const logger = createLogger({
  level: 'debug',
  format: 'pretty', // 'pretty' | 'json' | 'compact'
  timestamp: true,
  color: true,
  namespace: 'MyApp'
});

// 或者配置已有实例
logger.configure({
  level: 'info',
  color: false
});

// 自定义列布局 (类似 Excel 列)
const tableLogger = createLogger({
  columns: [
    { id: 'level', width: 6, align: 'left' },
    { id: 'timestamp', width: 12, align: 'right' },
    { id: 'namespace', align: 'left' },
    { id: 'message', padding: 0 },
    {
      id: 'requestId',
      render: ({ entry }) => entry.context?.requestId ? `req=${entry.context.requestId}` : undefined,
    },
  ],
});
```

> 预置列 ID 包括 `level`、`timestamp`、`namespace`、`message`。其他列需要提供 `render` 函数（签名为 `LogColumnRenderer`），可以返回任意字符串并设置自身的宽度、对齐方式与列间距。

## 📝 高级用法

### 子 Logger (命名空间)

```typescript
const apiLogger = logger.child('API');
const dbLogger = logger.child('Database');

apiLogger.info('request received');  // [API] request received
dbLogger.debug('query executed');     // [Database] query executed

// 嵌套命名空间
const userApi = apiLogger.child('User');
userApi.info('user created'); // [API:User] user created
```

### 性能计时

```typescript
logger.time('operation');
// ... 执行操作
logger.timeEnd('operation'); // operation: 123.456ms
```

### 分组

```typescript
logger.group('User Details');
logger.info('Name: John');
logger.info('Age: 30');
logger.groupEnd();
```

### JSON 格式输出

```typescript
const logger = createLogger({
  format: 'json'
});

logger.info('test', { userId: 123 });
// {"level":"INFO","message":"test","timestamp":"2025-11-17T10:30:00.000Z","context":{"userId":123}}
```

## 🎨 颜色方案

| 级别 | Badge | 浏览器背景 | 终端颜色 |
|------|-------|-----------|----------|
| TRACE | 🔍 | #6B7280 (灰色) | 90 (亮黑) |
| DEBUG | 🐛 | #3B82F6 (蓝色) | 34 (蓝色) |
| INFO  | ℹ️  | #10B981 (绿色) | 32 (绿色) |
| WARN  | ⚠️  | #F59E0B (橙色) | 33 (黄色) |
| ERROR | ❌ | #EF4444 (红色) | 31 (红色) |
| FATAL | 💀 | #7C2D12 (深红) | 91 (亮红) |

## 📚 API 文档

### Logger 方法

```typescript
interface Logger {
  // 日志输出
  trace(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  fatal(message: string, context?: LogContext): void;

  // 配置
  setLevel(level: LogLevel | LogLevelString): void;
  configure(options: LoggerOptions): void;

  // 子 Logger
  child(namespace: string): Logger;

  // 工具方法
  time(label: string): void;
  timeEnd(label: string): void;
  group(title: string): void;
  groupEnd(): void;
}
```

### 类型定义

```typescript
type LogLevelString = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
type LogFormat = 'pretty' | 'json' | 'compact';
type LogContext = Record<string, any>;

interface LoggerOptions {
  level?: LogLevel | LogLevelString;
  format?: LogFormat;
  timestamp?: boolean;
  color?: boolean;
  namespace?: string;
}
```

## 🔍 工具函数

```typescript
import { detectPlatform, supportsColor, loadEnvConfig, getEnv } from '@rapid-s/logger';

// 检测运行平台
const platform = detectPlatform(); // 'browser' | 'node' | 'bun' | 'unknown'

// 检查颜色支持
const hasColor = supportsColor(); // boolean

// 加载环境变量配置
const config = loadEnvConfig(); // EnvConfig

// 获取环境变量
const logLevel = getEnv('LOG_LEVEL', 'info'); // string
```

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!
