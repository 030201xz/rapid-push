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
├── index.ts                    # 入口点
├── app.ts                      # Hono 应用 + tRPC 挂载
│
├── common/                     # 公共基础设施
│   ├── db.ts                   # Drizzle + postgres-js
│   ├── env.ts                  # @rapid-s/config 结构化配置
│   ├── logger.ts               # @rapid-s/logger 日志实例
│   ├── trpc.ts                 # tRPC 初始化 + Procedure 定义
│   └── middleware/
│       └── index.ts            # Hono 全局中间件
│
└── modules/                    # 业务模块（核心）
    ├── index.ts                # Router 聚合 → AppRouter
    └── users/                  # 用户模块示例
        ├── schema.ts           # 表定义 + Zod schema
        ├── service.ts          # 业务逻辑（纯函数）
        ├── router.ts           # tRPC 路由
        └── middleware.ts       # 模块专属中间件
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

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动开发服务器（热重载） |
| `bun run build` | 构建生产版本 |
| `bun run start` | 运行生产版本 |
| `bun run db:generate` | 生成数据库迁移文件 |
| `bun run db:migrate` | 执行数据库迁移 |
| `bun run db:push` | 推送 Schema 到数据库（开发用） |
| `bun run db:studio` | 打开 Drizzle Studio |

## 🔧 Procedure 类型

| Procedure | 用途 | 认证要求 |
|-----------|------|----------|
| `publicProcedure` | 公开接口 | 无 |
| `protectedProcedure` | 需登录的接口 | Bearer Token |
| `adminProcedure` | 管理员接口 | Bearer Token + Admin 权限 |

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

## 📄 License

MIT
