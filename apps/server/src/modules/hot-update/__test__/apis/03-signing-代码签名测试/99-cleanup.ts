/**
 * 代码签名测试 - 清理测试数据
 *
 * 测试内容：
 * - 删除测试 Channel
 * - 清除测试上下文
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/03-signing-代码签名测试/99-cleanup.ts
 */

import { rmSync } from 'node:fs';
import {
  createTestLogger,
  loadTestContext,
  loginAsAdmin,
  TEST_CONTEXT_FILE,
} from '../_shared';

const logger = createTestLogger('Signing:99-Cleanup');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🧹 代码签名测试 - 清理测试数据');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken) {
      logger.warn('⚠️ 没有找到测试上下文，可能已经清理');
      return;
    }

    logger.info('\n🔍 读取测试上下文...');
    logger.info('-'.repeat(60));
    logger.info(`Channel ID: ${ctx.channelId ?? '(无)'}`);
    logger.info(`Update IDs: ${ctx.updateIds?.join(', ') ?? '(无)'}`);

    if (ctx.channelId) {
      logger.info('\n🗑️  删除测试 Channel...');

      try {
        const { client } = await loginAsAdmin(logger);
        await client.hotUpdate.manage.channels.delete.mutate({
          id: ctx.channelId,
        });
        logger.info(`✅ Channel ${ctx.channelId} 已删除`);
      } catch (error) {
        logger.warn(`⚠️  删除 Channel 失败: ${error}`);
      }
    }

    logger.info('\n🧹 清除测试上下文文件...');
    try {
      rmSync(TEST_CONTEXT_FILE, { force: true });
      logger.info('✅ 上下文文件已删除');
    } catch {
      logger.warn('⚠️  上下文文件删除失败');
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 清理完成！');
    logger.info('='.repeat(60));
  } catch (error) {
    logger.error('❌ 清理失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('清理执行失败:', err);
  process.exit(1);
});
