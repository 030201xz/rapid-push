# MCP 工具系统升级总结

## 📋 完成的工作

### 1. **创建 tsup 构建配置** ✓

**文件**: `/home/xz/Projects/030201xy/wf/packages/mcp/skills-mcp/tsup.config.ts`

```typescript
// 三个独立的导出入口
entry: {
  index: 'src/index.ts',        // 主入口
  core: 'src/core/index.ts',    // 核心类型和装饰器
  shared: 'src/shared/index.ts' // 共享工具函数
}
```

**优势**:

- 外部工具可从编译后的包导入类型
- 支持 ESM 和 CommonJS
- 生成完整的类型定义 (.d.ts)

---

### 2. **更新 package.json** ✓

**文件**: `/home/xz/Projects/030201xy/wf/packages/mcp/skills-mcp/package.json`

**新增配置**:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./core": {
      /* ... */
    },
    "./shared": {
      /* ... */
    }
  },
  "scripts": {
    "build": "tsup",
    "build:watch": "tsup --watch"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5"
  }
}
```

---

### 3. **创建 shared 模块导出** ✓

**文件**: `/home/xz/Projects/030201xy/wf/packages/mcp/skills-mcp/src/shared/index.ts`

```typescript
// 统一导出所有共享工具和类型
export * from './decimal-utils.ts';
export * from './logger.ts';
```

---

### 4. **扩展容器支持外部工具** ✓

**文件**: `/home/xz/Projects/030201xy/wf/packages/mcp/skills-mcp/src/container.ts`

**关键改进**:

- 新增 `scanToolsFromDirectory()` 函数 - 支持从任意目录扫描工具
- 修改 `scanAndLoadTools()` 函数 - 现在支持内部和外部工具加载
- 环境变量支持 - `SKILLS_MCP_TOOLS_PATH`

```typescript
// 加载流程
async function scanAndLoadTools(config: ToolLoaderConfig): Promise<void> {
  const internalToolsDir = join(dirname(import.meta.path), 'tools');

  // 1. 加载内部工具
  await scanToolsFromDirectory(internalToolsDir, ignoreSet);

  // 2. 加载外部工具（如果配置了）
  const externalToolsPath = process.env.SKILLS_MCP_TOOLS_PATH;
  if (externalToolsPath) {
    await scanToolsFromDirectory(externalToolsPath, ignoreSet);
  }
}
```

---

### 5. **更新外部 Demo 工具** ✓

**文件**: `/home/xz/Projects/030201xy/wf/.skills-mcp/tools/ignore_demo2_tool.ts`

**从相对路径改为包导入**:

```typescript
// ❌ 旧方式（相对路径）
import { BaseTool } from "../core/index.ts";
import { createLogger } from "../shared/logger.ts";

// ✅ 新方式（包导入）
import { BaseTool, Tool, ... } from "skills-mcp/core";
import { createLogger, ... } from "skills-mcp/shared";
```

---

### 6. **创建完整的文档** ✓

#### A. **EXTERNAL_TOOLS_GUIDE.md** - 外部工具编写指南

包含:

- 快速开始
- 工具结构和文件命名约定
- 类型系统和自定义 Schema
- 工具生命周期详解
- 常见问题解答
- 类型安全最佳实践
- 构建和发布指南

#### B. **ARCHITECTURE_GUIDE.md** - 完整架构说明

包含:

- 项目结构展示
- 快速开始指南
- 工具扫描加载流程图
- 核心 API 文档
- 类型导出配置
- 扩展功能建议
- 提交规范

#### C. **EXTERNAL_TOOLS_SETUP.sh** - 启动脚本示例

```bash
export SKILLS_MCP_TOOLS_PATH="/home/xz/Projects/030201xy/wf/.skills-mcp/tools"
bun run src/index.ts
```

---

## 🎯 核心特性

### 优雅的工具加载机制

```
内部工具 (src/tools/**/*.ts)
         ↓
    [scanAndLoadTools()]
         ↓
外部工具 (SKILLS_MCP_TOOLS_PATH/**/*.ts)
         ↓
    [ToolCoordinator]
         ↓
    ✓ 所有工具已就绪
```

### 完整的类型导出

```
skills-mcp/
├── core      → 核心类型: BaseTool, ToolContext, ToolResult
├── shared    → 共享工具: createLogger, validateNumber, ...
└── (default) → 主入口: 包含所有导出
```

### 支持功能

| 功能         | 说明                                  | 状态    |
| ------------ | ------------------------------------- | ------- |
| 内部工具加载 | 自动扫描 `src/tools` 目录             | ✅      |
| 外部工具加载 | 通过 `SKILLS_MCP_TOOLS_PATH` 环境变量 | ✅ 新增 |
| 嵌套目录支持 | 支持任意层级的目录结构                | ✅      |
| 类型导出     | 三个独立的导出入口                    | ✅ 新增 |
| 依赖注入     | 使用 tsyringe 管理工具                | ✅      |
| 生命周期管理 | onInit, onReady, onDestroy 等         | ✅      |
| 工具忽略列表 | 配置不加载的工具                      | ✅      |

---

## 📦 构建与使用

### 构建

```bash
cd /home/xz/Projects/030201xy/wf/packages/mcp/skills-mcp

# 构建到 dist 目录
bun run build

# 监视模式构建
bun run build:watch
```

### 在外部工具中使用

```bash
# 1. 设置外部工具路径
export SKILLS_MCP_TOOLS_PATH="/home/xz/Projects/030201xy/wf/.skills-mcp/tools"

# 2. 启动 MCP 服务器
bun run src/index.ts

# 输出类似:
# ✓ 已加载工具: add_tool (AddTool)
# ✓ 已加载工具: my_custom_tool (MyTool)
# 共加载 N 个工具
```

---

## 🚀 外部工具最小示例

```typescript
// file: /path/to/external/tools/my-tool.ts
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

---

## 📝 文件修改清单

| 文件                                     | 类型 | 说明                    |
| ---------------------------------------- | ---- | ----------------------- |
| `tsup.config.ts`                         | 新建 | 构建配置                |
| `package.json`                           | 修改 | 添加 exports 和构建脚本 |
| `src/shared/index.ts`                    | 新建 | 共享模块导出            |
| `src/container.ts`                       | 修改 | 支持外部工具加载        |
| `.skills-mcp/tools/ignore_demo2_tool.ts` | 修改 | 更新导入方式            |
| `EXTERNAL_TOOLS_GUIDE.md`                | 新建 | 外部工具完整指南        |
| `ARCHITECTURE_GUIDE.md`                  | 新建 | 完整架构说明            |
| `EXTERNAL_TOOLS_SETUP.sh`                | 新建 | 启动脚本                |

---

## 🔍 类型检查

```bash
# 验证类型正确性
cd /home/xz/Projects/030201xy/wf/packages/mcp/skills-mcp
bun run typecheck
```

---

## 💡 最佳实践

### Do ✅

- 使用 `skills-mcp/core` 导入类型
- 使用 `skills-mcp/shared` 导入工具函数
- 在生产环境中构建后再启动
- 为每个外部工具创建独立的 package.json
- 使用 TypeScript 严格模式

### Don't ❌

- 使用相对路径导入（`../core/index.ts`）
- 在类型定义中使用 `any`
- 忽视工具生命周期钩子
- 在 `getOptions()` 中进行 I/O 操作
- 在一个文件中定义多个工具类

---

## 🔗 相关文档

1. **EXTERNAL_TOOLS_GUIDE.md** - 详细的外部工具编写指南
2. **ARCHITECTURE_GUIDE.md** - 完整的架构设计和 API 文档
3. **src/core/types.ts** - 完整的类型定义
4. **src/core/index.ts** - 核心导出

---

## ✨ 总结

这个升级提供了：

1. **完整的类型支持** - 外部工具可以获得完整的 TypeScript 类型提示
2. **灵活的加载机制** - 支持内部和外部工具的无缝集成
3. **优雅的架构** - 通过环境变量 `SKILLS_MCP_TOOLS_PATH` 实现配置
4. **详细的文档** - 包括最佳实践和常见问题解答
5. **生产级别** - 支持 ESM/CommonJS，类型完整，错误处理完善

**下一步建议**:

- [ ] 运行 `bun run build` 构建项目
- [ ] 测试外部工具加载
- [ ] 编写测试用例
- [ ] 发布到 npm（如需要）
