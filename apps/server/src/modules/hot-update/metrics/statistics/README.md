# Statistics 统计模块

提供热更新统计数据查询接口。

## 功能

- **更新统计**：单个更新的下载/安装数据
- **渠道统计**：渠道维度的聚合统计
- **历史统计**：渠道更新历史列表

## 目录结构

```
statistics/
├── types.ts      # 类型导出
├── service.ts    # 业务逻辑
├── router.ts     # tRPC 路由
└── index.ts      # 模块入口
```

## API 端点

所有端点需要认证。

### `hotUpdate.statistics.byUpdate`

获取单个更新的统计。

```typescript
const stats = await trpc.hotUpdate.statistics.byUpdate.query({
  updateId: 'update-uuid',
});
```

**响应**：

```typescript
{
  id: string;
  runtimeVersion: string;
  description: string | null;
  downloadCount: number;
  installCount: number;
  rolloutPercentage: number;
  isEnabled: boolean;
  createdAt: Date;
}
```

### `hotUpdate.statistics.byChannel`

获取渠道统计摘要。

```typescript
const stats = await trpc.hotUpdate.statistics.byChannel.query({
  channelId: 'channel-uuid',
});
```

**响应**：

```typescript
{
  channelId: string;
  channelName: string;
  totalUpdates: number;
  totalDownloads: number;
  totalInstalls: number;
  latestUpdate: UpdateStats | null;
}
```

### `hotUpdate.statistics.channelHistory`

获取渠道更新历史统计。

```typescript
const history = await trpc.hotUpdate.statistics.channelHistory.query({
  channelId: 'channel-uuid',
  limit: 10, // 可选，默认 10，最大 50
});
```

**响应**：

```typescript
Array<{
  id: string;
  runtimeVersion: string;
  description: string | null;
  downloadCount: number;
  installCount: number;
  rolloutPercentage: number;
  isEnabled: boolean;
  createdAt: Date;
}>;
```

## 类型定义

```typescript
interface UpdateStats {
  id: string;
  runtimeVersion: string;
  description: string | null;
  downloadCount: number;
  installCount: number;
  rolloutPercentage: number;
  isEnabled: boolean;
  createdAt: Date;
}

interface ChannelStats {
  channelId: string;
  channelName: string;
  totalUpdates: number;
  totalDownloads: number;
  totalInstalls: number;
  latestUpdate: UpdateStats | null;
}
```

## 使用场景

- **管理后台仪表盘**：展示总体统计
- **更新详情页**：展示单次更新效果
- **历史对比**：比较不同版本的安装率
