# Updates 更新模块

热更新版本发布和管理的核心模块。

## 功能

- **版本管理**：创建、查询、删除更新
- **Bundle 上传**：ZIP 文件解压、资源提取、存储
- **设置调整**：启用/禁用、灰度比例
- **回滚操作**：快速回滚到指定版本
- **统计追踪**：下载/安装计数

## 目录结构

```
updates/
├── schema.ts     # Drizzle 表定义
├── service.ts    # 业务逻辑
├── router.ts     # tRPC 路由
├── utils/
│   ├── bundle.ts    # ZIP 解压、资源提取
│   ├── platform.ts  # 平台检测、launchAsset 识别
│   └── index.ts     # 工具导出
└── index.ts      # 模块入口
```

## API 端点

所有端点需要认证。

### 查询操作

| 端点                   | 说明                     |
| ---------------------- | ------------------------ |
| `listByChannel`        | 获取渠道下所有更新       |
| `listByRuntimeVersion` | 获取指定运行时版本的更新 |
| `byId`                 | 根据 ID 获取更新详情     |
| `latestEnabled`        | 获取最新启用更新         |

### 写入操作

| 端点             | 说明                    |
| ---------------- | ----------------------- |
| `create`         | 创建更新（元数据）      |
| `upload`         | 上传 Bundle（FormData） |
| `updateSettings` | 更新设置                |
| `delete`         | 删除更新                |
| `rollback`       | 回滚到指定版本          |

### 统计操作

| 端点                | 说明         |
| ------------------- | ------------ |
| `incrementDownload` | 增加下载次数 |
| `incrementInstall`  | 增加安装次数 |

## Bundle 上传

### FormData 字段

```typescript
{
  channelId: string;          // 必填：渠道 ID
  runtimeVersion: string;     // 必填：运行时版本
  bundle: File;               // 必填：ZIP 文件
  description?: string;       // 更新描述
  metadata?: string;          // JSON 字符串
  extra?: string;             // JSON 字符串
  rolloutPercentage?: string; // 灰度比例 0-100
}
```

### 上传流程

1. 验证必填字段和文件类型
2. 解压 ZIP 文件
3. 识别平台（iOS/Android）和 launchAsset
4. 计算每个资源的 SHA-256 哈希
5. 存储资源文件（去重）
6. 创建更新记录和资源关联

### 客户端示例

```typescript
const formData = new FormData();
formData.append('channelId', channelId);
formData.append('runtimeVersion', '1.0.0');
formData.append('bundle', zipFile);
formData.append('description', '修复登录问题');
formData.append('rolloutPercentage', '10');

const update = await trpc.hotUpdate.updates.upload.mutate(formData);
```

## 工具函数

### `extractBundle(zipBuffer)`

解压 ZIP 并提取资源：

```typescript
const { platform, assets } = await extractBundle(buffer);
// platform: 'ios' | 'android'
// assets: Array<{ path, content, contentType, isLaunchAsset }>
```

### `detectPlatform(files)`

根据文件结构检测平台。

### `identifyLaunchAsset(files, platform)`

识别入口 JS Bundle 文件。

## 数据库 Schema

```typescript
const updates = pgTable('updates', {
  id: uuid().primaryKey().defaultRandom(),
  channelId: uuid()
    .notNull()
    .references(() => channels.id),
  runtimeVersion: varchar({ length: 64 }).notNull(),
  description: text(),
  metadata: jsonb().default({}),
  extra: jsonb().default({}),
  isEnabled: boolean().default(true),
  isRollback: boolean().default(false),
  rolloutPercentage: integer().default(100),
  downloadCount: integer().default(0),
  installCount: integer().default(0),
  createdAt: timestamp().defaultNow().notNull(),
});
```
