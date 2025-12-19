# Assets 资源模块

热更新资源文件管理，采用内容寻址存储策略。

## 特性

- **内容寻址**：相同哈希的文件只存储一次
- **自动去重**：批量创建时跳过已存在资源
- **流式下载**：支持大文件 async generator 传输
- **Base64 下载**：小文件直接返回编码内容

## 目录结构

```
assets/
├── schema.ts     # Drizzle 表定义
├── service.ts    # 业务逻辑
├── router.ts     # tRPC 路由
└── index.ts      # 模块入口
```

## API 端点

### 查询操作（需认证）

| 端点                        | 说明             |
| --------------------------- | ---------------- |
| `hotUpdate.assets.list`     | 获取所有资源     |
| `hotUpdate.assets.byId`     | 根据 ID 获取     |
| `hotUpdate.assets.byHash`   | 根据哈希获取     |
| `hotUpdate.assets.byHashes` | 批量根据哈希获取 |

### 下载操作（公开）

#### `hotUpdate.assets.download`

下载资源（Base64），适用于小文件（<1MB）。

```typescript
const result = await trpc.hotUpdate.assets.download.query({
  hash: 'abc123...',
});
// { hash, contentType, size, content: 'base64...' }
```

#### `hotUpdate.assets.downloadStream`

流式下载资源，适用于大文件。

```typescript
const stream = await trpc.hotUpdate.assets.downloadStream.query({
  hash: 'abc123...',
});

for await (const chunk of stream) {
  if (chunk.type === 'metadata') {
    console.log(chunk.contentType, chunk.size);
  } else {
    // chunk.type === 'data'
    processChunk(Buffer.from(chunk.chunk, 'base64'));
  }
}
```

## 数据库 Schema

```typescript
const assets = pgTable('assets', {
  id: uuid().primaryKey().defaultRandom(),
  hash: varchar({ length: 64 }).notNull().unique(),
  contentType: varchar({ length: 128 }).notNull(),
  size: integer().notNull(),
  storagePath: varchar({ length: 512 }).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});
```

## 服务层方法

```typescript
// 查询
listAssets(db);
getAssetById(db, id);
getAssetByHash(db, hash);
getAssetsByHashes(db, hashes);

// 写入（自动去重）
createAsset(db, data);
createAssets(db, dataList);

// 下载
getAssetContent(db, hash); // 返回 Buffer
getAssetStream(db, hash); // 返回 ReadableStream

// 删除
deleteAsset(db, id);
```

## 注意事项

- 资源通常通过 Updates 模块批量创建
- 删除资源需谨慎，可能影响已发布更新
- 哈希采用 SHA-256 Base64 URL 安全编码
