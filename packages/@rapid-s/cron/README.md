# @x/cron

简洁优雅的 CRON 任务调度器，专注于类型安全的链式任务与数据流。

## 特性

✨ **简洁优雅** - 极简 API 设计，自然语言风格的时间表达  
🔒 **类型安全** - 完整的 TypeScript 类型推断，链式任务自动累积上下文类型  
⚡ **高性能** - 基于 Bun 运行时，极致性能  
📅 **灵活表达** - 支持自然语言和 CRON 表达式两种方式  
🔗 **链式调用** - 优雅的任务链设计，数据在任务间流转  
🎮 **任务控制** - 支持任务暂停、恢复、停止操作  

## 安装

```bash
bun add @x/cron
```

## 快速开始

### 使用默认实例（推荐）

```typescript
import { cron } from "@x/cron";

// 自然语言风格
cron.every(5).seconds().do(() => {
  console.log("Every 5 seconds");
});

// CRON 表达式
cron.every("*/5 * * * * *").do(() => {
  console.log("Custom cron expression");
});
```

### 创建自定义实例

```typescript
import { createCron } from "@x/cron";

const customCron = createCron({
  autoStart: false  // 禁用自动启动
});

customCron.every(5).seconds().do(() => {
  console.log("Custom instance");
});

customCron.start();  // 手动启动
```

## API

### 默认实例 vs 自定义实例

```typescript
// 默认实例 - 开箱即用
import { cron } from "@x/cron";
cron.every(5).seconds().do(() => {});

// 自定义实例 - 需要配置
import { createCron } from "@x/cron";
const customCron = createCron({ autoStart: false });
```

### `every()` - 创建定时任务

支持两种方式：

#### 1. 自然语言风格

```typescript
// 每 N 秒/分钟/小时/天
cron.every(5).seconds()
cron.every(10).minutes()
cron.every(2).hours()
cron.every(1).day()

// 别名（单数形式）
cron.every(1).second()
cron.every(1).minute()
cron.every(1).hour()
```

#### 2. CRON 表达式

```typescript
// 直接传入 CRON 表达式字符串
cron.every("*/5 * * * * *")      // 每 5 秒
cron.every("0 */15 * * * *")     // 每 15 分钟
cron.every("0 0 2 * * *")        // 每天凌晨 2 点
cron.every("0 0 9 * * 1")        // 每周一上午 9 点
```

### 任务链 API

#### `.do(fn, config?)` - 开始任务链

```typescript
cron.every(5).seconds()
  .do(() => {
    console.log("First task");
    return { step1: "completed" };
  });
```

#### `.then(fn, config?)` - 添加后续任务

```typescript
cron.every(5).seconds()
  .do(() => {
    return { data: "initial" };
  })
  .then((ctx) => {
    // ctx.data 有类型推断 ✓
    console.log(ctx.data);
    return { processed: true };
  })
  .then((ctx) => {
    // ctx.data 和 ctx.processed 都有类型 ✓
    console.log(ctx);
  });
```

**配置选项：**

```typescript
.do(() => {
  return { newData: "value" };
}, {
  name: "任务名称",
  continueOnError: true  // 出错时继续执行后续任务
})
```

### 任务控制 API

```typescript
const job = cron.every(5).seconds().do(() => {
  console.log("Running...");
});

job.pause();   // 暂停任务
job.resume();  // 恢复任务
job.stop();    // 停止并移除任务
```

### 调度器控制 API

```typescript
// 使用默认实例
import { cron } from "@x/cron";

cron.start();   // 启动调度器
cron.stop();    // 停止调度器
cron.list();    // 获取所有任务列表
cron.clear();   // 清除所有任务

// 或使用自定义实例
const customCron = createCron();
customCron.start();
```

## CRON 表达式参考

### 6 段式 (秒 分 时 日 月 周)

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └─── 星期 (0-6, 0=周日)
│ │ │ │ └───── 月份 (1-12)
│ │ │ └─────── 日期 (1-31)
│ │ └───────── 小时 (0-23)
│ └─────────── 分钟 (0-59)
└───────────── 秒 (0-59)
```

### 5 段式 (分 时 日 月 周)

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── 星期 (0-6, 0=周日)
│ │ │ └───── 月份 (1-12)
│ │ └─────── 日期 (1-31)
│ └───────── 小时 (0-23)
└─────────── 分钟 (0-59)
```

### 常用示例

```typescript
cron.every("*/5 * * * * *")      // 每 5 秒
cron.every("0 */10 * * * *")     // 每 10 分钟
cron.every("0 0 */2 * * *")      // 每 2 小时
cron.every("0 0 2 * * *")        // 每天凌晨 2 点
cron.every("0 0 9 * * 1-5")      // 工作日上午 9 点
cron.every("0 0 0 1 * *")        // 每月 1 号凌晨
```

## 示例

### 基础用法

```typescript
import { cron } from "@x/cron";

cron.every(5).seconds()
  .do(() => {
    return { timestamp: Date.now() };
  })
  .then((ctx) => {
    console.log("Time:", ctx.timestamp);
  });
```

### 数据流转

```typescript
cron.every(10).seconds()
  .do(() => {
    // 第一步：获取数据
    return { count: 0 };
  })
  .then((ctx) => {
    // 第二步：处理数据，ctx.count 有类型 ✓
    return { count: ctx.count + 1, processed: true };
  })
  .then((ctx) => {
    // 第三步：所有数据都有类型 ✓
    console.log(ctx.count, ctx.processed);
  });
```

### 异步任务

```typescript
cron.every(1).minute()
  .do(async () => {
    const response = await fetch("https://api.example.com/data");
    return { data: await response.json() };
  })
  .then(async (ctx) => {
    await processData(ctx.data);
  });
```

### 错误处理

```typescript
cron.every(5).seconds()
  .do(() => {
    return { step: 1 };
  })
  .then(() => {
    throw new Error("Oops!");
  }, { continueOnError: true })
  .then((ctx) => {
    // 即使上一步出错，也会继续执行
    console.log("Recovered, step:", ctx.step);
  });
```

### 任务控制

```typescript
const job = cron.every(3).seconds().do(() => {
  console.log("Running...");
});

// 5 秒后暂停
setTimeout(() => job.pause(), 5000);

// 10 秒后恢复
setTimeout(() => job.resume(), 10000);

// 15 秒后停止
setTimeout(() => job.stop(), 15000);
```

### 使用 CRON 表达式

```typescript
// 每天凌晨 2 点备份
cron.every("0 0 2 * * *").do(() => {
  console.log("Daily backup");
});

// 每周一上午 9 点生成报告
cron.every("0 0 9 * * 1").do(() => {
  console.log("Weekly report");
});

// 每 15 分钟健康检查
cron.every("0 */15 * * * *").do(() => {
  console.log("Health check");
});
```

## 设计理念

**简洁优雅即是稳定高效**

### 核心特性

- ✅ **自然语言 API** - `every(5).seconds()` 比 CRON 表达式更直观
- ✅ **统一的 API** - `every()` 同时支持数字和字符串
- ✅ **类型安全数据流** - 任务链自动累积和推断上下文类型
- ✅ **任务控制** - 支持暂停、恢复、停止操作
- ✅ **默认实例** - 开箱即用，无需配置

### 不做什么

- ❌ 不内置日志 - 让用户自己处理
- ❌ 不内置持久化 - 保持轻量
- ❌ 不过度抽象 - API 简单直观

### 对比传统方式

**传统方式：**
```typescript
const cron = createCron();
cron.schedule("*/5 * * * * *").task(() => {
  console.log("Task");
});
```

**新方式：**
```typescript
import { cron } from "@x/cron";
cron.every(5).seconds().do(() => {
  console.log("Task");
});

// 或使用 CRON 表达式
cron.every("*/5 * * * * *").do(() => {
  console.log("Task");
});
```

更直观、更易读、更优雅！

## License

MIT
