/**
 * 回滚场景 - 步骤 03: 执行回滚
 *
 * 将版本回滚到 v1 稳定版本
 *
 * 运行: bun run src/modules/hot-update/__test__/api/02-rollback/03-execute-rollback.ts
 */

import {
  API_URL,
  createAnonymousClient,
  createClient,
  createTestLogger,
  getManageApi,
  getProtocolApi,
  loadTestContext,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Rollback:03-Execute');

async function main() {
  logger.info('='.repeat(50));
  logger.info('⏪ 回滚场景 - 步骤 03: 执行回滚');
  logger.info('='.repeat(50));

  try {
    const ctx = await loadTestContext();
    if (
      !ctx.accessToken ||
      !ctx.channelKey ||
      !ctx.updateIds?.length
    ) {
      throw new Error('测试上下文不完整');
    }

    // v1 是第一个更新
    const v1UpdateId = ctx.updateIds[0]!;
    logger.info('回滚目标', { v1UpdateId });

    // 1. 执行回滚
    logger.info('1. 执行回滚到 v1...');
    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    const rollbackResult = await manage.updates.rollback.mutate({
      sourceUpdateId: v1UpdateId,
    });

    logger.info('✅ 回滚操作成功', {
      rollbackUpdateId: rollbackResult.id,
      isRollback: rollbackResult.isRollback,
      description: rollbackResult.description,
    });

    // 保存回滚版本 ID
    const updateIds = ctx.updateIds;
    updateIds.push(rollbackResult.id);
    await saveTestContext({ updateIds });

    // 2. 验证客户端获取到回滚版本
    logger.info('2. 验证客户端获取到回滚版本...');
    const anonymousClient = createAnonymousClient();
    const protocol = getProtocolApi(anonymousClient);

    const checkResult = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'rollback-verify-device',
    });

    if (checkResult.type === 'updateAvailable') {
      const isRollback =
        checkResult.manifest.id === rollbackResult.id;
      logger.info('✅ 回滚验证', {
        currentUpdateId: checkResult.manifest.id,
        rollbackUpdateId: rollbackResult.id,
        matched: isRollback,
      });

      if (!isRollback) {
        throw new Error('客户端未获取到回滚版本');
      }
    }

    // 3. 验证回滚版本详情
    logger.info('3. 验证回滚版本详情...');
    const details = await manage.updates.byId.query({
      id: rollbackResult.id,
    });
    if (details) {
      logger.info('✅ 回滚版本详情', {
        id: details.id,
        isRollback: details.isRollback,
        isEnabled: details.isEnabled,
      });
    }

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 03 完成！回滚成功');
    logger.info('='.repeat(50));
    logger.info('下一步: bun run .../02-rollback/99-cleanup.ts');
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
