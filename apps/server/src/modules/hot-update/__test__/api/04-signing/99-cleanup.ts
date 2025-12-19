/**
 * 签名场景 - 步骤 99: 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/__test__/api/04-signing/99-cleanup.ts
 */

import {
  API_URL,
  clearTestContext,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
} from '../_shared';

const logger = createTestLogger('Signing:99-Cleanup');

async function main() {
  logger.info('='.repeat(50));
  logger.info('🧹 签名场景 - 步骤 99: 清理测试数据');
  logger.info('='.repeat(50));

  const ctx = await loadTestContext();
  if (!ctx.accessToken || !ctx.channelId) {
    logger.warn('未找到完整测试上下文，跳过清理');
    return;
  }

  const client = createClient(API_URL, { token: ctx.accessToken });
  const manage = getManageApi(client);

  // 1. 确保签名已禁用
  logger.info('1. 确保签名已禁用...');
  try {
    await manage.channels.disableSigning.mutate({
      id: ctx.channelId,
    });
    logger.info('✅ 签名已禁用');
  } catch (error) {
    logger.warn('禁用签名失败（可能已禁用）', { error });
  }

  // 2. 清除测试上下文
  logger.info('2. 清除测试上下文...');
  await clearTestContext();
  logger.info('✅ 上下文已清除');

  logger.info('');
  logger.info('='.repeat(50));
  logger.info('✅ 步骤 99 完成！签名测试数据已清理');
  logger.info('='.repeat(50));
}

main().catch(console.error);
