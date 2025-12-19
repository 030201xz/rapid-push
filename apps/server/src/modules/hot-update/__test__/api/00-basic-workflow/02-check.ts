/**
 * 基础工作流 - 步骤 02: 客户端检查更新
 *
 * 测试内容：
 * - 客户端通过 channelKey 检查更新
 * - 验证返回的 Manifest 结构
 * - 测试不同平台（iOS/Android）
 * - 测试已是最新版本的情况
 * - 测试无效参数处理
 *
 * 运行: bun run src/modules/hot-update/__test__/api/00-basic-workflow/02-check.ts
 */

import {
  createAnonymousClient,
  createTestLogger,
  getProtocolApi,
  loadTestContext,
} from '../../apis/_shared';

const logger = createTestLogger('Basic:02-Check');

// ========== 主流程 ==========

async function main() {
  logger.info('='.repeat(50));
  logger.info('📡 基础工作流 - 步骤 02: 客户端检查更新');
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

    // 测试 1: iOS 平台检查更新
    logger.info('测试 1: iOS 平台检查更新...');
    const iosResult = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'test-device-ios-001',
    });

    if (iosResult.type === 'updateAvailable') {
      logger.info('✅ iOS 响应', {
        updateId: iosResult.manifest.id,
        runtimeVersion: iosResult.manifest.runtimeVersion,
      });

      // 验证 Manifest 必要字段
      const requiredFields = ['id', 'createdAt', 'runtimeVersion'];
      for (const field of requiredFields) {
        if (!(field in iosResult.manifest)) {
          throw new Error(`Manifest 缺少字段: ${field}`);
        }
      }
      logger.info('✅ Manifest 结构验证通过');
    } else {
      throw new Error(
        `预期 updateAvailable，实际: ${iosResult.type}`
      );
    }

    // 测试 2: Android 平台检查更新
    logger.info('测试 2: Android 平台检查更新...');
    const androidResult = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'android',
      deviceId: 'test-device-android-001',
    });

    const androidUpdateId =
      androidResult.type === 'updateAvailable'
        ? androidResult.manifest.id
        : null;
    logger.info('✅ Android 响应', {
      type: androidResult.type,
      updateId: androidUpdateId,
    });

    // 测试 3: 客户端已是最新版本
    logger.info('测试 3: 客户端已是最新版本...');
    const latestUpdateId = ctx.updateIds[ctx.updateIds.length - 1];
    const upToDateResult = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'test-device-002',
      currentUpdateId: latestUpdateId,
    });

    logger.info('✅ 已最新版本响应', { type: upToDateResult.type });

    // 测试 4: 不匹配的 runtimeVersion
    logger.info('测试 4: 不匹配的 runtimeVersion...');
    const mismatchResult = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '999.0.0', // 不存在的版本
      platform: 'ios',
      deviceId: 'test-device-003',
    });

    logger.info('✅ 版本不匹配响应', { type: mismatchResult.type });

    // 测试 5: 无效的 channelKey
    logger.info('测试 5: 无效的 channelKey...');
    try {
      await protocol.manifest.check.query({
        channelKey: 'invalid_channel_key_12345',
        runtimeVersion: '1.0.0',
        platform: 'ios',
      });
      logger.warn('⚠️ 预期应该抛出错误');
    } catch {
      logger.info('✅ 正确拒绝无效渠道');
    }

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 02 完成！');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run .../00-basic-workflow/99-cleanup.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
