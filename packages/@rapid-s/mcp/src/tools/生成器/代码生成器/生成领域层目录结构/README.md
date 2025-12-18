# Domain Scaffold Generator (领域层脚手架生成器)

> 根据 DDD 结构化 JSON 输入生成 Domain 层目录结构和占位文件

## 功能特性

- 解析 DDD 结构定义 JSON
- 生成聚合根、实体、值对象、状态、事件等占位文件
- 生成 Repository 接口、领域服务、异常等占位文件
- 文件使用 `.keep` 后缀标识占位
- 生成带有 JSDoc 和骨架代码的内容

## 使用方法

### MCP Tool 调用

```typescript
// 工具名称
ddd_domain_scaffold_generator

// 输入参数
{
  "outputPath": "/path/to/output",
  "structure": {
    "architecture": {
      "contexts": [
        {
          "name": "wallet",
          "subdomains": [
            {
              "name": "wallet-account-management",
              "type": "core-domain",
              "layers": [
                {
                  "name": "domain",
                  "aggregates": [
                    {
                      "name": "wallet-account",
                      "root": "wallet-account.aggregate.ts",
                      "repository": "wallet-account.repository.interface.ts",
                      "files": {
                        "entities": ["wallet-account.entity.ts"],
                        "value-objects": ["balance.vo.ts"],
                        "states": ["active.state.ts"],
                        "events": ["wallet-account.events.ts"]
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  "options": {
    "placeholderSuffix": ".keep",
    "overwrite": false
  }
}
```

## 生成的目录结构

```
wallet-account-management/
└── domain/
    ├── wallet-account/
    │   ├── wallet-account.aggregate.ts.keep
    │   ├── wallet-account.repository.interface.ts.keep
    │   ├── entities/
    │   │   ├── wallet-account.entity.ts.keep
    │   │   └── index.ts.keep
    │   ├── value-objects/
    │   │   ├── balance.vo.ts.keep
    │   │   └── index.ts.keep
    │   ├── states/
    │   │   ├── active.state.ts.keep
    │   │   └── index.ts.keep
    │   ├── events/
    │   │   ├── wallet-account.events.ts.keep
    │   │   └── index.ts.keep
    │   └── index.ts.keep
    ├── services/
    │   ├── wallet-transaction.service.ts.keep
    │   └── index.ts.keep
    └── exceptions/
        ├── wallet.errors.ts.keep
        └── index.ts.keep
```

## 占位文件内容示例

### 聚合根

```typescript
/**
 * @file wallet-account.aggregate.ts
 * @description 钱包账户聚合根
 * @aggregate wallet-account
 * @subdomain wallet-account-management
 *
 * TODO: 实现聚合根逻辑
 */

/**
 * 钱包账户聚合根
 */
export class WalletAccountAggregate {
  // TODO: 实现聚合根属性和方法
}
```

### 值对象

```typescript
/**
 * @file balance.vo.ts
 * @description Balance 值对象
 * @aggregate wallet-account
 *
 * TODO: 实现值对象
 */

/**
 * Balance 值对象
 */
export class Balance {
  private constructor() {}

  static create(): Balance {
    throw new Error("Not implemented");
  }

  equals(other: Balance): boolean {
    throw new Error("Not implemented");
  }
}
```

## 测试

```bash
# 运行测试脚本
bun run .skills-mcp/tools/生成器/代码生成器/生成领域层目录结构/test.ts
```

## 架构设计

```
生成领域层目录结构/
├── index.ts                    # MCP 工具入口
├── types/
│   ├── input.schema.ts         # 输入 Schema
│   └── output.schema.ts        # 输出 Schema
├── core/
│   ├── ir.ts                   # 中间表示层
│   └── orchestrator.ts         # 编排器
├── parser/
│   └── input-parser.ts         # 输入解析器
├── renderer/
│   └── placeholder-renderer.ts # 占位文件渲染器
├── writer/
│   └── file-writer.ts          # 文件写入器
└── utils/
    └── naming.ts               # 命名工具
```

## 数据流

```
Input JSON → Parser → IR → Renderer → Writer → .keep Files
```
