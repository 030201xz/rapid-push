# Hot Update 热更新模块

Expo Code Push 风格的热更新服务，采用全 tRPC 架构，支持灰度发布、回滚和统计分析。

## 架构概览

```
hot-update/
├── organizations/    # 组织管理
├── projects/         # 项目管理
├── channels/         # 渠道管理 + 代码签名
├── assets/           # 资源文件管理（内容寻址）
├── updates/          # 更新版本发布
├── update-assets/    # 更新-资源关联
├── directives/       # 指令管理（回滚等）
├── rollout-rules/    # 灰度发布规则
├── manifest/         # 检查更新协议
├── analytics/        # 事件上报
├── statistics/       # 统计查询
└── index.ts          # 域聚合入口
```

## 核心 API 端点

### 客户端协议（公开）

| 路由                              | 类型     | 说明                                    |
| --------------------------------- | -------- | --------------------------------------- |
| `hotUpdate.manifest.check`        | query    | 检查更新，返回 Manifest/无更新/回滚指令 |
| `hotUpdate.assets.download`       | query    | 下载资源（Base64）                      |
| `hotUpdate.assets.downloadStream` | query    | 流式下载资源                            |
| `hotUpdate.analytics.report`      | mutation | 批量事件上报                            |

### 管理接口（需认证）

| 路由                               | 类型     | 说明                    |
| ---------------------------------- | -------- | ----------------------- |
| `hotUpdate.updates.upload`         | mutation | 上传 Bundle（FormData） |
| `hotUpdate.updates.updateSettings` | mutation | 更新设置（启用/灰度）   |
| `hotUpdate.updates.rollback`       | mutation | 回滚到指定版本          |
| `hotUpdate.statistics.byChannel`   | query    | 渠道统计                |
| `hotUpdate.statistics.byUpdate`    | query    | 更新统计                |

## 更新发布流程

```mermaid
sequenceDiagram
    participant Dev as 开发者
    participant Server as 热更新服务
    participant Storage as 存储服务
    participant DB as 数据库

    Dev->>Server: upload(FormData: ZIP)
    Server->>Server: 解压 ZIP
    Server->>Server: 识别平台 & launchAsset
    Server->>Server: 计算资源哈希
    Server->>Storage: 存储资源文件（去重）
    Server->>DB: 创建更新记录
    Server->>DB: 关联资源
    Server-->>Dev: 返回更新信息
```

## 客户端更新流程

```mermaid
sequenceDiagram
    participant App as 客户端
    participant Server as 热更新服务

    App->>Server: manifest.check(channelKey, runtimeVersion, ...)
    Server->>Server: 验证渠道
    Server->>Server: 检查指令
    Server->>Server: 获取最新更新
    Server->>Server: 匹配灰度规则
    Server-->>App: Manifest / noUpdate / rollback

    alt 有更新
        loop 下载资源
            App->>Server: assets.download(hash)
            Server-->>App: 资源内容
        end
        App->>App: 应用更新
        App->>Server: analytics.report(events)
    end
```

## 灰度发布策略

支持多种灰度规则，采用 OR 逻辑：

| 规则类型     | 说明                       |
| ------------ | -------------------------- |
| `percentage` | 按百分比灰度（确定性哈希） |
| `deviceId`   | 指定设备 ID 列表           |
| `header`     | 匹配自定义请求头           |

```typescript
// 示例：10% 灰度 + 指定测试设备
const rules = [
  { type: 'percentage', value: 10 },
  { type: 'deviceId', value: 'test-device-001' },
];
```

## 事件类型

```typescript
const ANALYTICS_EVENT_TYPE = {
  UPDATE_CHECK: 'update_check',
  DOWNLOAD_START: 'download_start',
  DOWNLOAD_COMPLETE: 'download_complete',
  DOWNLOAD_FAILED: 'download_failed',
  APPLY_START: 'apply_start',
  APPLY_SUCCESS: 'apply_success',
  APPLY_FAILED: 'apply_failed',
  ROLLBACK: 'rollback',
};
```

## 环境配置

```bash
# 存储配置
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./storage

# 未来支持
# STORAGE_TYPE=s3
# S3_BUCKET=my-bucket
# S3_ACCESS_KEY_ID=xxx
# S3_SECRET_ACCESS_KEY=xxx
```

## 模块依赖

```
organizations
    └── projects
            └── channels
                    ├── updates ──── assets
                    │     └── update-assets
                    ├── directives
                    └── rollout-rules

manifest ← channels, updates, directives, rollout-rules
analytics ← channels, updates
statistics ← channels, updates
```

## 类型导出

```typescript
// 从 hot-update 模块导出
export {
  // 路由
  hotUpdateRouter,
  manifestRouter,
  analyticsRouter,
  statisticsRouter,
  // ...

  // 类型
  type CheckUpdateRequest,
  type CheckUpdateResponse,
  type Manifest,
  type ManifestAsset,
  type Platform,
  type AnalyticsEvent,
  type AnalyticsEventType,
  type UpdateStats,
  type ChannelStats,
  // ...

  // 常量
  RESPONSE_TYPE,
  ANALYTICS_EVENT_TYPE,
  // ...
};
```

## 子模块文档

- [Storage 存储模块](../../common/storage/README.md)
- [Manifest 协议模块](./manifest/README.md)
- [Assets 资源模块](./assets/README.md)
- [Updates 更新模块](./updates/README.md)
- [Analytics 分析模块](./analytics/README.md)
- [Statistics 统计模块](./statistics/README.md)
