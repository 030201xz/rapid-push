# 06-directive: 指令测试

## 场景描述

指令（Directive）是 Expo Updates v1 协议中的重要功能，用于向客户端发送特殊操作命令。
最常见的用途是在热更新出现严重 Bug 时，让客户端回滚到应用内嵌版本。

## 支持的指令类型

| 类型                 | 说明                           |
| -------------------- | ------------------------------ |
| `rollBackToEmbedded` | 指示客户端回滚到应用内嵌的版本 |
| `noUpdateAvailable`  | 通知客户端无可用更新（预留）   |

## 测试步骤

### 运行完整测试

```bash
bun run src/modules/hot-update/__test__/apis/06-directive-指令测试/run-all.ts
```

### 分步运行

| 步骤 | 文件                         | 说明                         |
| ---- | ---------------------------- | ---------------------------- |
| 00   | `00-setup.ts`                | 初始化测试环境               |
| 01   | `01-create-directive.ts`     | 创建 rollBackToEmbedded 指令 |
| 02   | `02-verify-directive.ts`     | 验证客户端收到指令           |
| 03   | `03-deactivate-directive.ts` | 停用指令                     |
| 04   | `04-expiry-directive.ts`     | 测试指令过期功能             |
| 99   | `99-cleanup.ts`              | 清理测试数据                 |

## 测试内容

### 1. 指令创建 (01-create-directive.ts)

- 使用 `manage.directives.createRollBackToEmbedded` 创建回滚指令
- 验证指令详情查询
- 验证渠道指令列表
- 验证激活指令查询

### 2. 客户端验证 (02-verify-directive.ts)

- 模拟客户端检查更新
- 验证收到 `rollback` 类型响应
- 验证指令内容正确（`rollBackToEmbedded`）
- 验证指令优先级（指令优先于更新返回）
- 验证 `runtimeVersion` 精确匹配

### 3. 停用指令 (03-deactivate-directive.ts)

- 使用 `manage.directives.deactivate` 停用指令
- 验证激活指令查询返回空
- 验证客户端不再收到指令
- 验证客户端恢复正常更新检查

### 4. 过期功能 (04-expiry-directive.ts)

- 创建带 `expiresAt` 的指令
- 验证未过期时客户端收到指令
- 等待指令过期
- 验证过期后客户端不再收到指令

## 覆盖的 API

### 管理 API

- `hotUpdate.manage.directives.createRollBackToEmbedded` - 创建回滚指令
- `hotUpdate.manage.directives.byId` - 获取指令详情
- `hotUpdate.manage.directives.listByChannel` - 获取渠道指令列表
- `hotUpdate.manage.directives.activeDirective` - 获取激活指令
- `hotUpdate.manage.directives.deactivate` - 停用指令
- `hotUpdate.manage.directives.delete` - 删除指令

### 协议 API

- `hotUpdate.protocol.manifest.check` - 检查更新（返回指令）

## 指令优先级

当渠道中同时存在激活的指令和可用的更新时：

```
1. 检查是否有激活的指令（未过期 + isActive=true）
2. 如果有 → 返回 rollback 响应
3. 如果没有 → 检查是否有可用更新
4. 有更新 → 返回 updateAvailable
5. 无更新 → 返回 noUpdate
```

## 响应格式

### rollback 响应

```json
{
  "type": "rollback",
  "directive": {
    "type": "rollBackToEmbedded",
    "parameters": {},
    "extra": {}
  }
}
```

## 使用场景

### 紧急回滚

当热更新版本出现严重 Bug 时：

1. 管理员创建 `rollBackToEmbedded` 指令
2. 所有客户端检查更新时收到回滚指令
3. 客户端清除已下载的热更新缓存
4. 应用使用原生包内嵌的版本运行

### 临时回滚

设置 `expiresAt` 实现临时回滚：

1. 创建带过期时间的指令
2. 在过期时间内，客户端收到回滚指令
3. 过期后，指令自动失效
4. 客户端恢复正常更新检查

## 注意事项

1. 指令按 `runtimeVersion` 精确匹配
2. 同一渠道同一 `runtimeVersion` 可有多个指令
3. 只有 `isActive=true` 且未过期的指令才会返回给客户端
4. 删除渠道会级联删除所有关联的指令
