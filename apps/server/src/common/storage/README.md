# Storage 存储模块

统一的存储访问接口，支持多种存储后端，采用内容寻址存储策略（Content-Addressable Storage）。

## 特性

- **多后端支持**：本地文件系统、S3、R2、WebDAV
- **内容寻址**：基于文件哈希存储，自动去重
- **单例模式**：全局统一的存储实例
- **流式传输**：支持大文件流式下载

## 目录结构

```
storage/
├── types.ts      # 接口定义与配置类型
├── local.ts      # 本地文件系统实现
├── hash.ts       # SHA-256 哈希工具
└── index.ts      # 单例工厂入口
```

## 使用方式

```typescript
import { LocalStorageProvider } from '@/common/storage';
import { sha256Hex } from '@/common/storage/hash';

// 获取单例实例
const storage = LocalStorageProvider.getInstance();

// 计算哈希
const hash = sha256Hex(data);

// 上传文件
const path = await storage.upload(
  data,
  hash,
  'application/javascript'
);

// 下载文件
const content = await storage.download(path);

// 流式下载
const stream = await storage.getStream(path);

// 检查存在
const exists = await storage.exists(path);

// 删除文件
await storage.delete(path);
```

## 环境变量配置

```bash
# 存储类型: local | s3 | r2 | webdav
STORAGE_TYPE=local

# 本地存储路径
STORAGE_LOCAL_PATH=./storage
```

## 接口定义

```typescript
interface StorageProvider {
  upload(
    data: Buffer | Uint8Array,
    hash: string,
    contentType: string
  ): Promise<string>;
  download(path: string): Promise<Buffer>;
  getStream(path: string): Promise<ReadableStream<Uint8Array>>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getSize(path: string): Promise<number>;
  getPublicUrl?(path: string): string | null;
}
```

## 存储路径策略

使用哈希前两个字符作为子目录，减少单目录文件数量：

```
storage/
└── assets/
    ├── ab/
    │   └── abcdef123456...
    └── cd/
        └── cdefgh789012...
```

## 扩展指南

实现新的存储后端只需实现 `StorageProvider` 接口：

```typescript
export class S3StorageProvider implements StorageProvider {
  // 实现所有接口方法
}
```
