# MCP Tool 开发工作流

> 本文档指导 Agent/LLM 如何在 `.skills-mcp/tools` 目录中开发一个新的 MCP 工具

## 📋 开发流程概览

```
1. 确定工具功能 → 2. 创建文件 → 3. 定义 Schema → 4. 实现逻辑 → 5. 测试验证
```

---

## 🎯 第一步：确定工具功能

在开发前，明确以下信息：

| 项目         | 说明                        | 示例                      |
| ------------ | --------------------------- | ------------------------- |
| **工具名称** | 唯一标识符，使用 snake_case | `random_welcome`          |
| **功能描述** | 工具做什么（英文 + 中文）   | Generate welcome messages |
| **输入参数** | 用户需要提供什么            | name, role, project       |
| **输出结果** | 工具返回什么                | welcome_message           |

---

## 📁 第二步：创建工具文件

在 `.skills-mcp/tools/` 目录下创建 TypeScript 文件：

```
.skills-mcp/tools/
├── my-new-tool.ts      ← 新建文件
├── random-welcome.ts
└── math/
    └── calculator.ts   ← 支持嵌套目录
```

**文件命名规则：**

- 使用 kebab-case：`my-new-tool.ts`
- 类名使用 PascalCase 并以 `Tool` 结尾：`MyNewTool`
- 避免以 `_` 开头（会被忽略）

---

## 📝 第三步：工具模板

### 完整模板

```typescript
import {
  BaseTool,
  Tool,
  type ToolContext,
  type ToolOptions,
  type ToolResult,
} from "@x/skills-mcp/core";
import { createLogger } from "@x/skills-mcp/shared";
import "reflect-metadata";
import { injectable } from "tsyringe";
import { z } from "zod";

const log = createLogger("tool:my-tool");

// ============================================
// 1. 定义输入 Schema（参数）
// ============================================
const inputSchema = {
  // 必填参数
  param1: z.string().describe("Description in English (中文描述)"),

  // 可选参数
  param2: z.string().optional().describe("Optional param (可选参数)"),

  // 枚举参数
  type: z
    .enum(["option1", "option2"])
    .optional()
    .describe("Type selection (类型选择)"),

  // 数字参数
  count: z.number().optional().describe("Count value (数量)"),

  // 布尔参数
  enabled: z.boolean().optional().describe("Enable feature (启用功能)"),
};

// ============================================
// 2. 定义输出 Schema（返回值）
// ============================================
const outputSchema = {
  result: z.string().describe("The result (结果)"),
  metadata: z
    .object({
      processedAt: z.string(),
      version: z.string(),
    })
    .optional()
    .describe("Metadata (元数据)"),
};

// 类型推导
type InputType = z.infer<z.ZodObject<typeof inputSchema>>;
type OutputType = z.infer<z.ZodObject<typeof outputSchema>>;

// ============================================
// 3. 实现工具类
// ============================================
@injectable()
@Tool()
export class MyNewTool extends BaseTool<
  typeof inputSchema,
  typeof outputSchema,
  InputType,
  OutputType
> {
  // 3.1 工具配置
  override getOptions(): ToolOptions<typeof inputSchema, typeof outputSchema> {
    return {
      name: "my_new_tool", // 唯一标识符
      title: "My New Tool (我的新工具)", // 显示标题
      description:
        "Describe what this tool does in detail. Include use cases and examples. " +
        "(详细描述工具功能，包括使用场景和示例。)",
      inputSchema,
      outputSchema,
    };
  }

  // 3.2 初始化钩子（可选）
  override async onInit(): Promise<void> {
    log.debug("Tool initializing...");
    // 初始化资源、连接等
  }

  // 3.3 就绪钩子（可选）
  override async onReady(): Promise<void> {
    log.debug("Tool ready");
    // 验证配置、预热缓存等
  }

  // 3.4 核心执行逻辑
  override async execute(
    input: InputType,
    context: ToolContext
  ): Promise<ToolResult<OutputType>> {
    const { param1, param2, type, count, enabled } = input;

    log.info(`Executing ${context.toolName} with param1=${param1}`);

    try {
      // ========== 业务逻辑 ==========
      const result = `Processed: ${param1}`;

      // ========== 返回成功结果 ==========
      return {
        success: true,
        data: {
          result,
          metadata: {
            processedAt: new Date().toISOString(),
            version: "1.0.0",
          },
        },
      };
    } catch (error) {
      // ========== 返回错误结果 ==========
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // 3.5 销毁钩子（可选）
  override async onDestroy(): Promise<void> {
    log.debug("Tool destroying...");
    // 清理资源、关闭连接等
  }
}
```

---

## 🔤 第四步：Schema 定义指南

### 常用 Zod 类型

```typescript
import { z } from "zod";

const inputSchema = {
  // 字符串
  text: z.string().describe("Text input (文本输入)"),

  // 可选字符串
  optional: z.string().optional().describe("Optional (可选)"),

  // 带默认值
  withDefault: z
    .string()
    .default("default")
    .describe("With default (带默认值)"),

  // 数字
  count: z.number().describe("Count (数量)"),
  age: z.number().min(0).max(150).describe("Age 0-150 (年龄)"),

  // 布尔
  enabled: z.boolean().describe("Enabled (启用)"),

  // 枚举
  status: z.enum(["active", "inactive", "pending"]).describe("Status (状态)"),

  // 数组
  tags: z.array(z.string()).describe("Tags (标签列表)"),

  // 对象
  config: z
    .object({
      key: z.string(),
      value: z.string(),
    })
    .describe("Config object (配置对象)"),

  // 联合类型
  id: z.union([z.string(), z.number()]).describe("ID string or number (ID)"),
};
```

### 描述编写规范

```typescript
// ✅ 好的描述：英文在前，中文在括号内
z.string().describe(
  "The user's full name for personalized greeting (用于个性化问候的用户全名)"
);

// ✅ 包含示例
z.string().describe(
  "Role or title, e.g. 'Developer', 'Designer' (角色，如'开发者')"
);

// ❌ 避免：只有中文
z.string().describe("用户名");

// ❌ 避免：描述太短
z.string().describe("Name");
```

---

## 🎨 第五步：工具命名规范

### name（工具标识符）

```typescript
name: "random_welcome"; // ✅ snake_case
name: "calculate_sum"; // ✅ 动词_名词
name: "RandomWelcome"; // ❌ 不要用 PascalCase
name: "random-welcome"; // ❌ 不要用 kebab-case
```

### title（显示标题）

```typescript
title: "Random Welcome Message Generator (随机欢迎语生成器)"; // ✅ 英文 + 中文
title: "Calculate Mathematical Expression (计算数学表达式)"; // ✅
```

### description（描述）

```typescript
description: "Generates a personalized welcome message using random templates. " + // 功能
  "Provide name and optional details like role, project. " + // 输入
  "Great for onboarding and team interactions. " + // 使用场景
  "(使用随机模板生成个性化欢迎语。提供姓名和可选详情。适用于入职和团队互动。)"; // 中文
```

---

## 🔄 第六步：生命周期钩子

```typescript
@injectable()
@Tool()
export class MyTool extends BaseTool {
  // 1. 初始化 - 分配资源
  override async onInit(): Promise<void> {
    // 连接数据库、初始化 HTTP 客户端等
  }

  // 2. 就绪 - 验证配置
  override async onReady(): Promise<void> {
    // 测试连接、验证 API Key 等
  }

  // 3. 暂停（可选）
  override async onSuspend(): Promise<void> {
    // 保存状态
  }

  // 4. 恢复（可选）
  override async onResume(): Promise<void> {
    // 恢复状态
  }

  // 5. 执行 - 核心逻辑
  override async execute(input, context): Promise<ToolResult> {
    // 处理请求
  }

  // 6. 销毁 - 清理资源
  override async onDestroy(): Promise<void> {
    // 关闭连接、清理缓存等
  }
}
```

---

## ✅ 第七步：测试验证

### 启动 MCP 服务器

```bash
# 从 monorepo 根目录
bun x-skills-mcp start

# 查看日志确认工具已加载
# [container] ✓ 已加载工具: my_new_tool (MyNewTool)
```

### 验证工具注册

检查日志输出：

```
[container] 正在加载外部工具（自动发现: /path/to/.skills-mcp/tools）...
[container] ✓ 已加载工具: my_new_tool (MyNewTool) 来自 /path/to/my-new-tool.ts
[container] 共加载 N 个工具
```

---

## 📚 完整示例：随机欢迎语工具

参考文件：`.skills-mcp/tools/random-welcome.ts`

**功能特点：**

- 5 个带占位符的欢迎语模板
- 支持 mood 参数选择风格
- 支持 time_of_day 生成情境问候
- 完整的输入输出 Schema

---

## 🚫 常见错误

### 1. 忘记装饰器

```typescript
// ❌ 错误：缺少装饰器
export class MyTool extends BaseTool {}

// ✅ 正确：必须有两个装饰器
@injectable()
@Tool()
export class MyTool extends BaseTool {}
```

### 2. 类名不以 Tool 结尾

```typescript
// ❌ 错误：不会被扫描到
export class WelcomeGenerator extends BaseTool {}

// ✅ 正确：类名必须以 Tool 结尾
export class WelcomeGeneratorTool extends BaseTool {}
```

### 3. 忘记导入 reflect-metadata

```typescript
// ❌ 错误：装饰器不会工作
import { injectable } from "tsyringe";

// ✅ 正确：必须导入
import "reflect-metadata";
import { injectable } from "tsyringe";
```

### 4. Schema 描述只有中文

```typescript
// ❌ 错误：Agent 可能无法理解
z.string().describe("用户名");

// ✅ 正确：英文为主，中文补充
z.string().describe("Username for login (登录用户名)");
```

---

## 📋 开发检查清单

- [ ] 文件放在 `.skills-mcp/tools/` 目录下
- [ ] 类名以 `Tool` 结尾
- [ ] 使用 `@injectable()` 和 `@Tool()` 装饰器, 使用`@Tool`的才会被 skills-mcp 识别并加载成工具
- [ ] 导入了 `reflect-metadata`
- [ ] `name` 使用 snake_case
- [ ] `title` 包含英文和中文
- [ ] `description` 详细描述功能和使用场景
- [ ] 所有参数都有 `.describe()` 描述
- [ ] 描述格式：英文 (中文)
- [ ] `execute` 方法返回 `{ success, data }` 或 `{ success, error }`
- [ ] 使用 `createLogger` 记录日志

---

## 🔗 相关资源

- 工具基类：`@x/skills-mcp/core` → `BaseTool`
- 日志工具：`@x/skills-mcp/shared` → `createLogger`
- 示例工具：`.skills-mcp/tools/random-welcome.ts`
- CLI 命令：`bun x-skills-mcp start`
