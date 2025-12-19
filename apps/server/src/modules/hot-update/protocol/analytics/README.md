# Analytics 分析模块

客户端事件上报与统计更新模块。

## 功能

- **批量上报**：支持一次最多 100 条事件
- **渠道验证**：验证上报渠道有效性
- **统计聚合**：自动更新下载/安装计数

## 目录结构

```
analytics/
├── schema.ts     # 事件类型与 Zod Schema
├── types.ts      # 类型导出
├── service.ts    # 业务逻辑
├── router.ts     # tRPC 路由
└── index.ts      # 模块入口
```

## API 端点

### `hotUpdate.analytics.report`

批量上报事件（公开接口）。

**请求参数**：

```typescript
{
  channelKey: string;
  events: Array<{
    type: AnalyticsEventType;
    updateId?: string;
    runtimeVersion?: string;
    deviceId: string;
    timestamp: Date;
    extra?: Record<string, unknown>;
  }>;
}
```

**响应**：

```typescript
{
  processed: number;  // 成功处理数
  errors: string[];   // 错误信息列表
}
```

## 事件类型

```typescript
const ANALYTICS_EVENT_TYPE = {
  UPDATE_CHECK: 'update_check', // 检查更新
  DOWNLOAD_START: 'download_start', // 开始下载
  DOWNLOAD_COMPLETE: 'download_complete', // 下载完成
  DOWNLOAD_FAILED: 'download_failed', // 下载失败
  APPLY_START: 'apply_start', // 开始应用
  APPLY_SUCCESS: 'apply_success', // 应用成功
  APPLY_FAILED: 'apply_failed', // 应用失败
  ROLLBACK: 'rollback', // 回滚
} as const;
```

## 客户端集成示例

```typescript
import { trpcClient } from './client';

// 批量上报事件
async function reportAnalytics(events: AnalyticsEvent[]) {
  return trpcClient.hotUpdate.analytics.report.mutate({
    channelKey: 'your-channel-key',
    events,
  });
}

// 使用示例
await reportAnalytics([
  {
    type: 'download_complete',
    updateId: 'update-uuid',
    deviceId: getDeviceId(),
    timestamp: new Date(),
  },
  {
    type: 'apply_success',
    updateId: 'update-uuid',
    deviceId: getDeviceId(),
    timestamp: new Date(),
  },
]);
```

## 统计更新逻辑

服务端会自动聚合事件并更新统计：

- `download_complete` → 增加更新的 `downloadCount`
- `apply_success` → 增加更新的 `installCount`

## 设计考虑

- **批量上报**：减少网络请求，降低客户端功耗
- **异步处理**：事件处理失败不影响客户端流程
- **幂等设计**：建议客户端去重避免重复上报
