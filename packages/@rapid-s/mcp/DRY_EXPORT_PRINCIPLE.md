# DRY 导出原则实施

## 目标：零心智负担

不应该手动维护导出列表，应该自动导出所有类型和工具。

## 实现

### 1. index-types.ts - 简化到最少

```typescript
/**
 * MCP Skills 工具系统 - 导出所有类型和工具
 */

// 导出所有核心类型和工具
export * from './core/index.ts';
export * from './shared/index.ts';
```

**优势**:

- ✅ 零手动维护
- ✅ 自动包含所有新增导出
- ✅ 类型完全
- ✅ 不需要心智负担

### 2. core/index.ts - 已经是 re-export

```typescript
export * from './coordinator.ts';
export * from './decorators.ts';
export * from './tool-scanner.ts';
export * from './types.ts';
```

### 3. shared/index.ts - 已经是 re-export

```typescript
export * from './decimal-utils.ts';
export * from './logger.ts';
```

### 4. tsup.config.ts - 指向 index-types.ts

```typescript
entry: {
  index: 'src/index-types.ts',  // ← 主入口自动导出所有
  core: 'src/core/index.ts',
  shared: 'src/shared/index.ts',
}
```

## 使用方式保持不变

### 外部工具导入

```typescript
// ✅ 所有导出从这里来
import {
  BaseTool,
  Tool,
  ToolContext,
  ToolResult,
  createLogger,
  validateNumber,
  // ... 任何新增的都自动可用
} from 'skills-mcp';

// ✅ 也支持细粒度导入
import { BaseTool, Tool } from 'skills-mcp/core';
import { createLogger } from 'skills-mcp/shared';
```

## 好处

1. **自动扩展** - 新增任何导出，外部自动可用
2. **无维护成本** - 不需要手动同步导出列表
3. **类型完全** - 所有类型都通过导出链自动推导
4. **简洁代码** - 最小化代码行数

## 提交

```bash
git add -A
git commit -m "refactor: 优化导出机制，零手动维护

- 简化 index-types.ts，使用 export * 自动导出所有
- 调整 tsup 主入口指向 index-types.ts
- 移除手动导出列表，遵循 DRY 原则"
```
