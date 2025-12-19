# Hot Update API 测试套件

渐进式 tRPC API 集成测试，覆盖热更新服务的核心功能。

## 前置条件

1. 服务端运行在 `http://localhost:3000`
2. 数据库已初始化（包含 Demo 组织、项目、渠道）
3. 管理员账户: `admin` / `Admin@123456`

## 测试文件说明

| 文件                       | 功能                            | 依赖  |
| -------------------------- | ------------------------------- | ----- |
| `00-login-and-get-data.ts` | 登录并获取基础数据              | 无    |
| `01-create-update.ts`      | 上传热更新 Bundle               | 00    |
| `02-check-manifest.ts`     | 客户端检查更新（Manifest 协议） | 01    |
| `03-gray-release.ts`       | 灰度发布规则测试                | 01    |
| `04-rollback.ts`           | 回滚功能测试                    | 01    |
| `05-cleanup.ts`            | 清理测试数据                    | 00-04 |

## 运行方式

### 方式 1: 按步骤逐个运行

```bash
cd apps/server

# 步骤 0: 登录
bun run src/modules/hot-update/__test__/api/00-login-and-get-data.ts

# 步骤 1: 上传更新
bun run src/modules/hot-update/__test__/api/01-create-update.ts

# 步骤 2: 检查 Manifest
bun run src/modules/hot-update/__test__/api/02-check-manifest.ts

# 步骤 3: 灰度发布
bun run src/modules/hot-update/__test__/api/03-gray-release.ts

# 步骤 4: 回滚测试
bun run src/modules/hot-update/__test__/api/04-rollback.ts

# 步骤 5: 清理（可选）
bun run src/modules/hot-update/__test__/api/05-cleanup.ts
```

### 方式 2: 一键运行全部测试

```bash
cd apps/server

bun run src/modules/hot-update/__test__/api/00-login-and-get-data.ts && \
bun run src/modules/hot-update/__test__/api/01-create-update.ts && \
bun run src/modules/hot-update/__test__/api/02-check-manifest.ts && \
bun run src/modules/hot-update/__test__/api/03-gray-release.ts && \
bun run src/modules/hot-update/__test__/api/04-rollback.ts
```

## 测试覆盖功能

### 认证与授权

- [x] 系统管理员登录
- [x] JWT Token 鉴权

### 组织/项目/渠道管理

- [x] 获取组织列表
- [x] 获取项目详情
- [x] 获取渠道列表

### 热更新核心

- [x] 上传 Bundle（ZIP 格式）
- [x] 客户端检查更新
- [x] Manifest 协议响应
- [x] 多平台支持（iOS/Android）
- [x] 版本匹配逻辑

### 灰度发布

- [x] 设置全局灰度百分比
- [x] 设备 ID 白名单规则
- [x] 百分比规则
- [x] 规则优先级

### 回滚机制

- [x] 创建回滚更新
- [x] 验证回滚生效

## 测试数据

测试上下文保存在: `/tmp/rapid-s-test-context.json`

```typescript
interface TestContext {
  authToken: string;
  organization: { id: string; name: string };
  project: { id: string; name: string };
  channel: { id: string; name: string; channelKey: string };
  updates: {
    v1Id?: string;
    v2Id?: string;
    rollbackId?: string;
  };
}
```

## 常见问题

### Q: 测试失败 "未找到测试上下文"

A: 先运行 `00-login-and-get-data.ts` 初始化上下文

### Q: 登录失败

A: 确认服务端运行，并检查管理员账户是否正确

### Q: 上传失败

A: 确认服务端文件上传配置正确，检查磁盘空间

### Q: 回滚失败 "更新缺少启动资源"

A: 确认 `createRollback` 函数已修复资源复制逻辑
