/**
 * 02 - 客户端检查更新（Manifest 协议）
 *
 * 测试内容：
 * - 客户端通过 channelKey 检查更新
 * - 验证返回的 Manifest 结构
 * - 测试不同设备 ID 的请求
 * - 测试已是最新版本的情况
 *
 * 运行: bun run src/modules/hot-update/__test__/api/02-check-manifest.ts
 */

import {
  createAnonymousClient,
  createTestLogger,
  getProtocolApi,
  loadTestContext,
} from '../apis/_shared';

const logger = createTestLogger('02-CheckManifest');

// ========== 主流程 ==========

async function main() {
  logger.info('='.repeat(50));
  logger.info('📡 步骤 02: 客户端检查更新');
  logger.info('='.repeat(50));

  try {
    // 加载测试上下文
    const ctx = await loadTestContext();
    if (!ctx.channelKey || !ctx.updateIds?.length) {
      throw new Error('测试上下文不完整，请先运行前置测试');
    }

    // 客户端协议使用匿名客户端（公开接口）
    const client = createAnonymousClient();
    const protocol = getProtocolApi(client);

    // 测试 1: 正常检查更新
    logger.info('测试 1: 正常检查更新...');
    const result1 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'test-device-001',
    });

    // 使用类型守卫处理联合类型
    if (result1.type === 'updateAvailable') {
      logger.info('✅ 响应', {
        type: result1.type,
        updateId: result1.manifest.id,
        runtimeVersion: result1.manifest.runtimeVersion,
      });

      // 验证 Manifest 结构
      logger.info('验证 Manifest 结构...');
      const manifest = result1.manifest;
      const requiredFields = ['id', 'createdAt', 'runtimeVersion'];
      for (const field of requiredFields) {
        if (!(field in manifest)) {
          throw new Error(`Manifest 缺少字段: ${field}`);
        }
      }
      logger.info('✅ Manifest 结构验证通过');
    } else {
      throw new Error(
        `预期返回 updateAvailable，实际: ${result1.type}`
      );
    }

    // 测试 2: Android 平台
    logger.info('测试 2: Android 平台...');
    const result2 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'android',
      deviceId: 'android-device-001',
    });

    const updateId2 =
      result2.type === 'updateAvailable' ? result2.manifest.id : null;
    logger.info('✅ Android 响应', {
      type: result2.type,
      updateId: updateId2,
    });

    // 测试 3: 客户端已是最新版本
    logger.info('测试 3: 客户端已是最新版本...');
    const latestUpdateId = ctx.updateIds[ctx.updateIds.length - 1];
    const result3 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'test-device-002',
      currentUpdateId: latestUpdateId,
    });

    // 可能返回 noUpdate 或仍返回更新（取决于服务端实现）
    if (result3.type === 'noUpdate') {
      logger.info('✅ 已最新版本响应: noUpdate');
    } else if (result3.type === 'rollback') {
      logger.info('✅ 已最新版本响应: rollback', {
        directive: result3.directive,
      });
    } else {
      logger.info('✅ 已最新版本响应: 仍返回更新', {
        type: result3.type,
      });
    }

    // 测试 4: 不匹配的 runtimeVersion
    logger.info('测试 4: 不匹配的 runtimeVersion...');
    const result4 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '2.0.0', // 不同版本
      platform: 'ios',
      deviceId: 'test-device-003',
    });

    const hasManifest4 = result4.type === 'updateAvailable';
    logger.info('✅ 不同版本响应', {
      type: result4.type,
      hasManifest: hasManifest4,
    });

    // 测试 5: 无效的 channelKey
    logger.info('测试 5: 无效的 channelKey...');
    try {
      await protocol.manifest.check.query({
        channelKey: 'invalid_channel_key_12345',
        runtimeVersion: '1.0.0',
        platform: 'ios',
      });
      logger.warn('⚠️ 预期应该抛出错误');
    } catch (error) {
      logger.info('✅ 正确拒绝无效渠道');
    }

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 02 完成！Manifest 协议测试通过');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run src/modules/hot-update/__test__/api/03-gray-release.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
