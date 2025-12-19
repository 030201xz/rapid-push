# 02-rollback: 回滚场景

测试热更新服务的版本回滚功能。

## 场景描述

模拟线上紧急回滚流程：

1. 发布 v1 稳定版本
2. 发布 v2 版本（模拟有 Bug）
3. 发现问题后紧急回滚到 v1
4. 验证客户端获取到回滚版本

## 测试步骤

| 步骤 | 文件                     | 说明                  |
| ---- | ------------------------ | --------------------- |
| 00   | `00-setup.ts`            | 环境准备              |
| 01   | `01-upload-v1.ts`        | 上传 v1 稳定版本      |
| 02   | `02-upload-v2.ts`        | 上传 v2（模拟有 Bug） |
| 03   | `03-execute-rollback.ts` | 执行回滚到 v1         |
| 99   | `99-cleanup.ts`          | 清理测试数据          |

## 运行方式

```bash
cd apps/server

# 按步骤运行
bun run src/modules/hot-update/__test__/api/02-rollback/00-setup.ts
bun run src/modules/hot-update/__test__/api/02-rollback/01-upload-v1.ts
bun run src/modules/hot-update/__test__/api/02-rollback/02-upload-v2.ts
bun run src/modules/hot-update/__test__/api/02-rollback/03-execute-rollback.ts

# 清理
bun run src/modules/hot-update/__test__/api/02-rollback/99-cleanup.ts
```

## 一键运行

```bash
cd apps/server
bun run src/modules/hot-update/__test__/api/02-rollback/00-setup.ts && \
bun run src/modules/hot-update/__test__/api/02-rollback/01-upload-v1.ts && \
bun run src/modules/hot-update/__test__/api/02-rollback/02-upload-v2.ts && \
bun run src/modules/hot-update/__test__/api/02-rollback/03-execute-rollback.ts
```

## 覆盖的 API

- `hotUpdate.manage.updates.upload` - 上传更新
- `hotUpdate.manage.updates.rollback` - 执行回滚
- `hotUpdate.manage.updates.byId` - 获取更新详情
- `hotUpdate.protocol.manifest.check` - 验证回滚生效

## 回滚机制说明

回滚实际上是创建一个新的更新记录，其内容复制自指定的源更新：

- `isRollback: true` 标识这是一个回滚版本
- 资源（assets）从源更新复制
- 作为最新更新提供给客户端
