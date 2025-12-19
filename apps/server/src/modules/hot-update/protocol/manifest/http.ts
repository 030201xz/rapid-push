/**
 * Manifest HTTP 路由
 *
 * 符合 Expo Updates v1 协议规范的 REST 风格路由
 * 桥接 tRPC 实现
 */

import { getDb } from '@/common/database/postgresql/rapid-s';
import type { Env, Hono } from 'hono';
import * as manifestService from './service';
import type { CheckUpdateRequest, Platform } from './types';

/**
 * 从请求头中提取检查更新所需参数
 *
 * 符合 Expo Updates v1 协议规范
 */
function extractCheckParams(
  channelKey: string,
  headers: Record<string, string | undefined>
): CheckUpdateRequest {
  // 必需字段
  const runtimeVersion = headers['expo-runtime-version'];
  const platform = headers['expo-platform'];

  if (!runtimeVersion) {
    throw new Error('Missing expo-runtime-version header');
  }

  if (!platform || (platform !== 'ios' && platform !== 'android')) {
    throw new Error('Invalid or missing expo-platform header');
  }

  // 可选字段
  const currentUpdateId = headers['expo-current-update-id'];
  const embeddedUpdateId = headers['expo-embedded-update-id'];

  // 构建请求对象
  const request: CheckUpdateRequest = {
    channelKey,
    runtimeVersion,
    platform: platform as Platform,
  };

  // 添加可选字段
  if (currentUpdateId) {
    request.currentUpdateId = currentUpdateId;
  }

  if (embeddedUpdateId) {
    request.embeddedUpdateId = embeddedUpdateId;
  }

  return request;
}

/**
 * 注册 Manifest 下载路由到 Hono 应用
 *
 * @param app - Hono 应用实例
 */
export function registerManifestRoutes<E extends Env = Env>(
  app: Hono<E>
) {
  /**
   * GET /manifests/:channelKey
   *
   * 检查更新
   * 符合 Expo Updates v1 协议规范：
   * - 从请求头中提取参数
   * - 设置协议响应头
   * - 返回 Manifest/无更新/回滚指令
   */
  app.get('/manifests/:channelKey', async c => {
    const channelKey = c.req.param('channelKey');

    try {
      // 提取所有请求头（转换为小写）
      const headers: Record<string, string | undefined> = {};
      c.req.raw.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      // 验证协议版本
      const protocolVersion = headers['expo-protocol-version'];
      if (protocolVersion !== '1') {
        return c.json({ error: 'Unsupported protocol version' }, 406);
      }

      // 提取请求参数
      const request = extractCheckParams(channelKey, headers);

      // 构建完整的资源 URL 前缀
      // expo-updates 需要完整 URL 来下载资源
      const protocol = c.req.header('x-forwarded-proto') || 'http';
      const host = c.req.header('host') || 'localhost:6688';
      const assetUrlPrefix = `${protocol}://${host}/assets`;

      // 调用 service 层
      const db = getDb();
      const result = await manifestService.checkUpdate(
        db,
        request,
        assetUrlPrefix
      );

      // 设置通用响应头（符合 Expo Updates Protocol）
      c.header('expo-protocol-version', '1');
      c.header('expo-sfv-version', '0');
      c.header('cache-control', 'private, max-age=0');

      // 根据响应类型设置特定响应头
      if (result.type === 'updateAvailable') {
        // 设置 Manifest Filters
        if (result.manifestFilters) {
          c.header('expo-manifest-filters', result.manifestFilters);
        }

        // 设置代码签名
        if (result.signature) {
          c.header('expo-signature', result.signature);
        }

        // 返回 Manifest
        return c.json(result.manifest, 200, {
          'content-type': 'application/expo+json',
        });
      }

      // 无更新或回滚指令
      // Expo Updates 期望 204 状态码表示无更新
      if (result.type === 'noUpdate') {
        return c.body(null, 204);
      }

      // 回滚指令（作为 directive part 返回）
      // 暂时简化处理：返回 204
      // TODO: 实现完整的 multipart/mixed 响应
      return c.body(null, 204);
    } catch (error) {
      console.error('[Manifest Request] Error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Internal Server Error';
      return c.json({ error: message }, 500);
    }
  });
}
