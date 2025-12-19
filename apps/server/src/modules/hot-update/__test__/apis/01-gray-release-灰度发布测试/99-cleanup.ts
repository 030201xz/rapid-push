/**
 * 灰度发布 - 步骤 99: 清理测试数据
 *
 * 测试内容：
 * - 删除灰度规则
 * - 删除测试更新
 * - 重置测试上下文
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/01-gray-release-灰度发布测试/99-cleanup.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
  resetTestContext,
} from '../_shared';

const logger = createTestLogger('GrayRelease:99-Cleanup');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🧹 灰度发布 - 步骤 99: 清理测试数据');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken) {
      logger.warn('⚠️  测试上下文为空，无需清理');
      return;
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 删除灰度规则
    if (ctx.ruleIds && ctx.ruleIds.length > 0) {
      logger.info('\n🗑️  删除灰度规则');
      logger.info('-'.repeat(60));

      for (const ruleId of ctx.ruleIds) {
        try {
          await manage.rolloutRules.delete.mutate({ id: ruleId });
          logger.info(`✅ 规则已删除: ${ruleId}`);
        } catch (error) {
          logger.warn(`⚠️  删除规则失败: ${ruleId}`, error);
        }
      }
    }

    // 删除测试更新
    if (ctx.updateIds && ctx.updateIds.length > 0) {
      logger.info('\n🗑️  删除测试更新');
      logger.info('-'.repeat(60));

      for (const updateId of ctx.updateIds) {
        try {
          await manage.updates.delete.mutate({ id: updateId });
          logger.info(`✅ 更新已删除: ${updateId}`);
        } catch (error) {
          logger.warn(`⚠️  删除更新失败: ${updateId}`, error);
        }
      }
    }

    // 重置测试上下文
    logger.info('\n📝 重置测试上下文');
    logger.info('-'.repeat(60));

    await resetTestContext(['updateIds', 'testUpdateId', 'ruleIds']);

    logger.info('✅ 测试上下文已重置');

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 清理完成！');
    logger.info('='.repeat(60));

    logger.info('\n💡 提示: 测试环境已重置，可以重新运行测试');
  } catch (error) {
    logger.error('❌ 清理失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
