/**
 * 步骤 05: 清理测试数据
 *
 * 清理测试过程中创建的更新、规则等数据
 * 保留 Demo 组织、项目、渠道等基础数据
 */

import fs from 'node:fs';
import {
  API_URL,
  clearTestContext,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
} from '../apis/_shared';

const logger = createTestLogger('05-Cleanup');

async function runCleanup() {
  logger.info('==================================================');
  logger.info('🧹 步骤 05: 清理测试数据');
  logger.info('==================================================');

  // 加载测试上下文
  const context = await loadTestContext();
  if (!context.accessToken || !context.channelId) {
    logger.warn('未找到完整测试上下文，无需清理');
    return;
  }

  const client = createClient(API_URL, {
    token: context.accessToken,
  });
  const manage = getManageApi(client);

  // 1. 删除灰度规则（按 updateId 批量删除）
  logger.info('1. 删除灰度规则...');
  let deletedRulesCount = 0;
  try {
    // 遍历所有保存的更新 ID，删除其关联规则
    const updateIds = context.updateIds ?? [];
    for (const updateId of updateIds) {
      await manage.rolloutRules.deleteByUpdate.mutate({ updateId });
      deletedRulesCount++;
    }
    logger.info('✅ 灰度规则已清理', {
      updateCount: updateIds.length,
    });
  } catch (error) {
    logger.error('清理规则失败', { error });
  }

  // 2. 删除测试更新
  logger.info('2. 删除测试更新...');
  try {
    const updates = await manage.updates.listByChannel.query({
      channelId: context.channelId,
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

  // 3. 清除测试上下文
  logger.info('3. 清除测试上下文...');
  try {
    await clearTestContext();
    logger.info('✅ 上下文已清除');
  } catch (error) {
    logger.error('清除上下文失败', { error });
  }

  // 4. 删除临时 Bundle 文件
  logger.info('4. 删除临时 Bundle 文件...');
  try {
    const bundlePath = '/tmp/test-bundle.zip';
    if (fs.existsSync(bundlePath)) {
      fs.unlinkSync(bundlePath);
      logger.info('✅ Bundle 文件已删除');
    }
  } catch (error) {
    logger.error('删除 Bundle 文件失败', { error });
  }

  logger.info('');
  logger.info('==================================================');
  logger.info('✅ 步骤 05 完成！测试数据已清理');
  logger.info('==================================================');
  logger.info(
    '所有测试完成！可重新运行: bun run src/modules/hot-update/__test__/api/00-login-and-get-data.ts'
  );
}

runCleanup().catch(console.error);
