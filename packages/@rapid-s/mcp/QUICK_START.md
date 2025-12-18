# Quick Reference - MCP 工具系统快速参考

## 🚀 启动外部工具

```bash
# 1. 构建 skills-mcp
cd packages/mcp/skills-mcp
bun run build

# 2. 设置环境变量
export SKILLS_Mcp_TOOLS_PATH="/home/xz/Projects/030201xy/wf/.skills-mcp/tools"

# 3. 启动 MCP 服务器
bun run src/index.ts
```

## 📦 在外部工具中导入类型

```typescript
// ✅ 所有类型都自动可用，无需心智负担
import {
  BaseTool,
  Tool,
  ToolContext,
  ToolOptions,
  ToolResult,
  createLogger,
  validateNumber,
  createCalculationOutput,
  twoNumbersInputSchema,
  calculationOutputSchema,
} from 'skills-mcp';

// ✅ 或者细粒度导入
import {
  BaseTool,
  Tool,
  type ToolContext,
  type ToolOptions,
  type ToolResult,
} from 'skills-mcp/core';

import { createLogger, validateNumber } from 'skills-mcp/shared';

// ❌ 不要用相对路径！
// import { BaseTool } from "../core/index.ts"; // ❌ 错误
```

## 📝 创建外部工具模板

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
import { createLogger } from 'skills-mcp/shared';
import { z } from 'zod';

const log = createLogger('tool:my-tool');

const myInputSchema = {
  param1: z.string().describe('输入参数'),
};

const myOutputSchema = {
  result: z.string().describe('输出结果'),
};

type MyInput = z.infer<z.ZodObject<typeof myInputSchema>>;
type MyOutput = z.infer<z.ZodObject<typeof myOutputSchema>>;

@injectable()
@Tool()
export class MyTool extends BaseTool<
  typeof myInputSchema,
  typeof myOutputSchema,
  MyInput,
  MyOutput
> {
  override getOptions(): ToolOptions<
    typeof myInputSchema,
    typeof myOutputSchema
  > {
    return {
      name: 'my_tool',
      title: '我的工具',
      description: '工具描述',
      inputSchema: myInputSchema,
      outputSchema: myOutputSchema,
    };
  }

  override async onInit(): Promise<void> {
    log.debug('初始化...');
  }

  override async onReady(): Promise<void> {
    log.debug('就绪');
  }

  override async execute(
    input: MyInput,
    context: ToolContext
  ): Promise<ToolResult<MyOutput>> {
    log.info(`执行 ${context.toolName}`);
    return {
      success: true,
      data: { result: `处理完成: ${input.param1}` },
    };
  }
}
```

## 📂 外部工具目录结构

```
SKILLS_MCP_TOOLS_PATH/
├── simple-tool.ts
├── math/
│   ├── add.ts
│   ├── multiply.ts
│   └── advanced/
│       └── matrix.ts
└── _helper.ts  # 以 _ 开头被忽略
```

## 🔧 环境变量

```bash
# 必需：外部工具目录路径
export SKILLS_MCP_TOOLS_PATH="/path/to/tools"

# 可选：启用 Web 服务器（默认 true）
export ENABLE_WEB_SERVER=true
```

## 📋 工具生命周期

```typescript
@injectable()
@Tool()
export class MyTool extends BaseTool {
  // 1. 初始化 - 分配资源
  override async onInit(): Promise<void> {
    // 连接数据库、初始化服务等
  }

  // 2. 就绪 - 验证配置
  override async onReady(): Promise<void> {
    // 测试连接、验证配置等
  }

  // 3. 暂停 - 保存状态
  override async onSuspend?(): Promise<void> {
    // 保存状态、暂停处理等
  }

  // 4. 恢复 - 恢复状态
  override async onResume?(): Promise<void> {
    // 恢复状态等
  }

  // 5. 执行 - 核心逻辑
  override async execute(
    input: MyInput,
    context: ToolContext
  ): Promise<ToolResult<MyOutput>> {
    // 处理输入，返回结果
  }

  // 6. 销毁 - 清理资源
  override async onDestroy?(): Promise<void> {
    // 关闭连接、清理资源等
  }
}
```

## 🔍 故障排查

### 问题 1: 找不到 skills-mcp 包

```bash
# 解决方案：首先构建
cd packages/mcp/skills-mcp
bun run build

# 或使用本地链接
bun install skills-mcp --link
```

### 问题 2: 工具没有被加载

```bash
# 检查：
# 1. 文件名是否以 .ts 结尾
# 2. 类名是否以 Tool 结尾
# 3. 是否使用了 @injectable() 和 @Tool() 装饰器
# 4. 是否在忽略列表中

# 查看日志确认工具是否被加载
bun run src/index.ts 2>&1 | grep "已加载工具"
```

### 问题 3: 类型错误

```typescript
// ❌ 错误：使用 any
const value: any = input.param;

// ✅ 正确：完整的类型
const value: string = input.param;
```

## 📚 相关文档

- **EXTERNAL_TOOLS_GUIDE.md** - 完整的外部工具编写指南
- **ARCHITECTURE_GUIDE.md** - 架构设计和 API 文档
- **UPGRADE_SUMMARY.md** - 升级总结和所有修改

## 🎯 记住

- 建立导入：`skills-mcp/core` 和 `skills-mcp/shared`
- 装饰器：`@injectable()` 和 `@Tool()`
- 环境变量：`SKILLS_MCP_TOOLS_PATH`
- 生命周期：`onInit` → `onReady` → `execute` → `onDestroy`
- 类型安全：零 `any` 类型
