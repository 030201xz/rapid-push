# Rapid-S Server

> 零心智负担、优雅简洁、100% 类型安全的 Hono + tRPC + Drizzle 后端脚手架

## ✨ 特性

- **Hono** - 超快的 Web 框架，基于 Web Standards
- **tRPC** - 端到端类型安全的 API，无需代码生成
- **Drizzle ORM** - 轻量级、类型安全的 TypeScript ORM
- **@rapid-s/config** - 结构化环境变量配置，支持嵌套 Schema
- **@rapid-s/logger** - 跨平台日志库，彩色输出 + JSON 格式
- **postgres-js** - 高性能 PostgreSQL 驱动
- **Bun** - 快速的 JavaScript 运行时

## 🏗️ 项目结构

```
src/
├── index.ts                        # 入口点
├── app.ts                          # Hono 应用 + tRPC 挂载
├── types.ts                        # 全局类型定义入口
│
├── common/                         # 公共基础设施
│   ├── logger.ts                   # @rapid-s/logger 日志实例
│   │
│   ├── auth/                       # JWT 认证工具
│   │   ├── index.ts
│   │   └── jwt.ts                  # JWT 签发/验证
│   │
│   ├── env/                        # 环境变量配置
│   │   ├── index.ts
│   │   ├── schema.ts               # @rapid-s/config 结构化配置
│   │   └── utils.ts                # getDatabaseUrl 等工具
│   │
│   ├── database/                   # 数据库（支持多实例）
│   │   ├── postgresql/
│   │   │   └── rapid-s/            # PostgreSQL 主数据库实例
│   │   │       ├── index.ts
│   │   │       ├── client.ts       # 连接工厂
│   │   │       ├── schema.ts       # 聚合所有模块 Schema
│   │   │       ├── types.ts        # 类型定义
│   │   │       └── transaction.ts
│   │   └── redis/
│   │       └── rapid-s/            # Redis 实例
│   │           ├── index.ts
│   │           ├── client.ts
│   │           └── types.ts
│   │
│   ├── middlewares/                # Hono 全局中间件
│   │   ├── index.ts
│   │   ├── auth.ts                 # Bearer Token 认证
│   │   ├── cors.ts
│   │   ├── logger.ts
│   │   ├── error.ts
│   │   └── request-id.ts
│   │
│   └── trpc/                       # tRPC 配置
│       ├── index.ts
│       ├── init.ts                 # tRPC 实例初始化
│       ├── context.ts              # Context 创建
│       └── procedures/
│           ├── index.ts
│           ├── base.ts
│           ├── public.ts
│           ├── protected.ts
│           └── admin.ts
│
├── modules/                        # 业务模块（DDD 分层）
│   ├── index.ts                    # Router 聚合 → AppRouter
│   └── core/                       # 核心子域
│       ├── index.ts
│       │
│       ├── identify/               # 身份识别上下文
│       │   ├── index.ts
│       │   │
│       │   ├── users/              # 用户模块
│       │   │   ├── schema.ts       # 表定义 + Zod schema
│       │   │   ├── service.ts      # 业务逻辑（纯函数）
│       │   │   ├── router.ts       # tRPC 路由
│       │   │   ├── types.ts
│       │   │   ├── __test__/       # 测试用例
│       │   │   └── middlewares/    # 模块专属中间件
│       │   │       ├── index.ts
│       │   │       ├── with-user-exists.ts
│       │   │       └── with-self-only.ts
│       │   │
│       │   └── auth/               # 认证模块（登录/登出/刷新）
│       │       ├── index.ts
│       │       ├── router.ts       # tRPC 路由
│       │       ├── constants.ts
│       │       ├── types.ts
│       │       ├── __test__/       # 测试用例
│       │       ├── schemas/        # Drizzle 表定义
│       │       │   ├── index.ts
│       │       │   ├── devices.schema.ts
│       │       │   ├── sessions.schema.ts
│       │       │   └── refresh-tokens.schema.ts
│       │       └── services/       # 服务层
│       │           ├── index.ts
│       │           ├── login.service.ts
│       │           ├── logout.service.ts
│       │           ├── refresh.service.ts
│       │           ├── session.service.ts
│       │           ├── device.service.ts
│       │           ├── refresh-token.service.ts
│       │           └── redis.service.ts
│       │
│       └── access-control/         # 访问控制上下文
│           ├── index.ts
│           │
│           ├── roles/              # 角色管理
│           │   ├── schema.ts
│           │   ├── service.ts
│           │   ├── router.ts
│           │   └── types.ts
│           │
│           ├── permissions/        # 权限管理
│           │   ├── schema.ts
│           │   ├── service.ts
│           │   ├── router.ts
│           │   └── types.ts
│           │
│           ├── role-permission-mappings/  # 角色-权限映射
│           │   ├── schema.ts
│           │   ├── service.ts
│           │   ├── router.ts
│           │   └── types.ts
│           │
│           └── user-role-mappings/        # 用户-角色映射
│               ├── schema.ts
│               ├── service.ts
│               ├── router.ts
│               └── types.ts
│
└── types/                          # 全局类型定义
    ├── index.ts
    ├── router.ts                   # AppRouter 类型
    └── context/                    # Context 类型层级
        ├── index.ts
        ├── base.ts
        ├── auth.ts
        └── hono.ts
```

## 🚀 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

### 3. 启动数据库

```bash
docker compose up -d
```

### 4. 推送 Schema 到数据库

```bash
bun run db:push
```

### 5. 启动开发服务器

```bash
bun run dev
```

服务运行在 http://localhost:3000

## 📜 可用脚本

| 命令                  | 说明                           |
| --------------------- | ------------------------------ |
| `bun run dev`         | 启动开发服务器（热重载）       |
| `bun run build`       | 构建生产版本                   |
| `bun run start`       | 运行生产版本                   |
| `bun run db:generate` | 生成数据库迁移文件             |
| `bun run db:migrate`  | 执行数据库迁移                 |
| `bun run db:push`     | 推送 Schema 到数据库（开发用） |
| `bun run db:studio`   | 打开 Drizzle Studio            |

## 🔧 Procedure 类型

| Procedure            | 用途         | 认证要求                  |
| -------------------- | ------------ | ------------------------- |
| `publicProcedure`    | 公开接口     | 无                        |
| `protectedProcedure` | 需登录的接口 | Bearer Token              |
| `adminProcedure`     | 管理员接口   | Bearer Token + Admin 权限 |

## 📦 新增模块

```bash
# 1. 创建模块目录
mkdir src/modules/posts

# 2. 创建三个核心文件
touch src/modules/posts/schema.ts    # 表定义 + Zod
touch src/modules/posts/service.ts   # 业务逻辑
touch src/modules/posts/router.ts    # tRPC 路由

# 3. 在 modules/index.ts 中注册
```

## 🔗 API 端点

- `GET /` - 服务信息
- `GET /health` - 健康检查
- `ALL /trpc/*` - tRPC 端点
