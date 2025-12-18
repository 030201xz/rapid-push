# Skills MCP - 优雅的工具加载与类型导出系统

> Model Context Protocol (MCP) 服务器，支持内部与外部工具的优雅加载机制

## 核心特性

### 🎯 优雅的工具加载机制

- **内部工具**：自动扫描 `src/tools` 目录（支持嵌套）
- **外部工具**：通过环境变量 `SKILLS_MCP_TOOLS_PATH` 灵活加载
- **类型安全**：完整的 TypeScript 类型支持，零 `any` 类型
- **依赖注入**：使用 tsyringe 管理工具生命周期

### 📦 完整的类型导出

使用 tsup 构建，提供三个独立的导出入口：

```
skills-mcp/         → 主入口（包含所有导出）
skills-mcp/core     → 核心类型和装饰器
skills-mcp/shared   → 共享工具函数
```

### 🔄 工具生命周期管理

完整的工具生命周期钩子：

- `onInit()` - 初始化
- `onReady()` - 就绪
- `onSuspend()` - 暂停
- `onResume()` - 恢复
- `onDestroy()` - 销毁

## 项目结构

```
packages/mcp/skills-mcp/
├── src/
│   ├── core/              # 核心模块
│   │   ├── types.ts       # 类型定义
│   │   ├── decorators.ts  # 装饰器
│   │   ├── coordinator.ts # 生命周期协调器
│   │   └── index.ts       # 核心导出
│   ├── shared/            # 共享模块
│   │   ├── logger.ts      # 日志工具
│   │   ├── decimal-utils.ts # 十进制计算
│   │   └── index.ts       # 共享导出
│   ├── tools/             # 内部工具
│   │   └── math/
│   │       ├── add.ts
│   │       ├── multiply.ts
│   │       └── ...
│   ├── container.ts       # DI 容器（支持外部工具）
│   ├── index.ts           # 主入口
│   └── ...
├── .skills-mcp/           # 自动生成
│   └── tool-names.ts      # 工具名称类型定义
├── tsup.config.ts         # 构建配置
├── package.json           # 包配置（带 exports）
└── EXTERNAL_TOOLS_GUIDE.md # 外部工具编写指南
```

## 快速开始

### 构建与发布

```bash
# 构建 dist
bun run build

# 监视构建
bun run build:watch

# 安装到本地（开发）
cd /path/to/project
bun install skills-mcp --link
```

### 使用内部工具

```bash
# 启动 MCP 服务器
bun run src/index.ts
```

### 加载外部工具

```bash
# 设置外部工具目录
export SKILLS_MCP_TOOLS_PATH="/path/to/external/tools"

# 启动 MCP 服务器
bun run src/index.ts
```

## 外部工具集成

### 最小工具示例

在 `SKILLS_MCP_TOOLS_PATH/my-tool.ts` 中：

```typescript
import "reflect-metadata";
import { injectable } from "tsyringe";
import {
  BaseTool,
  Tool,
  type ToolContext,
  type ToolOptions,
  type ToolResult,
} from "skills-mcp/core";
import { createLogger } from "skills-mcp/shared";
import { z } from "zod";

const log = createLogger("tool:my-tool");

@injectable()
@Tool()
export class MyTool extends BaseTool<
  { input: typeof z.string() },
  { output: typeof z.string() }
> {
  override getOptions(): ToolOptions {
    return {
      name: "my_tool",
      title: "我的工具",
      description: "自定义工具示例",
      inputSchema: { input: z.string() },
      outputSchema: { output: z.string() },
    };
  }

  override async execute(
    input: { input: string },
    context: ToolContext
  ): Promise<ToolResult<{ output: string }>> {
    log.info(`执行 ${context.toolName}`);
    return {
      success: true,
      data: { output: `处理完成: ${input.input}` },
    };
  }
}
```

详细指南见：[EXTERNAL_TOOLS_GUIDE.md](./EXTERNAL_TOOLS_GUIDE.md)

## 工具扫描与加载流程

```
启动 MCP 服务器
    ↓
[configureContainer()]
    ├─→ 注册 MCP 服务器实例
    ├─→ 注册 ToolCoordinator
    ├─→ 生成工具名称类型定义
    └─→ [scanAndLoadTools()]
        ├─→ [scanToolsFromDirectory()] - 内部 tools/
        │   └─→ 动态导入 *.ts 文件
        │       └─→ 查找 *Tool 类并注册
        └─→ [scanToolsFromDirectory()] - 外部 SKILLS_MCP_TOOLS_PATH
            └─→ 动态导入 *.ts 文件
                └─→ 查找 *Tool 类并注册
    ↓
[resolveAllTools()]
    └─→ 获取所有已加载的工具实例
    ↓
[ToolCoordinator.registerTools()]
    ├─→ 初始化所有工具 (onInit)
    ├─→ 就绪所有工具 (onReady)
    └─→ 在 MCP 服务器注册工具
    ↓
✓ 所有工具已就绪，MCP 服务器运行
```

## 核心 API

### BaseTool 基类

```typescript
abstract class BaseTool<TInput, TOutput, TInputType, TOutputType> {
  // 获取工具配置
  abstract getOptions(): ToolOptions<TInput, TOutput>;

  // 生命周期钩子
  async onInit(): Promise<void>;
  async onReady(): Promise<void>;
  async onSuspend?(): Promise<void>;
  async onResume?(): Promise<void>;
  async onDestroy?(): Promise<void>;

  // 执行工具
  abstract execute(
    input: TInputType,
    context: ToolContext
  ): Promise<ToolResult<TOutputType>>;

  // 获取生命周期状态
  get lifecycle(): ToolLifecycle;
}
```

### ToolContext 上下文

```typescript
interface ToolContext {
  readonly toolName: string; // 工具名称
  readonly timestamp: number; // 调用时间戳
}
```

### ToolResult 结果

```typescript
interface ToolResult<T = unknown> {
  success: boolean; // 是否成功
  data?: T; // 结构化结果
  error?: string; // 错误信息
}
```

## 类型导出配置

### package.json exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./core": {
      "import": "./dist/core.js",
      "require": "./dist/core.cjs",
      "types": "./dist/core.d.ts"
    },
    "./shared": {
      "import": "./dist/shared.js",
      "require": "./dist/shared.cjs",
      "types": "./dist/shared.d.ts"
    }
  }
}
```

### 在外部工具中导入

```typescript
// 导入核心类型
import {
  BaseTool,
  Tool,
  type ToolOptions,
  type ToolContext,
  type ToolResult,
} from 'skills-mcp/core';

// 导入共享工具
import {
  createLogger,
  validateNumber,
  createCalculationOutput,
  twoNumbersInputSchema,
  calculationOutputSchema,
} from 'skills-mcp/shared';
```

## 工具忽略列表

在 `src/index.ts` 中配置：

```typescript
const TOOL_LOADER_CONFIG: ToolLoaderConfig = {
  ignore: ['demo_tool', 'experimental_tool'],
};
```

## 建议与最佳实践

### ✅ 应该做

- 使用 TypeScript 严格模式
- 为复杂逻辑编写中文注释
- 在 `onInit()` 中分配资源
- 在 `onDestroy()` 中释放资源
- 使用依赖注入管理服务
- 每个 `execute()` 方法保持在 30 行以内

### ❌ 不应该做

- 使用 `any` 类型
- 在工具文件中混合多个工具类
- 忽视生命周期管理
- 使用全局状态
- 在 `getOptions()` 中进行 I/O 操作

## 扩展功能

### 支持多个外部工具目录

修改 `src/container.ts` 中的 `scanAndLoadTools()`：

```typescript
const externalPaths = process.env.SKILLS_MCP_TOOLS_PATH?.split(':') || [];
for (const toolsPath of externalPaths) {
  await scanToolsFromDirectory(toolsPath, ignoreSet);
}
```

### 自定义工具注册策略

继承 `ToolCoordinator` 并覆写 `registerTools()` 方法。

## 环境变量

| 变量                    | 说明            | 示例             |
| ----------------------- | --------------- | ---------------- |
| `SKILLS_MCP_TOOLS_PATH` | 外部工具目录    | `/path/to/tools` |
| `ENABLE_WEB_SERVER`     | 启用 Web 服务器 | `true` (默认)    |

## 文件说明

| 文件                      | 说明                            |
| ------------------------- | ------------------------------- |
| `tsup.config.ts`          | 构建配置，导出三个独立入口      |
| `package.json`            | 包配置，定义 exports 字段       |
| `src/container.ts`        | DI 容器，支持内部与外部工具加载 |
| `EXTERNAL_TOOLS_GUIDE.md` | 外部工具编写完整指南            |

## 提交规范

遵循 Conventional Commits：

```bash
# 功能提交
git commit -m "feat: 添加外部工具支持"

# 修复提交
git commit -m "fix: 修复工具加载路径问题"

# 文档提交
git commit -m "docs: 更新外部工具指南"

# 类型提交
git commit -m "type: 改进 BaseTool 类型定义"
```

## 许可证

MIT
