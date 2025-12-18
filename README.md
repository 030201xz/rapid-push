# Rapid-S

> 零心智负担、优雅简洁、100% 类型安全的全栈 TypeScript 开发脚手架

## ✨ 特性

- **Monorepo** - Turborepo + Bun 工作空间，高效依赖管理
- **类型安全** - 端到端 TypeScript，zero-any 原则
- **模块化** - 可复用的包，按需组合

## 📦 项目结构

```
rapid-s/
├── apps/
│   └── server/                 # Hono + tRPC + Drizzle 后端服务
│
├── packages/@rapid-s/
│   ├── config/                 # 结构化环境变量配置
│   ├── logger/                 # 跨平台日志库
│   ├── requests/               # HTTP 请求工具
│   ├── cron/                   # 定时任务调度
│   └── mcp/                    # MCP 协议实现
│
└── turbo.json                  # Turborepo 配置
```

## 🚀 快速开始

### 前置要求

- [Bun](https://bun.sh/) v1.3+
- [Docker](https://www.docker.com/) (数据库)

### 安装依赖

```bash
bun install
```

### 启动开发

```bash
# 启动所有服务
bun run dev

# 仅启动后端
turbo dev --filter=server
```

### 构建

```bash
bun run build
```

## 📜 可用脚本

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动所有开发服务 |
| `bun run build` | 构建所有包和应用 |
| `bun run lint` | 运行 ESLint 检查 |
| `bun run format` | Prettier 格式化代码 |
| `bun run check-types` | TypeScript 类型检查 |

## 🏗️ 应用

### [apps/server](./apps/server)

Hono + tRPC + Drizzle 后端服务，详见 [Server README](./apps/server/README.md)

## 📚 内部包

### [@rapid-s/config](./packages/@rapid-s/config)

结构化环境变量配置，支持嵌套 Schema + 类型推断

### [@rapid-s/logger](./packages/@rapid-s/logger)

跨平台日志库，彩色终端输出 + JSON 格式

### [@rapid-s/requests](./packages/@rapid-s/requests)

类型安全的 HTTP 请求工具

### [@rapid-s/cron](./packages/@rapid-s/cron)

定时任务调度工具

### [@rapid-s/mcp](./packages/@rapid-s/mcp)

Model Context Protocol 实现

## 📄 License

MIT
