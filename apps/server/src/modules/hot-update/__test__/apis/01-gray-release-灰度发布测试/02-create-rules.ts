/**
 * 灰度发布 - 步骤 02: 创建灰度规则
 *
 * 测试内容：
 * - 创建基于设备 ID 的灰度规则
 * - 创建基于百分比的灰度规则
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/01-gray-release-灰度发布测试/02-create-rules.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('GrayRelease:02-CreateRules');

async function main() {
  logger.info('='.repeat(60));
  logger.info('📝 灰度发布 - 步骤 02: 创建灰度规则');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.testUpdateId) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 1. 创建设备 ID 规则
    logger.info('\n📝 创建设备 ID 灰度规则');
    logger.info('-'.repeat(60));

    const deviceRule = await manage.rolloutRules.create.mutate({
      updateId: ctx.testUpdateId,
      type: 'device_id',
      value: {
        include: ['test-device-001', 'test-device-002'],
      },
      priority: 100,
      isEnabled: true,
    });

    logger.info('✅ 设备 ID 规则已创建');
    logger.info(`  - Rule ID: ${deviceRule.id}`);
    logger.info(`  - Type: ${deviceRule.type}`);
    logger.info(`  - Device IDs:`, deviceRule.value);

    // 2. 创建百分比规则
    logger.info('\n📝 创建百分比灰度规则');
    logger.info('-'.repeat(60));

    const percentRule = await manage.rolloutRules.create.mutate({
      updateId: ctx.testUpdateId,
      type: 'percentage',
      value: {
        percentage: 50,
      },
      priority: 50,
      isEnabled: true,
    });

    logger.info('✅ 百分比规则已创建');
    logger.info(`  - Rule ID: ${percentRule.id}`);
    logger.info(`  - Type: ${percentRule.type}`);
    logger.info(`  - Percentage:`, percentRule.value);

    // 保存规则 IDs 到上下文
    const ruleIds = [deviceRule.id, percentRule.id];
    await saveTestContext({ ruleIds });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 灰度规则创建完成！');
    logger.info('='.repeat(60));

    logger.info('\n规则详情:');
    logger.info(`  - Device Rule ID: ${deviceRule.id}`);
    logger.info(`  - Percent Rule ID: ${percentRule.id}`);
    logger.info(`  - Update ID: ${ctx.testUpdateId}`);

    logger.info('\n💡 提示: 现在可以测试灰度匹配逻辑');
  } catch (error) {
    logger.error('❌ 创建规则失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
