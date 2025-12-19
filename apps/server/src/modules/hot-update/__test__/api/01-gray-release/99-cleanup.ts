/**
 * 灰度发布场景 - 步骤 99: 清理测试数据
 *
 * 清理内容：
 * - 删除灰度规则
 * - 删除测试更新
 * - 清除测试上下文
 *
 * 运行: bun run src/modules/hot-update/__test__/api/01-gray-release/99-cleanup.ts
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

const logger = createTestLogger('Gray:99-Cleanup');

async function main() {
  logger.info('='.repeat(50));
  logger.info('🧹 灰度发布场景 - 步骤 99: 清理测试数据');
  logger.info('='.repeat(50));

  const ctx = await loadTestContext();
  if (!ctx.accessToken || !ctx.channelId) {
    logger.warn('未找到完整测试上下文，跳过清理');
    return;
  }

  const client = createClient(API_URL, { token: ctx.accessToken });
  const manage = getManageApi(client);

  // 1. 删除灰度规则（按 updateId 批量删除）
  logger.info('1. 删除灰度规则...');
  try {
    const updateIds = ctx.updateIds ?? [];
    for (const updateId of updateIds) {
      await manage.rolloutRules.deleteByUpdate.mutate({ updateId });
    }
    logger.info('✅ 规则已清理', { updateCount: updateIds.length });
  } catch (error) {
    logger.error('清理规则失败', { error });
  }

  // 2. 删除测试更新
  logger.info('2. 删除测试更新...');
  try {
    const updates = await manage.updates.listByChannel.query({
      channelId: ctx.channelId,
    });

    for (const update of updates) {
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

  // 3. 清除测试上下文
  logger.info('3. 清除测试上下文...');
  await clearTestContext();
  logger.info('✅ 上下文已清除');

  // 4. 清理临时文件
  const tempFiles = ['/tmp/rapid-s-gray-bundle.zip'];
  for (const filePath of tempFiles) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  logger.info('');
  logger.info('='.repeat(50));
  logger.info('✅ 步骤 99 完成！灰度发布测试数据已清理');
  logger.info('='.repeat(50));
}

main().catch(console.error);
