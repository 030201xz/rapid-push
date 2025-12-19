/**
 * 存储模块入口
 *
 * 当前仅支持本地存储，每个存储实现内部管理单例
 */

// ========== 类型重导出 ==========
export type {
  LocalStorageConfig,
  R2StorageConfig,
  S3StorageConfig,
  StorageConfig,
  StorageProvider,
  StorageType,
  WebDAVStorageConfig,
} from './types';

// ========== 工具函数重导出 ==========
export { sha256Base64Url, sha256Hex } from './hash';

// ========== 存储实现重导出 ==========
export { LocalStorageProvider } from './local';
