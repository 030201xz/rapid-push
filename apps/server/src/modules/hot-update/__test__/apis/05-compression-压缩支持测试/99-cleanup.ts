/**
 * 压缩支持测试 - 步骤 99: 清理测试数据
 *
 * 测试内容：
 * - 删除测试渠道
 * - 清理测试上下文文件
 * - 清理临时资源文件
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/05-compression-压缩支持测试/99-cleanup.ts
 */

import { rmSync } from 'node:fs';
import {
  createTestLogger,
  getManageApi,
  loadTestContext,
  loginAsAdmin,
  TEST_CONTEXT_FILE,
} from '../_shared';

const logger = createTestLogger('Compression:99-Cleanup');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🧹 压缩支持测试 - 清理测试数据');
  logger.info('='.repeat(60));

  try {
    // 加载测试上下文
    logger.info('\n🔍 读取测试上下文...');
    logger.info('-'.repeat(60));

    const ctx = await loadTestContext();

    if (!ctx.channelId) {
      logger.info('ℹ️  没有需要清理的数据');
      return;
    }

    logger.info(`Channel ID: ${ctx.channelId}`);
    if (ctx.updateIds?.length) {
      logger.info(`Update IDs: ${ctx.updateIds.join(', ')}`);
    }

    // 登录获取授权客户端
    logger.info('\n🗑️  删除测试 Channel...');

    const { client } = await loginAsAdmin(logger);
    const manage = getManageApi(client);

    try {
      await manage.channels.delete.mutate({ id: ctx.channelId });
      logger.info(`✅ Channel ${ctx.channelId} 已删除`);
    } catch (error) {
      logger.warn(`⚠️  删除 Channel 失败（可能已删除）: ${error}`);
    }

    // 清理测试上下文文件
    logger.info('\n🧹 清除测试上下文文件...');
    try {
      rmSync(TEST_CONTEXT_FILE, { force: true });
      logger.info('✅ 上下文文件已删除');
    } catch {
      logger.info('ℹ️  上下文文件不存在或已删除');
    }

    // 清理临时资源文件
    logger.info('\n🧹 清除临时文件...');
    try {
      rmSync('/tmp/rapid-s-compression-test', {
        recursive: true,
        force: true,
      });
      rmSync('/tmp/rapid-s-compression-test.zip', { force: true });
      rmSync('/tmp/rapid-s-compression-test-hash.json', {
        force: true,
      });
      logger.info('✅ 临时文件已删除');
    } catch {
      logger.info('ℹ️  临时文件不存在或已删除');
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
  logger.error('测试执行失败:', err);
  process.exit(1);
});
