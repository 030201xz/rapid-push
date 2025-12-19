/**
 * 灰度发布 - 步骤 03: 测试灰度匹配
 *
 * 测试内容：
 * - 测试指定设备 ID 可以获取更新
 * - 测试未指定设备 ID 根据百分比获取更新
 * - 验证灰度规则匹配逻辑
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/01-gray-release-灰度发布测试/03-test-rollout.ts
 */

import {
  createAnonymousClient,
  createTestLogger,
  getProtocolApi,
  loadTestContext,
} from '../_shared';

const logger = createTestLogger('GrayRelease:03-TestRollout');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🔍 灰度发布 - 步骤 03: 测试灰度匹配');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.channelKey || !ctx.testUpdateId) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    const client = createAnonymousClient();
    const protocol = getProtocolApi(client);

    // 1. 测试白名单设备（应该获取更新）
    logger.info('\n📝 测试 1: 白名单设备获取更新');
    logger.info('-'.repeat(60));

    const whitelistResult = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'android',
      deviceId: 'test-device-001', // 在白名单中
    });

    if (whitelistResult.type !== 'updateAvailable') {
      throw new Error('白名单设备应该获取到更新');
    }

    logger.info('✅ 白名单设备获取到更新');
    logger.info(`  - Update ID: ${whitelistResult.manifest.id}`);
    logger.info(`  - Device ID: test-device-001`);

    // 2. 测试非白名单设备（基于百分比）
    logger.info('\n📝 测试 2: 随机设备基于百分比');
    logger.info('-'.repeat(60));

    const randomResult = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'android',
      deviceId: 'random-device-999', // 不在白名单
    });

    logger.info(`  结果: ${randomResult.type}`);
    if (randomResult.type === 'updateAvailable') {
      logger.info(`  - Update ID: ${randomResult.manifest.id}`);
      logger.info('  ℹ️  设备通过百分比规则获取更新');
    } else {
      logger.info('  ℹ️  设备未通过百分比规则');
    }

    // 3. 验证灰度比例（多次请求统计）
    logger.info('\n📝 测试 3: 灰度比例统计（10次请求）');
    logger.info('-'.repeat(60));

    let updateCount = 0;
    const totalRequests = 10;

    for (let i = 0; i < totalRequests; i++) {
      const result = await protocol.manifest.check.query({
        channelKey: ctx.channelKey,
        runtimeVersion: '1.0.0',
        platform: 'android',
        deviceId: `random-test-${i}`,
      });

      if (result.type === 'updateAvailable') {
        updateCount++;
      }
    }

    const percentage = (updateCount / totalRequests) * 100;
    logger.info(`  - 获取更新次数: ${updateCount}/${totalRequests}`);
    logger.info(`  - 实际比例: ${percentage}%`);
    logger.info(`  - 预期比例: ~50% (灰度规则设置)`);

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 灰度匹配测试完成！');
    logger.info('='.repeat(60));

    logger.info('\n测试结果:');
    logger.info(`  - 白名单设备: 成功获取更新`);
    logger.info(`  - 随机设备: ${randomResult.type}`);
    logger.info(
      `  - 灰度比例: ${percentage}% (${updateCount}/${totalRequests})`
    );

    logger.info('\n💡 灰度发布功能验证完成！');
  } catch (error) {
    logger.error('❌ 测试失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
