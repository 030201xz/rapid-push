# 领域分析器

纯粹的 DDD 领域结构分析工具，支持递归分析多个领域。

## 功能特性

- 🔍 **递归分析**：支持从限界上下文、子域或 domain 目录层级开始分析
- 📊 **完整识别**：精准识别 8 种领域元素
- 🔗 **关系建立**：自动建立领域元素间的关联关系
- 🎯 **纯粹职责**：只做领域结构分析，不涉及代码生成建议

## 识别的领域元素

| 元素类型 | 识别方式 |
|---------|---------|
| 限界上下文 | 目录名 `context-*` |
| 聚合根 | `*.aggregate.ts`、类名以 `Aggregate` 结尾 |
| 实体 | `*.entity.ts`、类名以 `Entity` 结尾 |
| 值对象 | `*.vo.ts`、`*.value-object.ts`、目录 `value-objects/` |
| 领域事件 | `*.event.ts`、类名以 `Event` 结尾 |
| 领域服务 | `*.service.ts`、类名以 `Service` 结尾 |
| 领域状态 | `*.state.ts`、枚举或联合类型 |
| 仓储接口 | `*.repository.interface.ts`、接口名以 `Repository` 结尾 |

## 使用方式

### MCP 工具调用

```json
{
  "tool": "ddd_domain_analyzer",
  "arguments": {
    "entryPath": "/path/to/context-user/identity-access",
    "options": {
      "maxDepth": 10,
      "includeRelations": true
    }
  }
}
```

### 编程方式

```typescript
import { analyzeDomainStructure, createAnalyzer } from "./core";

// 简单调用
const result = await analyzeDomainStructure("/path/to/domain");

// 带选项调用
const result = await analyzeDomainStructure("/path/to/domain", {
  maxDepth: 10,
  includeRelations: true,
});

// 使用 Store（需要直接访问状态）
const { store, analyze } = createAnalyzer("/path/to/domain");
const result = await analyze();
const aggregates = store.getAggregates();
```

## 输出结构

```typescript
interface AnalysisResult {
  // 分析概要
  summary: {
    entryPath: string;
    analyzedAt: string;
    duration: number;
    stats: {
      contexts: number;
      aggregates: number;
      entities: number;
      valueObjects: number;
      events: number;
      services: number;
      states: number;
      repositories: number;
      totalFiles: number;
    };
  };

  // 限界上下文列表
  contexts: BoundedContext[];

  // 领域元素（扁平化）
  elements: {
    aggregates: AggregateRoot[];
    entities: Entity[];
    valueObjects: ValueObject[];
    domainEvents: DomainEvent[];
    domainServices: DomainService[];
    domainStates: DomainState[];
    repositories: Repository[];
  };

  // 关系图（可选）
  relations?: DomainRelation[];
}
```

## 架构设计

```
领域分析/
├── index.tool.ts         # MCP 工具入口
├── test.ts               # 测试文件
├── README.md             # 文档
│
├── core/                 # 核心逻辑（可独立拆包）
│   ├── index.ts          # 导出入口
│   ├── store.ts          # Zustand-like 状态管理
│   ├── analyzer.ts       # 分析器编排
│   ├── scanner.ts        # 目录扫描与领域发现
│   └── errors.ts         # 错误定义
│
├── parsers/              # AST 解析器
│   ├── index.ts          # 统一导出
│   ├── aggregate.parser.ts
│   ├── entity.parser.ts
│   ├── value-object.parser.ts
│   ├── domain-event.parser.ts
│   ├── domain-service.parser.ts
│   ├── domain-state.parser.ts
│   └── repository.parser.ts
│
├── ast/                  # AST 工具层
│   ├── index.ts
│   ├── ts-parser.ts      # TypeScript 解析封装
│   ├── pattern-matcher.ts # 模式识别
│   └── type-extractor.ts # 类型信息提取
│
└── types/                # 类型定义
    ├── index.ts
    ├── input.schema.ts
    ├── output.schema.ts
    └── domain-models.ts
```

## 设计理念

### Zustand-like 状态管理

```typescript
const store = createDomainAnalysisStore(entryPath);

// 注册领域元素
store.registerAggregate(aggregate);
store.registerValueObject(vo);

// 查询
const aggregates = store.getAggregates();
const byContext = store.getAggregatesByContext("ctx-1");

// 导出
const result = store.toJSON();
```

### 可复用性

核心逻辑（`core/`）独立无外部依赖，可直接拆成独立 package 供后端服务使用。
