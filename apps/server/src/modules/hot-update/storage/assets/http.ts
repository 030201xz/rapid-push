/**
 * 资源下载 HTTP 路由
 *
 * 符合 Expo Updates v1 协议规范的二进制资源下载
 */

import { getDb } from '@/common/database/postgresql/rapid-s';
import type { Env, Hono } from 'hono';
import * as assetService from './service';

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
   */
  app.get('/assets/:hash', async c => {
    const hash = c.req.param('hash');

    try {
      const db = getDb();
      const result = await assetService.getAssetContent(db, hash);

      if (!result) {
        return c.text('Asset not found', 404);
      }

      // 设置响应头（符合 Expo 规范）
      c.header('content-type', result.contentType);
      c.header(
        'cache-control',
        'public, max-age=31536000, immutable'
      );
      c.header('content-length', result.size.toString());

      // 返回二进制内容（使用 Uint8Array）
      return c.body(new Uint8Array(result.content));
    } catch (error) {
      console.error('[Asset Download] Error:', error);
      return c.text('Internal Server Error', 500);
    }
  });
}
