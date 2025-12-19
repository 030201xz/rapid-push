/**
 * 基础工作流 - 步骤 99: 清理测试数据
 *
 * 清理内容：
 * - 删除测试创建的更新
 * - 清除测试上下文
 * - 删除临时文件
 *
 * 运行: bun run src/modules/hot-update/__test__/api/00-basic-workflow/99-cleanup.ts
 */

import fs from 'node:fs';
import {
  API_URL,
  clearTestContext,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
} from '../../apis/_shared';

const logger = createTestLogger('Basic:99-Cleanup');

async function main() {
  logger.info('='.repeat(50));
  logger.info('🧹 基础工作流 - 步骤 99: 清理测试数据');
  logger.info('='.repeat(50));

  // 加载测试上下文
  const ctx = await loadTestContext();
  if (!ctx.accessToken || !ctx.channelId) {
    logger.warn('未找到完整测试上下文，跳过清理');
    return;
  }

  const client = createClient(API_URL, { token: ctx.accessToken });
  const manage = getManageApi(client);

  // 1. 删除测试更新
  logger.info('1. 删除测试更新...');
  try {
    const updates = await manage.updates.listByChannel.query({
      channelId: ctx.channelId,
    });

    for (const update of updates) {
      // 先禁用再删除
      if (update.isEnabled) {
        await manage.updates.updateSettings.mutate({
          id: update.id,
          isEnabled: false,
        });
      }
      await manage.updates.delete.mutate({ id: update.id });
    }
    logger.info('✅ 更新已清理', { count: updates.length });
  } catch (error) {
    logger.error('清理更新失败', { error });
  }

  // 2. 清除测试上下文
  logger.info('2. 清除测试上下文...');
  try {
    await clearTestContext();
    logger.info('✅ 上下文已清除');
  } catch (error) {
    logger.error('清除上下文失败', { error });
  }

  // 3. 删除临时 Bundle 文件
  logger.info('3. 删除临时文件...');
  const tempFiles = ['/tmp/rapid-s-test-bundle.zip'];
  for (const filePath of tempFiles) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`✅ 已删除: ${filePath}`);
      }
    } catch {
      // 忽略
    }
  }

  logger.info('');
  logger.info('='.repeat(50));
  logger.info('✅ 步骤 99 完成！基础工作流测试数据已清理');
  logger.info('='.repeat(50));
}

main().catch(console.error);
