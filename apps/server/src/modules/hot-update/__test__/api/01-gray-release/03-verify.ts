/**
 * 灰度发布场景 - 步骤 03: 验证灰度效果
 *
 * 测试内容：
 * - VIP 设备（白名单）应 100% 收到更新
 * - 普通设备应符合灰度比例（~50%）
 * - 统计收到/未收到更新的设备分布
 *
 * 运行: bun run src/modules/hot-update/__test__/api/01-gray-release/03-verify.ts
 */

import {
  createAnonymousClient,
  createTestLogger,
  getProtocolApi,
  loadTestContext,
} from '../../apis/_shared';

const logger = createTestLogger('Gray:03-Verify');

// ========== 主流程 ==========

async function main() {
  logger.info('='.repeat(50));
  logger.info('🔍 灰度发布场景 - 步骤 03: 验证灰度效果');
  logger.info('='.repeat(50));

  try {
    const ctx = await loadTestContext();
    if (!ctx.channelKey) {
      throw new Error('测试上下文不完整');
    }

    const client = createAnonymousClient();
    const protocol = getProtocolApi(client);

    // 1. 测试 VIP 设备（白名单）
    logger.info('1. 测试 VIP 设备（应全部收到更新）...');
    const vipDeviceIds = [
      'vip-device-001',
      'vip-device-002',
      'vip-device-003',
    ];

    let vipReceivedCount = 0;
    for (const deviceId of vipDeviceIds) {
      const result = await protocol.manifest.check.query({
        channelKey: ctx.channelKey,
        runtimeVersion: '1.0.0',
        platform: 'ios',
        deviceId,
      });
      if (result.type === 'updateAvailable') {
        vipReceivedCount++;
      }
    }

    logger.info('✅ VIP 设备结果', {
      total: vipDeviceIds.length,
      received: vipReceivedCount,
      percentage: `${(
        (vipReceivedCount / vipDeviceIds.length) *
        100
      ).toFixed(0)}%`,
      expected: '100%',
    });

    if (vipReceivedCount !== vipDeviceIds.length) {
      logger.warn('⚠️ VIP 设备未全部收到更新，规则可能未生效');
    }

    // 2. 测试普通设备（应符合灰度比例）
    logger.info('2. 测试普通设备（20 个样本）...');
    const normalResults: { deviceId: string; received: boolean }[] =
      [];

    for (let i = 1; i <= 20; i++) {
      const deviceId = `normal-${i.toString().padStart(3, '0')}`;
      const result = await protocol.manifest.check.query({
        channelKey: ctx.channelKey,
        runtimeVersion: '1.0.0',
        platform: 'ios',
        deviceId,
      });
      normalResults.push({
        deviceId,
        received: result.type === 'updateAvailable',
      });
    }

    const receivedCount = normalResults.filter(
      r => r.received
    ).length;
    const percentage = (receivedCount / normalResults.length) * 100;

    logger.info('✅ 普通设备结果', {
      total: normalResults.length,
      received: receivedCount,
      actualPercentage: `${percentage.toFixed(1)}%`,
      expectedRange: '~50%（基础灰度比例）',
    });

    // 3. 显示分布详情
    logger.info('3. 设备分布详情');
    const receivedDevices = normalResults
      .filter(r => r.received)
      .map(r => r.deviceId);
    const notReceivedDevices = normalResults
      .filter(r => !r.received)
      .map(r => r.deviceId);

    logger.debug('收到更新', { devices: receivedDevices });
    logger.debug('未收到更新', { devices: notReceivedDevices });

    // 4. 验证结果合理性
    logger.info('4. 结果分析');
    const isVipOk = vipReceivedCount === vipDeviceIds.length;
    const isPercentageReasonable =
      percentage >= 30 && percentage <= 70;

    if (isVipOk && isPercentageReasonable) {
      logger.info('✅ 灰度效果符合预期');
    } else {
      if (!isVipOk) {
        logger.warn('⚠️ VIP 设备规则未完全生效');
      }
      if (!isPercentageReasonable) {
        logger.warn('⚠️ 灰度比例偏离预期较大');
      }
    }

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 03 完成！');
    logger.info('='.repeat(50));
    logger.info('下一步: bun run .../01-gray-release/99-cleanup.ts');
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
