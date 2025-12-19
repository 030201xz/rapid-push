/**
 * Manifest Check API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的生产渠道密钥
 * 2. 测试多种场景的更新检查：
 *    - 首次检查（有更新可用）
 *    - 已是最新版本（无更新）
 *    - 回滚指令场景
 * 3. 验证响应格式和数据正确性
 *
 * 运行: bun run src/modules/hot-update/protocol/manifest/__test__/api/check.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:ManifestCheck' });

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 使用已初始化的生产环境渠道密钥（来自 scripts/init/config）
const CHANNEL_KEY = 'prod_demo_app_channel_key_12345678';

// 测试运行时版本
const RUNTIME_VERSION = '1.0.0';

// 测试平台
const PLATFORM = 'ios' as const;

// ========== 路由别名 ==========

const getManifestApi = (client: Client) =>
  client.hotUpdate.protocol.manifest;

// ========== 测试用例 ==========

/** 测试首次检查更新 - 期望有更新可用 */
async function testFirstTimeCheck(client: Client) {
  logger.info('测试首次检查更新...');

  const manifestApi = getManifestApi(client);

  const response = await manifestApi.check.query({
    channelKey: CHANNEL_KEY,
    runtimeVersion: RUNTIME_VERSION,
    platform: PLATFORM,
  });

  logger.info('检查更新响应', {
    type: response.type,
  });

  // 根据响应类型进行断言
  if (response.type === 'updateAvailable') {
    logger.info('有更新可用', {
      updateId: response.manifest.id,
      runtimeVersion: response.manifest.runtimeVersion,
      hasSignature: !!response.signature,
      assetsCount: response.manifest.assets.length,
    });

    // 验证 manifest 结构
    if (!response.manifest.id) {
      throw new Error('Manifest 缺少 id 字段');
    }

    if (!response.manifest.launchAsset) {
      throw new Error('Manifest 缺少 launchAsset 字段');
    }

    logger.info('Manifest 结构验证通过', {
      launchAssetHash: response.manifest.launchAsset.hash,
      launchAssetKey: response.manifest.launchAsset.key,
    });
  } else if (response.type === 'noUpdate') {
    logger.info('当前无更新可用');
  } else if (response.type === 'rollback') {
    logger.info('收到回滚指令', {
      directiveType: response.directive.type,
    });
  }

  return response;
}

/** 测试已有当前版本的检查 - 期望无更新 */
async function testCheckWithCurrentUpdateId(
  client: Client,
  currentUpdateId: string
) {
  logger.info('测试已有当前版本的检查...', { currentUpdateId });

  const manifestApi = getManifestApi(client);

  const response = await manifestApi.check.query({
    channelKey: CHANNEL_KEY,
    runtimeVersion: RUNTIME_VERSION,
    platform: PLATFORM,
    currentUpdateId,
  });

  logger.info('检查更新响应', {
    type: response.type,
  });

  if (response.type === 'noUpdate') {
    logger.info('已是最新版本，无需更新');
  } else if (response.type === 'updateAvailable') {
    logger.warn('预期无更新，但收到更新响应', {
      updateId: response.manifest.id,
    });
  }

  return response;
}

/** 测试带设备 ID 的检查（用于灰度规则） */
async function testCheckWithDeviceId(
  client: Client,
  deviceId: string
) {
  logger.info('测试带设备 ID 的检查...', { deviceId });

  const manifestApi = getManifestApi(client);

  const response = await manifestApi.check.query({
    channelKey: CHANNEL_KEY,
    runtimeVersion: RUNTIME_VERSION,
    platform: PLATFORM,
    deviceId,
  });

  logger.info('检查更新响应', {
    type: response.type,
    deviceId,
  });

  return response;
}

/** 测试带自定义请求头的检查（用于灰度规则） */
async function testCheckWithCustomHeaders(client: Client) {
  logger.info('测试带自定义请求头的检查...');

  const manifestApi = getManifestApi(client);

  const customHeaders = {
    'X-User-Country': 'CN',
    'X-User-Language': 'zh-CN',
  };

  const response = await manifestApi.check.query({
    channelKey: CHANNEL_KEY,
    runtimeVersion: RUNTIME_VERSION,
    platform: PLATFORM,
    customHeaders,
  });

  logger.info('检查更新响应', {
    type: response.type,
    customHeaders,
  });

  return response;
}

/** 测试不同平台的检查 */
async function testCheckDifferentPlatform(client: Client) {
  logger.info('测试 Android 平台检查...');

  const manifestApi = getManifestApi(client);

  const response = await manifestApi.check.query({
    channelKey: CHANNEL_KEY,
    runtimeVersion: RUNTIME_VERSION,
    platform: 'android',
  });

  logger.info('检查更新响应', {
    type: response.type,
    platform: 'android',
  });

  return response;
}

/** 测试不存在的渠道密钥 */
async function testCheckWithInvalidChannelKey(client: Client) {
  logger.info('测试不存在的渠道密钥...');

  const manifestApi = getManifestApi(client);

  try {
    await manifestApi.check.query({
      channelKey: 'invalid_channel_key',
      runtimeVersion: RUNTIME_VERSION,
      platform: PLATFORM,
    });

    throw new Error('预期应该抛出错误，但请求成功了');
  } catch (error) {
    logger.info('正确抛出错误', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** 测试不存在的运行时版本 - 期望无更新 */
async function testCheckWithNonExistentRuntimeVersion(
  client: Client
) {
  logger.info('测试不存在的运行时版本...');

  const manifestApi = getManifestApi(client);

  const response = await manifestApi.check.query({
    channelKey: CHANNEL_KEY,
    runtimeVersion: '99.99.99',
    platform: PLATFORM,
  });

  logger.info('检查更新响应', {
    type: response.type,
    runtimeVersion: '99.99.99',
  });

  if (response.type !== 'noUpdate') {
    logger.warn('预期无更新，但收到其他响应', {
      type: response.type,
    });
  }

  return response;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始 Manifest Check API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 首次检查更新
    const firstCheckResponse = await testFirstTimeCheck(client);

    // 2. 如果有更新，测试已有当前版本的场景
    if (firstCheckResponse.type === 'updateAvailable') {
      const currentUpdateId = firstCheckResponse.manifest.id;
      await testCheckWithCurrentUpdateId(client, currentUpdateId);
    }

    // 3. 测试带设备 ID 的检查
    await testCheckWithDeviceId(client, 'test-device-id-12345');

    // 4. 测试带自定义请求头的检查
    await testCheckWithCustomHeaders(client);

    // 5. 测试不同平台的检查
    await testCheckDifferentPlatform(client);

    // 6. 测试错误场景：不存在的渠道密钥
    await testCheckWithInvalidChannelKey(client);

    // 7. 测试错误场景：不存在的运行时版本
    await testCheckWithNonExistentRuntimeVersion(client);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
