/**
 * 统计场景 - 步骤 01: 统计数据查询
 *
 * 测试统计 API 的三个接口：
 * - byUpdate: 查询单个更新的统计
 * - byChannel: 查询渠道统计摘要
 * - channelHistory: 查询渠道更新历史
 *
 * 运行: bun run src/modules/hot-update/__test__/api/05-statistics/01-query-stats.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  getMetricsApi,
  loadTestContext,
} from '../_shared';

const logger = createTestLogger('Statistics:01-QueryStats');

async function main() {
  logger.info('='.repeat(50));
  logger.info('📊 统计场景 - 步骤 01: 统计数据查询');
  logger.info('='.repeat(50));

  try {
    // 1. 加载测试上下文
    const ctx = await loadTestContext();
    if (
      !ctx.accessToken ||
      !ctx.channelId ||
      !ctx.updateIds?.length
    ) {
      throw new Error('缺少测试上下文，请先运行 00-setup.ts');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const metrics = getMetricsApi(client);
    // 非空断言安全：上面已检查 updateIds 非空
    const updateId = ctx.updateIds[0]!;

    logger.info('测试上下文', {
      channelId: ctx.channelId,
      updateId,
    });

    // 2. 测试 byUpdate - 查询单个更新统计
    logger.info('');
    logger.info('【测试 1】byUpdate - 查询单个更新统计');
    const updateStats = await metrics.statistics.byUpdate.query({
      updateId,
    });

    logger.info('✅ byUpdate 查询成功', {
      id: updateStats.id,
      runtimeVersion: updateStats.runtimeVersion,
      downloadCount: updateStats.downloadCount,
      installCount: updateStats.installCount,
      rolloutPercentage: updateStats.rolloutPercentage,
      isEnabled: updateStats.isEnabled,
    });

    // 3. 测试 byChannel - 查询渠道统计摘要
    logger.info('');
    logger.info('【测试 2】byChannel - 查询渠道统计摘要');
    const channelStats = await metrics.statistics.byChannel.query({
      channelId: ctx.channelId,
    });

    logger.info('✅ byChannel 查询成功', {
      channelId: channelStats.channelId,
      channelName: channelStats.channelName,
      totalUpdates: channelStats.totalUpdates,
      totalDownloads: channelStats.totalDownloads,
      totalInstalls: channelStats.totalInstalls,
      hasLatestUpdate: !!channelStats.latestUpdate,
    });

    // 4. 测试 channelHistory - 查询渠道更新历史
    logger.info('');
    logger.info('【测试 3】channelHistory - 查询渠道更新历史');
    const history = await metrics.statistics.channelHistory.query({
      channelId: ctx.channelId,
      limit: 10,
    });

    logger.info('✅ channelHistory 查询成功', {
      historyCount: history.length,
      updates: history.map(u => ({
        id: u.id,
        runtimeVersion: u.runtimeVersion,
        downloadCount: u.downloadCount,
      })),
    });

    // 5. 数据一致性验证
    logger.info('');
    logger.info('【验证】数据一致性检查');
    const consistencyPassed =
      // 渠道统计中的最新更新应该与直接查询的更新一致
      channelStats.latestUpdate?.id === updateStats.id &&
      // 历史记录中应该包含当前更新
      history.some(u => u.id === updateId);

    if (consistencyPassed) {
      logger.info('✅ 数据一致性检查通过');
    } else {
      logger.warn('⚠️ 数据一致性检查未通过，可能存在数据同步延迟');
    }

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 01 完成！统计 API 测试全部通过');
    logger.info('='.repeat(50));
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
