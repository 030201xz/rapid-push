# 00-basic-workflow: 基础工作流

测试热更新服务的核心基础功能。

## 场景描述

模拟最简单的热更新流程：

1. 管理员登录并获取渠道信息
2. 上传一个新的 Bundle
3. 客户端检查并获取更新

## 测试步骤

| 步骤 | 文件            | 说明                               |
| ---- | --------------- | ---------------------------------- |
| 00   | `00-setup.ts`   | 环境准备：登录、获取组织/项目/渠道 |
| 01   | `01-upload.ts`  | 上传热更新 Bundle                  |
| 02   | `02-check.ts`   | 客户端检查更新（Manifest 协议）    |
| 99   | `99-cleanup.ts` | 清理测试数据                       |

## 运行方式

```bash
cd apps/server

# 按步骤运行
bun run src/modules/hot-update/__test__/api/00-basic-workflow/00-setup.ts
bun run src/modules/hot-update/__test__/api/00-basic-workflow/01-upload.ts
bun run src/modules/hot-update/__test__/api/00-basic-workflow/02-check.ts

# 清理
bun run src/modules/hot-update/__test__/api/00-basic-workflow/99-cleanup.ts
```

## 一键运行

```bash
cd apps/server
bun run src/modules/hot-update/__test__/api/00-basic-workflow/00-setup.ts && \
bun run src/modules/hot-update/__test__/api/00-basic-workflow/01-upload.ts && \
bun run src/modules/hot-update/__test__/api/00-basic-workflow/02-check.ts
```

## 覆盖的 API

- `core.identify.auth.login` - 登录
- `hotUpdate.manage.organizations.bySlug` - 获取组织
- `hotUpdate.manage.projects.bySlug` - 获取项目
- `hotUpdate.manage.channels.listByProject` - 获取渠道列表
- `hotUpdate.manage.updates.upload` - 上传更新
- `hotUpdate.protocol.manifest.check` - 检查更新
