# 外部工具编写指南

> 本指南说明如何在 `SKILLS_MCP_TOOLS_PATH` 指定的目录中编写和集成外部工具

## 快速开始

### 1. 安装依赖

外部工具需要以下依赖。在您的 `package.json` 中添加：

```json
{
  "dependencies": {
    "reflect-metadata": "^0.2.2",
    "tsyringe": "^4.10.0",
    "zod": "^4.1.13",
    "decimal.js": "^10.6.0",
    "skills-mcp": "workspace:*"
  }
}
```

### 2. 基本工具模板

创建文件 `tools/my-tool.ts`：

```typescript
import 'reflect-metadata';
import { injectable } from 'tsyringe';
import {
  BaseTool,
  Tool,
  type ToolContext,
  type ToolOptions,
  type ToolResult,
} from 'skills-mcp/core';
import {
  twoNumbersInputSchema,
  calculationOutputSchema,
  validateNumber,
  createCalculationOutput,
  type TwoNumbersInput,
  type CalculationOutput,
} from 'skills-mcp/shared';
import { createLogger } from 'skills-mcp/shared';

const log = createLogger('tool:my-tool');

/** 自定义工具 */
@injectable()
@Tool()
export class MyTool extends BaseTool<
  typeof twoNumbersInputSchema,
  typeof calculationOutputSchema,
  TwoNumbersInput,
  CalculationOutput
> {
  override getOptions(): ToolOptions<
    typeof twoNumbersInputSchema,
    typeof calculationOutputSchema
  > {
    return {
      name: 'my_custom_tool',
      title: '我的自定义工具',
      description: '这是一个外部工具示例',
      inputSchema: twoNumbersInputSchema,
      outputSchema: calculationOutputSchema,
    };
  }

  override async onInit(): Promise<void> {
    log.debug('工具初始化...');
  }

  override async onReady(): Promise<void> {
    log.debug('工具已就绪');
  }

  override async execute(
    input: TwoNumbersInput,
    context: ToolContext
  ): Promise<ToolResult<CalculationOutput>> {
    log.info(`执行 ${context.toolName}`);

    const numA = validateNumber(input.a, 'a');
    const numB = validateNumber(input.b, 'b');
    const result = numA.plus(numB);

    return {
      success: true,
      data: createCalculationOutput('+', input.a, input.b, result),
    };
  }
}
```

## 工具结构

### 目录结构支持

支持任意嵌套的目录结构：

```
SKILLS_MCP_TOOLS_PATH/
├── simple-tool.ts           # 直接工具文件
├── math/
│   ├── add.ts               # 嵌套工具
│   ├── multiply.ts
│   └── advanced/
│       └── matrix.ts        # 深层嵌套也支持
└── _internal.ts             # 以 _ 开头的文件被忽略
```

### 文件命名约定

- **工具文件命名**：`*.ts`（任意名称）
- **类名约定**：必须以 `Tool` 结尾，如 `AddTool`, `MyCustomTool`
- **装饰器**：必须使用 `@injectable()` 和 `@Tool()`
- **忽略文件**：以 `_` 开头或 `index.ts` 的文件会被跳过

## 类型系统

### 从 skills-mcp 导入类型

```typescript
// 核心类型和基类
import {
  BaseTool,
  Tool,
  type ToolContext,
  type ToolOptions,
  type ToolResult,
  ToolLifecycle,
} from 'skills-mcp/core';

// 共享工具和类型
import {
  createLogger,
  validateNumber,
  createCalculationOutput,
  twoNumbersInputSchema,
  calculationOutputSchema,
  type CalculationOutput,
  type TwoNumbersInput,
} from 'skills-mcp/shared';
```

### 自定义 Schema

```typescript
import { z } from 'zod';

// 定义自己的输入 schema
const myInputSchema = {
  text: z.string().describe('输入文本'),
  count: z.number().describe('重复次数'),
};

// 定义自己的输出 schema
const myOutputSchema = {
  output: z.string().describe('处理结果'),
  processedAt: z.string().describe('处理时间'),
};

// 推导类型
type MyInput = z.infer<z.ZodObject<typeof myInputSchema>>;
type MyOutput = z.infer<z.ZodObject<typeof myOutputSchema>>;

// 在工具类中使用
export class MyCustomTool extends BaseTool<
  typeof myInputSchema,
  typeof myOutputSchema,
  MyInput,
  MyOutput
> {
  // ...
}
```

## 工具生命周期

每个工具都遵循以下生命周期：

```typescript
enum ToolLifecycle {
  Created = 'created', // 已创建，未初始化
  Initializing = 'initializing', // 初始化中
  Ready = 'ready', // 已就绪，可使用
  Suspended = 'suspended', // 已暂停
  Destroying = 'destroying', // 销毁中
  Destroyed = 'destroyed', // 已销毁
}
```

### 生命周期钩子

在你的工具类中实现以下方法：

```typescript
export class MyTool extends BaseTool {
  // 初始化前的准备
  override async onInit(): Promise<void> {
    // 分配资源、连接数据库等
  }

  // 初始化后的验证
  override async onReady(): Promise<void> {
    // 验证配置、预热缓存等
  }

  // 暂停前的处理
  override async onSuspend?(): Promise<void> {
    // 保存状态等
  }

  // 恢复前的处理
  override async onResume?(): Promise<void> {
    // 恢复状态等
  }

  // 销毁前的清理
  override async onDestroy?(): Promise<void> {
    // 释放资源、关闭连接等
  }

  // 执行工具逻辑
  override async execute(
    input: MyInput,
    context: ToolContext
  ): Promise<ToolResult<MyOutput>> {
    // 核心业务逻辑
  }
}
```

## 启动外部工具

### 环境变量配置

```bash
# 指定外部工具目录
export SKILLS_MCP_TOOLS_PATH="/path/to/external/tools"

# 启动 MCP 服务器
bun run src/index.ts
```

### 示例配置

```bash
# 使用 .skills-mcp/tools 目录中的外部工具
export SKILLS_MCP_TOOLS_PATH="/home/xz/Projects/030201xy/wf/.skills-mcp/tools"
cd /home/xz/Projects/030201xy/wf/packages/mcp/skills-mcp
bun run src/index.ts
```

## 忽略工具

在 `src/index.ts` 中配置忽略列表：

```typescript
const TOOL_LOADER_CONFIG: ToolLoaderConfig = {
  ignore: ['ignore_demo_tool', 'experimental_tool'],
};
```

## 常见问题

### Q: 外部工具如何访问 MCP 服务器实例？

A: 在工具的 constructor 中注入 `MCP_SERVER_TOKEN`：

```typescript
import { MCP_SERVER_TOKEN } from 'skills-mcp/core';
import { inject } from 'tsyringe';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

@injectable()
@Tool()
export class MyTool extends BaseTool {
  constructor(@inject(MCP_SERVER_TOKEN) private mcpServer: McpServer) {
    super();
  }

  override async execute(
    input: MyInput,
    context: ToolContext
  ): Promise<ToolResult<MyOutput>> {
    // 使用 this.mcpServer
  }
}
```

### Q: 如何在工具中使用依赖注入？

A: 使用 tsyringe 的 `@injectable()` 装饰器和依赖注入：

```typescript
import { injectable, inject } from 'tsyringe';
import { DatabaseService } from './services/database.ts';

@injectable()
@Tool()
export class DataTool extends BaseTool {
  constructor(private dbService: DatabaseService) {
    super();
  }

  override async execute(input: MyInput): Promise<ToolResult<MyOutput>> {
    const data = await this.dbService.query();
    // ...
  }
}
```

### Q: 外部工具目录中的文件会重复加载吗？

A: 不会。系统会检查工具名称（从 `getOptions().name` 获取），避免重复注册。如果同名工具出现警告信息。

### Q: 支持多个外部工具目录吗？

A: 当前实现支持单个目录。如需支持多目录，可修改 `container.ts` 中的 `scanAndLoadTools` 函数：

```typescript
// 在 scanAndLoadTools 中添加多目录支持
const externalPaths = process.env.SKILLS_MCP_TOOLS_PATH?.split(':') || [];
for (const toolsPath of externalPaths) {
  await scanToolsFromDirectory(toolsPath, ignoreSet);
}
```

## 类型安全最佳实践

### 使用 TypeScript 严格模式

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 类型推导示例

```typescript
// 从 schema 推导类型
const inputSchema = {
  /* ... */
};
type InputType = z.infer<z.ZodObject<typeof inputSchema>>;

// 从工具类推导结果类型
type MyToolResult = ReturnType<MyTool['execute']>;
```

## 构建和发布

### 构建外部工具包

如果要将外部工具作为单独的包分发：

```bash
# package.json
{
  "name": "@myorg/my-skills-tool",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  }
}
```

```bash
# tsup.config.ts
export default {
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  dts: true,
  outDir: 'dist'
}
```

然后在 SKILLS_MCP_TOOLS_PATH 中引用编译后的文件。

## 更多信息

- [BaseTool API](./docs/api/base-tool.md)
- [ToolContext API](./docs/api/tool-context.md)
- [日志系统](./docs/guides/logging.md)
- [错误处理](./docs/guides/error-handling.md)
