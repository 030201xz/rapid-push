/**
 * 资源下载 HTTP 路由
 *
 * 符合 Expo Updates v1 协议规范的二进制资源下载
 * 支持 gzip 和 brotli 压缩
 */

import { getDb } from '@/common/database/postgresql/rapid-s';
import type { Env, Hono } from 'hono';
import * as assetService from './service';

/** 压缩类型 */
type CompressionType = 'gzip' | 'br' | 'none';

/**
 * 根据 Accept-Encoding 头确定支持的压缩类型
 * 优先级：br > gzip > none
 */
function getCompressionType(acceptEncoding: string): CompressionType {
  const encodings = acceptEncoding
    .toLowerCase()
    .split(',')
    .map(e => e.trim().split(';')[0]);

  // 暂时只支持 gzip，brotli 需要第三方库
  // if (encodings.includes('br')) return 'br';
  if (encodings.includes('gzip')) return 'gzip';
  return 'none';
}

/**
 * 压缩二进制数据
 *
 * 使用 Bun 内置压缩功能（高性能）
 */
async function compressData(
  data: Uint8Array,
  type: CompressionType
): Promise<Uint8Array> {
  if (type === 'none') return data;

  try {
    // 将 Uint8Array 转换为 Buffer（Bun 兼容）
    const buffer = Buffer.from(data);
    const compressed = Bun.gzipSync(buffer);
    return new Uint8Array(compressed);
  } catch (error) {
    console.error(`[Compression] Failed to compress with ${type}:`, error);
    return data; // 压缩失败则返回原始数据
  }
}

/**
 * 注册资源下载路由到 Hono 应用
 *
 * @param app - Hono 应用实例
 */
export function registerAssetRoutes<E extends Env = Env>(
  app: Hono<E>
) {
  /**
   * GET /assets/:hash
   *
   * 下载资源文件
   * 符合 Expo Updates v1 协议规范：
   * - 返回二进制流
   * - 设置正确的 Content-Type
   * - 设置长期缓存头
   * - 支持 gzip/brotli 压缩
   */
  app.get('/assets/:hash', async c => {
    const hash = c.req.param('hash');

    try {
      const db = getDb();
      const result = await assetService.getAssetContent(db, hash);

      if (!result) {
        return c.text('Asset not found', 404);
      }

      // 检测客户端支持的压缩类型
      const acceptEncoding = c.req.header('accept-encoding') ?? '';
      const compressionType = getCompressionType(acceptEncoding);

      // 获取原始数据
      const rawData = new Uint8Array(result.content);

      // 压缩数据（如果支持）
      const compressedData = await compressData(rawData, compressionType);

      // 设置响应头（符合 Expo 规范）
      c.header('content-type', result.contentType);
      c.header(
        'cache-control',
        'public, max-age=31536000, immutable'
      );

      // 如果进行了压缩，设置 Content-Encoding 和压缩后的 Content-Length
      if (compressionType !== 'none') {
        c.header('content-encoding', compressionType);
        c.header('content-length', compressedData.length.toString());
        c.header('vary', 'Accept-Encoding');
      } else {
        c.header('content-length', result.size.toString());
      }

      // 返回二进制内容（使用 ArrayBuffer）
      return c.body(compressedData.buffer as ArrayBuffer);
    } catch (error) {
      console.error('[Asset Download] Error:', error);
      return c.text('Internal Server Error', 500);
    }
  });
}
