/**
 * 存储提供者接口定义
 *
 * 支持多种存储后端：本地文件系统、S3、R2、WebDAV
 * 采用内容寻址存储策略（Content-Addressable Storage）
 */

/** 存储类型枚举 */
export type StorageType = 'local' | 's3' | 'r2' | 'webdav';

/**
 * 存储提供者接口
 *
 * 所有存储实现必须满足此接口契约
 */
export interface StorageProvider {
  /**
   * 上传文件
   *
   * @param data - 文件数据（Buffer 或 Uint8Array）
   * @param hash - 文件内容哈希（用于生成存储路径）
   * @param contentType - MIME 类型
   * @returns 相对存储路径
   */
  upload(
    data: Buffer | Uint8Array,
    hash: string,
    contentType: string
  ): Promise<string>;

  /**
   * 下载文件（完整数据）
   *
   * @param path - 相对存储路径
   * @returns 文件数据 Buffer
   */
  download(path: string): Promise<Buffer>;

  /**
   * 获取文件流（用于大文件传输）
   *
   * @param path - 相对存储路径
   * @returns Web ReadableStream
   */
  getStream(path: string): Promise<ReadableStream<Uint8Array>>;

  /**
   * 删除文件
   *
   * @param path - 相对存储路径
   */
  delete(path: string): Promise<void>;

  /**
   * 检查文件是否存在
   *
   * @param path - 相对存储路径
   */
  exists(path: string): Promise<boolean>;

  /**
   * 获取文件大小
   *
   * @param path - 相对存储路径
   * @returns 文件大小（字节）
   */
  getSize(path: string): Promise<number>;

  /**
   * 获取文件 URL（可选，用于公开访问）
   *
   * @param path - 相对存储路径
   * @returns 公开访问 URL，若不支持返回 null
   */
  getPublicUrl?(path: string): string | null;
}

/**
 * 本地存储配置
 */
export interface LocalStorageConfig {
  type: 'local';
  /** 存储根目录绝对路径 */
  basePath: string;
}

/**
 * S3 存储配置
 */
export interface S3StorageConfig {
  type: 's3';
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  region?: string;
  forcePathStyle?: boolean;
  publicUrlPrefix?: string;
}

/**
 * R2 存储配置（Cloudflare）
 */
export interface R2StorageConfig {
  type: 'r2';
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrlPrefix?: string;
}

/**
 * WebDAV 存储配置
 */
export interface WebDAVStorageConfig {
  type: 'webdav';
  url: string;
  username?: string;
  password?: string;
  authType?: 'basic' | 'digest';
  basePath?: string;
  publicUrlPrefix?: string;
}

/**
 * 存储配置联合类型
 */
export type StorageConfig =
  | LocalStorageConfig
  | S3StorageConfig
  | R2StorageConfig
  | WebDAVStorageConfig;
