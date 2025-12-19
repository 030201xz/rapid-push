# Manifest 模块

客户端检查更新的核心协议模块，处理更新检查、灰度规则匹配和 Manifest 构建。

## 功能

- **渠道验证**：验证客户端渠道密钥
- **指令检查**：处理回滚等特殊指令
- **灰度匹配**：百分比、设备 ID、自定义 Header 匹配
- **Manifest 构建**：构建符合协议的更新清单
- **代码签名**：RSA-SHA256 签名（可选）

## 目录结构

```
manifest/
├── types.ts      # 类型定义与 Zod Schema
├── schema.ts     # 导出 Schema（供 router 使用）
├── service.ts    # 核心业务逻辑
├── router.ts     # tRPC 路由
└── index.ts      # 模块入口
```

## API 端点

### `hotUpdate.manifest.check`

检查更新接口（公开）。

**请求参数**：

```typescript
{
  channelKey: string;        // 渠道密钥
  runtimeVersion: string;    // 运行时版本
  platform: 'ios' | 'android';
  currentUpdateId?: string;  // 当前更新 ID
  embeddedUpdateId?: string; // 嵌入更新 ID
  deviceId?: string;         // 设备 ID（灰度用）
  customHeaders?: Record<string, string>; // 自定义头（灰度用）
}
```

**响应类型**：

```typescript
// 有更新
{
  type: 'updateAvailable';
  manifest: {
    id: string;
    createdAt: string;
    runtimeVersion: string;
    launchAsset: ManifestAsset;
    assets: ManifestAsset[];
    metadata: Record<string, string>;
    extra: Record<string, unknown>;
  };
  signature?: string;
}

// 无更新
{ type: 'noUpdate' }

// 回滚指令
{
  type: 'rollback';
  directive: {
    type: 'rollBackToEmbedded';
    parameters?: Record<string, unknown>;
    extra?: Record<string, unknown>;
  };
}
```

## 客户端集成示例

```typescript
import { trpcClient } from './client';

async function checkForUpdates() {
  const result = await trpcClient.hotUpdate.manifest.check.query({
    channelKey: 'your-channel-key',
    runtimeVersion: '1.0.0',
    platform: 'ios',
    currentUpdateId: currentUpdate?.id,
    deviceId: getDeviceId(),
  });

  switch (result.type) {
    case 'updateAvailable':
      return downloadAndApply(result.manifest);
    case 'rollback':
      return rollbackToEmbedded();
    case 'noUpdate':
    default:
      return null;
  }
}
```

## 灰度规则匹配

支持多种灰度策略：

- **percentage**：按百分比灰度（确定性哈希，同设备同结果）
- **deviceId**：指定设备 ID 列表
- **header**：匹配自定义请求头

规则采用 OR 逻辑，匹配任一规则即可接收更新。
