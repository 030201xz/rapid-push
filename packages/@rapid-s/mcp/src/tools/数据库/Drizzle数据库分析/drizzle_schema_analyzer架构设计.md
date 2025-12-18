## 🏗️ 设计方案

### 设计原则

> /home/xz/Projects/030201xy/wf/.skills-mcp/tools/database/drizzle-schema-analyzer

1. **单一职责** - 每个模块只做一件事
2. **DRY** - 抽取公共 AST 工具
3. **可组合** - 解析器可独立使用和组合
4. **类型优先** - 从输出倒推输入
5. **状态共享** - 采用 zustand 理念的状态管理，跨文件共享分析上下文

### 目录结构

```
database/drizzle-schema-analyzer/
├── index.ts                    # 工具入口（MCP Tool 定义）
├── test.ts                     # 测试文件
├── 架构设计.md                  # 本设计文档
├── __test__/                   # 测试用 Schema
│   ├── _schema.ts              # 测试 Schema 命名空间
│   ├── demo-users.schema.ts    # 用户表（主表）
│   └── demo-posts.schema.ts    # 文章表（含外键）
├── types/
│   ├── index.ts                # 类型导出入口
│   ├── input.schema.ts         # 输入 Schema
│   ├── output.schema.ts        # 输出 Schema
│   └── domain-models.ts        # 领域模型（TableInfo, ColumnInfo 等）
├── core/
│   ├── index.ts                # 导出入口
│   ├── analyzer.ts             # 核心分析器（两轮解析策略）
│   ├── analysis-store.ts       # 状态管理（zustand 理念）
│   └── file-scanner.ts         # 文件发现与读取
├── parsers/
│   ├── index.ts                # 解析器导出入口
│   ├── table.parser.ts         # 表定义解析器
│   ├── column.parser.ts        # 字段解析器（含外键解析）
│   ├── index.parser.ts         # 索引解析器
│   └── type-export.parser.ts   # 类型导出解析器
├── ast/
│   ├── index.ts                # AST 工具导出
│   └── drizzle-ast-utils.ts    # Drizzle 特定 AST 工具
└── utils/
    └── naming.ts               # 命名转换工具
```

---

### 核心设计：状态管理（zustand 理念）

采用类似 zustand 的状态管理模式，解决跨文件外键引用解析问题：

```typescript
// 创建 Store（类似 zustand 的 create）
const store = createAnalysisStore();

// 注册表（建立变量名 → 表名映射）
store.registerTable({
  tableName: 'users',
  variableName: 'users',
  filePath: '/path/to/users.schema.ts',
  columnNames: ['id', 'username', 'email'],
});

// 添加待解析的外键引用
store.addPendingReference({
  tableVariable: 'posts',
  columnName: 'authorId',
  referencedTableVariable: 'users',
  referencedColumnName: 'id',
  onDelete: 'cascade',
});

// 获取状态
const state = store.getState();

// 解析外键引用（将变量名替换为实际表名）
resolveReferences(store);
```

#### Store 接口设计

```typescript
interface AnalysisStore {
  getState: () => AnalysisState;
  
  // 表注册
  registerTable: (registry: TableRegistry) => void;
  getTable: (variableName: string) => TableRegistry | undefined;
  getTableName: (variableName: string) => string | undefined;
  hasTable: (variableName: string) => boolean;
  
  // 外键引用
  addPendingReference: (ref: PendingReference) => void;
  getPendingReferences: () => PendingReference[];
  clearPendingReferences: () => void;
  
  // 表信息
  addTableInfo: (tableInfo: TableInfo) => void;
  getTableInfo: (variableName: string) => TableInfo | undefined;
  getAllTableInfos: () => TableInfo[];
  
  // 重置
  reset: () => void;
}
```

---

### 两轮解析策略

解决外键跨文件引用的问题：

```
┌─────────────────────────────────────────────────────────┐
│                    第一轮：解析                          │
├─────────────────────────────────────────────────────────┤
│  1. 扫描所有 Schema 文件                                 │
│  2. 解析表定义，注册到 Store（变量名 → 表名映射）         │
│  3. 解析字段，收集外键引用（此时用变量名标记）            │
│  4. 将完整表信息添加到 Store                             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    第二轮：解析外键                       │
├─────────────────────────────────────────────────────────┤
│  1. 遍历待解析的外键引用                                 │
│  2. 通过 Store 将变量名解析为实际表名                    │
│  3. 填充到对应字段的 constraints.references              │
└─────────────────────────────────────────────────────────┘
```

---

### 输出数据结构

```typescript
// 完整分析结果
interface AnalysisResult {
  schemaPath: string;          // 分析的路径
  tables: TableInfo[];         // 表信息列表
  summary: AnalysisSummary;    // 统计摘要
}

// 表信息
interface TableInfo {
  tableName: string;           // 数据库表名
  variableName: string;        // 代码变量名
  schemaName: string;          // PostgreSQL schema 名
  fileName: string;            // 来源文件名
  filePath: string;            // 来源文件路径
  lineNumber: number;          // 定义行号
  fileJSDoc?: string;          // 文件级 JSDoc
  tableJSDoc?: string;         // 表级 JSDoc
  columns: ColumnInfo[];       // 字段列表
  indexes: IndexInfo[];        // 索引列表
  exportedTypes: TypeExportInfo[]; // 导出的类型
}

// 字段信息
interface ColumnInfo {
  columnName: string;          // 数据库字段名
  propertyName: string;        // 代码属性名
  dataType: string;            // Drizzle 数据类型
  tsType: string;              // 推断的 TypeScript 类型
  lineNumber: number;          // 行号
  jsDoc?: string;              // 字段注释
  constraints: ColumnConstraints; // 约束信息
  columnOptions?: ColumnOptions;  // 字段选项
}

// 字段约束（含外键）
interface ColumnConstraints {
  isPrimaryKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  defaultExpression?: string;
  references?: ForeignKeyInfo;  // 外键引用
}

// 外键引用信息
interface ForeignKeyInfo {
  referencedTable: string;     // 引用的表名
  referencedColumn: string;    // 引用的字段名
  onDelete?: string;           // 删除行为
  onUpdate?: string;           // 更新行为
}
```

---

### 外键解析示例

输入 Schema：
```typescript
export const posts = appSchema.table('posts', {
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});
```

输出结果：
```json
{
  "columnName": "author_id",
  "propertyName": "authorId",
  "dataType": "uuid",
  "tsType": "string",
  "constraints": {
    "isNotNull": true,
    "references": {
      "referencedTable": "users",
      "referencedColumn": "id",
      "onDelete": "cascade"
    }
  }
}
```

---

### 使用场景

1. **文档生成** - 自动生成数据库文档（Markdown / API Doc）
2. **代码生成** - 基于 Schema 生成 DTO、Validator
3. **Schema 审计** - 检查命名规范、索引覆盖、外键完整性
4. **类型同步** - 确保领域模型与数据库 Schema 一致
5. **ER 图生成** - 基于外键关系生成实体关系图
