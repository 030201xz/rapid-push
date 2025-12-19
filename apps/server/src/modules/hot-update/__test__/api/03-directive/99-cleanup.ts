/**
 * 指令场景 - 步骤 99: 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/__test__/api/03-directive/99-cleanup.ts
 */

import {
  API_URL,
  clearTestContext,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
} from '../../apis/_shared';

const logger = createTestLogger('Directive:99-Cleanup');

async function main() {
  logger.info('='.repeat(50));
  logger.info('🧹 指令场景 - 步骤 99: 清理测试数据');
  logger.info('='.repeat(50));

  const ctx = await loadTestContext();
  if (!ctx.accessToken || !ctx.channelId) {
    logger.warn('未找到完整测试上下文，跳过清理');
    return;
  }

  const client = createClient(API_URL, { token: ctx.accessToken });
  const manage = getManageApi(client);

  // 1. 删除所有指令
  logger.info('1. 删除所有指令...');
  try {
    const directives = await manage.directives.listByChannel.query({
      channelId: ctx.channelId,
    });

    for (const directive of directives) {
      await manage.directives.delete.mutate({ id: directive.id });
    }
    logger.info('✅ 指令已清理', { count: directives.length });
  } catch (error) {
    logger.error('清理指令失败', { error });
  }

  // 2. 清除测试上下文
  logger.info('2. 清除测试上下文...');
  await clearTestContext();
  logger.info('✅ 上下文已清除');

  logger.info('');
  logger.info('='.repeat(50));
  logger.info('✅ 步骤 99 完成！指令测试数据已清理');
  logger.info('='.repeat(50));
}

main().catch(console.error);
