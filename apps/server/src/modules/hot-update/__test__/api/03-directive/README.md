# 03-directive: 指令场景

测试热更新服务的指令（Directive）功能。

## 场景描述

指令用于向客户端发送特殊操作命令，例如让客户端回滚到内嵌版本。
这在紧急情况下（如热更新出现严重 Bug）非常有用。

## 支持的指令类型

| 类型                 | 说明                           |
| -------------------- | ------------------------------ |
| `rollBackToEmbedded` | 指示客户端回滚到应用内嵌的版本 |
| `noUpdateAvailable`  | 通知客户端无可用更新           |

## 测试步骤

| 步骤 | 文件                              | 说明                         |
| ---- | --------------------------------- | ---------------------------- |
| 00   | `00-setup.ts`                     | 环境准备                     |
| 01   | `01-create-rollback-directive.ts` | 创建 rollBackToEmbedded 指令 |
| 02   | `02-deactivate-directive.ts`      | 停用并删除指令               |
| 99   | `99-cleanup.ts`                   | 清理测试数据                 |

## 运行方式

```bash
cd apps/server

# 按步骤运行
bun run src/modules/hot-update/__test__/api/03-directive/00-setup.ts
bun run src/modules/hot-update/__test__/api/03-directive/01-create-rollback-directive.ts
bun run src/modules/hot-update/__test__/api/03-directive/02-deactivate-directive.ts

# 清理
bun run src/modules/hot-update/__test__/api/03-directive/99-cleanup.ts
```

## 一键运行

```bash
cd apps/server
bun run src/modules/hot-update/__test__/api/03-directive/00-setup.ts && \
bun run src/modules/hot-update/__test__/api/03-directive/01-create-rollback-directive.ts && \
bun run src/modules/hot-update/__test__/api/03-directive/02-deactivate-directive.ts
```

## 覆盖的 API

- `hotUpdate.manage.directives.createRollBackToEmbedded` - 创建回滚指令
- `hotUpdate.manage.directives.listByChannel` - 获取渠道指令列表
- `hotUpdate.manage.directives.byId` - 获取指令详情
- `hotUpdate.manage.directives.deactivate` - 停用指令
- `hotUpdate.manage.directives.delete` - 删除指令
- `hotUpdate.protocol.manifest.check` - 验证客户端收到指令

## 指令生命周期

```
创建 → 激活中 → 停用 → 删除
```

- **创建**: 指令默认为激活状态
- **停用**: 指令不再生效，但记录保留
- **删除**: 彻底删除指令记录
