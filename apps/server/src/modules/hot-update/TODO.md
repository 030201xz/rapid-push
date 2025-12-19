# 热更新模块开发进度

> 最后更新：2025-12-19

## 模块概览

| 模块                 | 状态      | 说明                                 |
| -------------------- | --------- | ------------------------------------ |
| organizations        | ✅ 已完成 | 组织管理                             |
| organization-members | ✅ 已完成 | 用户-组织多对多关联                  |
| projects             | ✅ 已完成 | 项目管理（依赖 organizations）       |
| channels             | ✅ 已完成 | 渠道管理 + 代码签名（依赖 projects） |
| assets               | ✅ 已完成 | 资源文件（内容寻址存储）             |
| updates              | ✅ 已完成 | 更新发布（依赖 channels）            |
| update-assets        | ✅ 已完成 | 更新-资源关联表                      |
| directives           | ✅ 已完成 | 指令管理（依赖 channels）            |
| rollout-rules        | ✅ 已完成 | 灰度规则（依赖 updates）             |

## 初始化脚本

| 任务                   | 状态      | 说明                                  |
| ---------------------- | --------- | ------------------------------------- |
| 0-env.ts ID 配置       | ✅ 已完成 | 添加 Organization/Project/Channel IDs |
| 02-hot-update 配置目录 | ✅ 已完成 | 演示组织、项目、渠道配置              |
| init-all.ts 更新       | ✅ 已完成 | 集成热更新模块初始化                  |

## 数据模型关系

```
users (已有)
  │
  └──▶ organization_members ←──▶ organizations
                                     │
                                     └──▶ projects
                                             │
                                             └──▶ channels
                                                     │
                                                     ├──▶ updates
                                                     │       │
                                                     │       ├──▶ update_assets ←──▶ assets
                                                     │       │
                                                     │       └──▶ rollout_rules
                                                     │
                                                     └──▶ directives
```

## 开发顺序

### 第一批（基础层）

- [ ] organizations - 无外部依赖
- [ ] assets - 无外部依赖

### 第二批（依赖组织）

- [ ] organization-members - 依赖 organizations + users
- [ ] projects - 依赖 organizations

### 第三批（依赖项目）

- [ ] channels - 依赖 projects

### 第四批（依赖渠道）

- [ ] updates - 依赖 channels
- [ ] directives - 依赖 channels

### 第五批（依赖更新）

- [ ] update-assets - 依赖 updates + assets
- [ ] rollout-rules - 依赖 updates

---

## 开发日志

### 2025-12-19

- 创建模块结构和 TODO.md
- 开始开发...

## 对话记录

```markdown
现在我已经完全了解了：

1. **之前项目的数据模型**: Organizations → Projects → Channels → Updates → Assets（多级层次结构）
2. **当前项目的架构风格**:
   - 使用 `appSchema` 创建表
   - 不使用数据库外键，通过应用层保证引用完整性
   - Schema 文件包含表定义 + Zod Schema + 类型导出
   - Service 是纯函数，依赖注入 db
   - Router 使用 tRPC 风格
   - 类型通过 `ReturnType` 推断

让我为您设计一个完整的热更新服务模块方案：

---

## 📋 热更新服务模块设计方案

### 1. 模块划分（DDD 风格）

根据业务域，建议在 modules 下新建 **`hot-update`** 域，包含以下子模块：
```

src/modules/
├── core/ # 已有：身份 + 权限
│ ├── identify/
│ └── access-control/
│
└── hot-update/ # 新建：热更新域
├── index.ts # 聚合入口
│
├── organizations/ # 组织管理
│ ├── schema.ts
│ ├── service.ts
│ ├── router.ts
│ └── types.ts
│
├── projects/ # 项目管理
│ ├── schema.ts
│ ├── service.ts
│ ├── router.ts
│ └── types.ts
│
├── channels/ # 渠道管理（含代码签名）
│ ├── schema.ts
│ ├── service.ts
│ ├── router.ts
│ └── types.ts
│
├── updates/ # 更新发布
│ ├── schema.ts
│ ├── service.ts
│ ├── router.ts
│ └── types.ts
│
├── assets/ # 资源文件
│ ├── schema.ts
│ ├── service.ts
│ ├── router.ts
│ └── types.ts
│
├── update-assets/ # 更新-资源关联
│ ├── schema.ts
│ ├── service.ts
│ └── types.ts
│
├── directives/ # 指令管理（回滚等）
│ ├── schema.ts
│ ├── service.ts
│ ├── router.ts
│ └── types.ts
│
├── rollout-rules/ # 灰度发布规则
│ ├── schema.ts
│ ├── service.ts
│ ├── router.ts
│ └── types.ts
│
└── organization-members/ # 组织成员（用户-组织关联）
├── schema.ts
├── service.ts
├── router.ts
└── types.ts

```

### 2. 数据模型设计（ER 图）

```

┌──────────────────────────────────────────────────────────────────────────────┐
│ 热更新服务数据模型 │
└──────────────────────────────────────────────────────────────────────────────┘

users (已有)
│
├──▶ organization_members (多对多，新建)
│ │
│ └──▶ organizations (组织)
│ │
│ └──▶ projects (项目)
│ │
│ └──▶ channels (渠道)
│ │
│ ├──▶ updates (更新)
│ │ │
│ │ ├──▶ update_assets (更新-资源关联)
│ │ │ │
│ │ │ └──▶ assets (资源)
│ │ │
│ │ └──▶ rollout_rules (灰度规则)
│ │
│ └──▶ directives (指令)

````

### 3. 各表 Schema 设计

#### 3.1 Organizations（组织表）
```typescript
{
  id: uuid,                  // 主键
  name: varchar(100),        // 组织名称
  slug: varchar(100),        // URL 标识（唯一）
  description: text,         // 描述
  ownerId: uuid,             // 所有者（关联 users.id）
  isDeleted: boolean,        // 软删除
  createdAt: timestamp,
  updatedAt: timestamp,
}
````

#### 3.2 Organization Members（组织成员表）

```typescript
{
  id: uuid,
  organizationId: uuid,      // 组织 ID（应用层保证）
  userId: uuid,              // 用户 ID（应用层保证）
  role: varchar(20),         // 角色：owner | admin | member
  joinedAt: timestamp,
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

#### 3.3 Projects（项目表）

```typescript
{
  id: uuid,
  organizationId: uuid,      // 所属组织（应用层保证）
  name: varchar(100),        // 项目名称
  slug: varchar(100),        // URL 标识
  description: text,
  isDeleted: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
}
// 约束：(organizationId, slug) 组合唯一
```

#### 3.4 Channels（渠道表）

```typescript
{
  id: uuid,
  projectId: uuid,           // 所属项目（应用层保证）
  name: varchar(50),         // 渠道名称（如 production, staging）
  channelKey: varchar(64),   // 渠道密钥（唯一，用于客户端鉴权）
  description: text,

  // 代码签名
  privateKey: text,          // RSA 私钥（加密存储）
  publicKey: text,           // RSA 公钥
  signingEnabled: boolean,   // 是否启用签名

  isDeleted: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
}
// 约束：(projectId, name) 组合唯一
```

#### 3.5 Updates（更新表）

```typescript
{
  id: uuid,
  channelId: uuid,           // 所属渠道（应用层保证）
  runtimeVersion: varchar(50), // 运行时版本

  // Expo Updates 规范字段
  metadata: jsonb,           // 元数据
  extra: jsonb,              // 额外信息

  // 管理字段
  description: text,         // 更新说明
  isEnabled: boolean,        // 是否启用
  isRollback: boolean,       // 是否为回滚版本
  rolloutPercentage: integer, // 灰度百分比（0-100）

  // 统计字段
  downloadCount: bigint,     // 下载次数
  installCount: bigint,      // 安装次数

  createdAt: timestamp,
}
```

#### 3.6 Assets（资源表）

```typescript
{
  id: uuid,
  hash: varchar(64),         // SHA-256 哈希（唯一，内容寻址）
  key: varchar(500),         // 资源键
  contentType: varchar(100), // MIME 类型
  fileExtension: varchar(20),// 文件扩展名
  storagePath: text,         // 存储路径
  size: bigint,              // 文件大小
  createdAt: timestamp,
}
```

#### 3.7 Update Assets（更新-资源关联表）

```typescript
{
  id: uuid,
  updateId: uuid,            // 更新 ID（应用层保证）
  assetId: uuid,             // 资源 ID（应用层保证）
  isLaunchAsset: boolean,    // 是否为启动资源（JS Bundle）
  platform: varchar(10),     // 平台：ios | android | null（通用）
  createdAt: timestamp,
}
```

#### 3.8 Directives（指令表）

```typescript
{
  id: uuid,
  channelId: uuid,           // 渠道 ID（应用层保证）
  runtimeVersion: varchar(50), // 目标运行时版本
  type: varchar(50),         // 指令类型：rollBackToEmbedded | noUpdateAvailable
  parameters: jsonb,         // 指令参数
  extra: jsonb,              // 额外信息
  isActive: boolean,         // 是否激活
  expiresAt: timestamp,      // 过期时间
  createdAt: timestamp,
}
```

#### 3.9 Rollout Rules（灰度规则表）

```typescript
{
  id: uuid,
  updateId: uuid,            // 更新 ID（应用层保证）
  type: varchar(20),         // 规则类型：percentage | device_id | header_match
  value: jsonb,              // 规则值
  priority: integer,         // 优先级
  isEnabled: boolean,        // 是否启用
  createdAt: timestamp,
}
```

### 4. 开发顺序建议

按照依赖关系，建议按以下顺序开发：

1. **第一批（基础层）**

   - `organizations` - 无外部依赖
   - `assets` - 无外部依赖

2. **第二批（依赖组织）**

   - `organization-members` - 依赖 organizations + users
   - `projects` - 依赖 organizations

3. **第三批（依赖项目）**

   - `channels` - 依赖 projects

4. **第四批（依赖渠道）**

   - `updates` - 依赖 channels
   - `directives` - 依赖 channels

5. **第五批（依赖更新）**
   - `update-assets` - 依赖 updates + assets
   - `rollout-rules` - 依赖 updates

### 5. 关键设计决策

| 决策           | 选择                | 理由                              |
| -------------- | ------------------- | --------------------------------- |
| **外键约束**   | ❌ 不使用数据库外键 | 应用层保证，符合现有风格          |
| **软删除**     | ✅ 对核心实体启用   | organizations, projects, channels |
| **索引策略**   | ✅ 覆盖常用查询     | 父 ID、唯一约束、状态筛选         |
| **时区**       | 不带时区            | 与现有 users 表保持一致           |
| **关联表主键** | 独立 UUID           | 便于追踪和审计                    |

---

请确认此设计方案，我将按照您确认的顺序逐一实现各模块的 Schema、Service 和 Router。

User: 1. 我允许用你使用 Drizzle 数据库外键，代码会更简洁优雅，没有性能问题，因为 code push 业务不是性能敏感。 2. 开始实施，最好写一个 TODO.md 用于记录和更新

```

```
