/**
 * 灰度发布场景 - 步骤 02: 创建灰度规则
 *
 * 测试内容：
 * - 创建设备 ID 白名单规则（VIP 设备优先）
 * - 创建百分比规则
 * - 验证规则列表
 *
 * 运行: bun run src/modules/hot-update/__test__/api/01-gray-release/02-create-rules.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
  saveTestContext,
} from '../../apis/_shared';

const logger = createTestLogger('Gray:02-CreateRules');

// ========== 主流程 ==========

async function main() {
  logger.info('='.repeat(50));
  logger.info('📋 灰度发布场景 - 步骤 02: 创建灰度规则');
  logger.info('='.repeat(50));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.updateIds?.length) {
      throw new Error('测试上下文不完整，请先运行前置测试');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);
    const updateId = ctx.updateIds[ctx.updateIds.length - 1]!;
    const ruleIds: string[] = [];

    // 1. 创建设备白名单规则（优先级 1）
    logger.info('1. 创建设备白名单规则...');
    const vipDeviceIds = [
      'vip-device-001',
      'vip-device-002',
      'vip-device-003',
    ];
    const deviceRule =
      await manage.rolloutRules.createDeviceId.mutate({
        updateId,
        deviceIds: vipDeviceIds,
        priority: 1, // 最高优先级
      });

    logger.info('✅ 设备白名单规则', {
      ruleId: deviceRule.id,
      type: deviceRule.type,
      deviceCount: vipDeviceIds.length,
      priority: deviceRule.priority,
    });
    ruleIds.push(deviceRule.id);

    // 2. 创建百分比规则（优先级 2）
    logger.info('2. 创建百分比规则（30%）...');
    const percentageRule =
      await manage.rolloutRules.createPercentage.mutate({
        updateId,
        percentage: 30,
        priority: 2,
      });

    logger.info('✅ 百分比规则', {
      ruleId: percentageRule.id,
      percentage: 30,
      priority: percentageRule.priority,
    });
    ruleIds.push(percentageRule.id);

    // 3. 验证规则列表
    logger.info('3. 验证规则列表...');
    const rules = await manage.rolloutRules.listByUpdate.query({
      updateId,
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

    // 保存规则 ID 到上下文
    await saveTestContext({ ruleIds });

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 02 完成！');
    logger.info('='.repeat(50));
    logger.info('下一步: bun run .../01-gray-release/03-verify.ts');
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
