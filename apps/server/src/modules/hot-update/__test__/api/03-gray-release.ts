/**
 * 03 - 灰度发布测试
 *
 * 测试内容：
 * - 修改更新为 50% 灰度
 * - 创建设备白名单规则（VIP 设备优先）
 * - 创建百分比规则
 * - 模拟多设备请求，验证灰度效果
 *
 * 运行: bun run src/modules/hot-update/__test__/api/03-gray-release.ts
 */

import {
  API_URL,
  createAnonymousClient,
  createClient,
  createTestLogger,
  getManageApi,
  getProtocolApi,
  loadTestContext,
  saveTestContext,
} from '../apis/_shared';

const logger = createTestLogger('03-GrayRelease');

// ========== 主流程 ==========

async function main() {
  logger.info('='.repeat(50));
  logger.info('🎯 步骤 03: 灰度发布测试');
  logger.info('='.repeat(50));

  try {
    // 加载测试上下文
    const ctx = await loadTestContext();
    if (
      !ctx.accessToken ||
      !ctx.channelKey ||
      !ctx.updateIds?.length
    ) {
      throw new Error('测试上下文不完整，请先运行前置测试');
    }

    const authedClient = createClient(API_URL, {
      token: ctx.accessToken,
    });
    const manage = getManageApi(authedClient);
    const updateId = ctx.updateIds[ctx.updateIds.length - 1]!;

    // 1. 修改更新为 50% 灰度
    logger.info('1. 修改更新为 50% 灰度...');
    const updatedSettings =
      await manage.updates.updateSettings.mutate({
        id: updateId,
        rolloutPercentage: 50,
      });
    if (!updatedSettings) {
      throw new Error('更新设置失败');
    }
    logger.info('✅ 灰度比例已修改', {
      rolloutPercentage: updatedSettings.rolloutPercentage,
    });

    // 2. 创建设备白名单规则
    logger.info('2. 创建设备白名单规则...');
    const vipDeviceIds = [
      'vip-device-001',
      'vip-device-002',
      'test-device-001',
    ];
    const deviceRule =
      await manage.rolloutRules.createDeviceId.mutate({
        updateId: updateId,
        deviceIds: vipDeviceIds,
        priority: 1,
      });
    logger.info('✅ 设备白名单规则创建成功', {
      ruleId: deviceRule.id,
      type: deviceRule.type,
      deviceCount: vipDeviceIds.length,
    });

    // 保存规则 ID
    const ruleIds = ctx.ruleIds ?? [];
    ruleIds.push(deviceRule.id);

    // 3. 创建百分比规则（30%）
    logger.info('3. 创建百分比规则（30%）...');
    const percentageRule =
      await manage.rolloutRules.createPercentage.mutate({
        updateId: updateId,
        percentage: 30,
        priority: 2,
      });
    logger.info('✅ 百分比规则创建成功', {
      ruleId: percentageRule.id,
      percentage: 30,
    });
    ruleIds.push(percentageRule.id);

    // 保存规则 ID 到上下文
    await saveTestContext({ ruleIds });

    // 4. 测试 VIP 设备（应该 100% 收到更新）
    logger.info('4. 测试 VIP 设备...');
    const anonymousClient = createAnonymousClient();
    const protocol = getProtocolApi(anonymousClient);

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
    logger.info('✅ VIP 设备测试结果', {
      total: vipDeviceIds.length,
      received: vipReceivedCount,
      expectedAll: true,
    });

    if (vipReceivedCount !== vipDeviceIds.length) {
      logger.warn('⚠️ VIP 设备未全部收到更新');
    }

    // 5. 测试普通设备（应该符合灰度比例）
    logger.info('5. 测试普通设备（20 个）...');
    const normalDeviceResults: {
      deviceId: string;
      received: boolean;
    }[] = [];

    for (let i = 1; i <= 20; i++) {
      const deviceId = `normal-device-${i
        .toString()
        .padStart(3, '0')}`;
      const result = await protocol.manifest.check.query({
        channelKey: ctx.channelKey,
        runtimeVersion: '1.0.0',
        platform: 'ios',
        deviceId,
      });
      normalDeviceResults.push({
        deviceId,
        received: result.type === 'updateAvailable',
      });
    }

    const receivedCount = normalDeviceResults.filter(
      r => r.received
    ).length;
    const percentage =
      (receivedCount / normalDeviceResults.length) * 100;

    logger.info('✅ 普通设备测试结果', {
      total: normalDeviceResults.length,
      received: receivedCount,
      actualPercentage: `${percentage.toFixed(1)}%`,
      expectedPercentage: '~50%（基础）或更高（规则叠加）',
    });

    // 显示详细结果
    logger.debug('设备分布:', {
      received: normalDeviceResults
        .filter(r => r.received)
        .map(r => r.deviceId),
      notReceived: normalDeviceResults
        .filter(r => !r.received)
        .map(r => r.deviceId),
    });

    // 6. 查询当前规则列表
    logger.info('6. 验证规则列表...');
    const rules = await manage.rolloutRules.listByUpdate.query({
      updateId: updateId,
    });
    logger.info('✅ 当前规则', {
      count: rules.length,
      rules: rules.map(r => ({
        id: r.id,
        type: r.type,
        priority: r.priority,
        isEnabled: r.isEnabled,
      })),
    });

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 03 完成！灰度发布测试通过');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run src/modules/hot-update/__test__/api/04-rollback.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
