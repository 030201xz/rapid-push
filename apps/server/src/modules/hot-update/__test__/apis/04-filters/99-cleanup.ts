/**
 * Manifest Filters - 步骤 99: 清理测试数据
 *
 * 测试内容：
 * - 删除测试更新
 * - 清理测试渠道配置
 * - 重置测试上下文
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/04-filters/99-cleanup.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
  resetTestContext,
} from '../../api/_shared';

const logger = createTestLogger('Filters:99-Cleanup');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🧹 Manifest Filters - 步骤 99: 清理测试数据');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.testUpdateId) {
      logger.warn('⚠️  没有需要清理的测试数据');
      return;
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 删除测试更新
    if (ctx.testUpdateId) {
      logger.info('\n🗑️  删除测试更新');
      logger.info('-'.repeat(60));

      try {
        await manage.updates.delete.mutate({
          id: ctx.testUpdateId,
        });

        logger.info(`✅ 更新已删除: ${ctx.testUpdateId}`);
      } catch (error) {
        logger.warn('⚠️  删除更新失败:', error);
      }
    }

    // 重置测试上下文中的特定字段
    logger.info('\n📝 重置测试上下文');
    logger.info('-'.repeat(60));

    // 保留基础信息，清除测试特定数据
    await resetTestContext([
      'testUpdateId',
      'testMetadata',
      'filterKeys',
    ]);

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
  logger.error('清理执行失败:', err);
  process.exit(1);
});
