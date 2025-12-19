/**
 * 本地文件系统存储提供者
 *
 * 使用内容寻址存储策略：
 * - 文件按哈希值前两位分目录存储
 * - 自动去重，相同内容只存储一次
 * - 单例模式，通过 getInstance() 获取实例
 */

import { createReadStream } from 'node:fs';
import {
  access,
  mkdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { env } from '../env';
import type { StorageProvider } from './types';

// ========== 单例实例 ==========
let instance: LocalStorageProvider | null = null;

/**
 * 本地文件系统存储实现
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  private constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * 获取单例实例
   *
   * 使用环境变量配置的存储路径
   */
  static getInstance(): LocalStorageProvider {
    if (!instance) {
      instance = new LocalStorageProvider(env.storage.localPath);
    }
    return instance;
  }

  /**
   * 重置单例实例（仅用于测试）
   */
  static resetInstance(): void {
    instance = null;
  }

  /**
   * 根据哈希值生成存储路径
   *
   * 使用前两个字符作为子目录，减少单目录文件数量
   */
  private getFilePath(hash: string): string {
    const subDir = hash.substring(0, 2);
    return join(this.basePath, 'assets', subDir, hash);
  }

  /**
   * 生成相对存储路径
   */
  private getRelativePath(hash: string): string {
    return `assets/${hash.substring(0, 2)}/${hash}`;
  }

  async upload(
    data: Buffer | Uint8Array,
    hash: string,
    _contentType: string
  ): Promise<string> {
    const filePath = this.getFilePath(hash);
    const dir = dirname(filePath);

    // 确保目录存在
    await mkdir(dir, { recursive: true });

    // 写入文件
    await writeFile(filePath, data);

    // 返回相对路径
    return this.getRelativePath(hash);
  }

  async download(path: string): Promise<Buffer> {
    const fullPath = join(this.basePath, path);
    return await readFile(fullPath);
  }

  async getStream(path: string): Promise<ReadableStream<Uint8Array>> {
    const fullPath = join(this.basePath, path);
    const nodeStream = createReadStream(fullPath);

    // 将 Node.js stream 转换为 Web ReadableStream
    return Readable.toWeb(
      nodeStream
    ) as unknown as ReadableStream<Uint8Array>;
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    try {
      await unlink(fullPath);
    } catch (error) {
      // 文件不存在时忽略错误
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = join(this.basePath, path);
    try {
      await access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getSize(path: string): Promise<number> {
    const fullPath = join(this.basePath, path);
    const stats = await stat(fullPath);
    return stats.size;
  }

  /**
   * 本地存储不提供公开 URL
   */
  getPublicUrl(_path: string): null {
    return null;
  }
}
