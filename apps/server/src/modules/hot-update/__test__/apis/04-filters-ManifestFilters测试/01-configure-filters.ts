/**
 * Manifest Filters - 步骤 01: 配置过滤器键
 *
 * 测试内容：
 * - 更新渠道配置，设置 manifestFilterKeys
 * - 指定哪些 metadata 字段应作为过滤器
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/04-filters/01-configure-filters.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
  saveTestContext,
} from '../../api/_shared';

const logger = createTestLogger('Filters:01-Configure');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🎯 Manifest Filters - 步骤 01: 配置过滤器键');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不完整，请先运行 00-setup.ts');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 配置 manifestFilterKeys
    logger.info('\n📝 配置 Manifest Filter Keys');
    logger.info('-'.repeat(60));

    const filterKeys = ['branch', 'environment', 'releaseChannel'];

    logger.info('设置过滤器键:', filterKeys);

    // 使用 API 更新渠道的 manifestFilterKeys
    const updatedChannel = await manage.channels.update.mutate({
      id: ctx.channelId,
      manifestFilterKeys: filterKeys,
    });

    if (!updatedChannel) {
      throw new Error('更新渠道失败');
    }

    logger.info('✅ 过滤器键已通过 API 更新');
    logger.info('  更新后的渠道:', {
      id: updatedChannel.id,
      name: updatedChannel.name,
      manifestFilterKeys: updatedChannel.manifestFilterKeys,
    });

    // 保存配置到上下文
    await saveTestContext({ filterKeys });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 过滤器键配置完成！');
    logger.info('='.repeat(60));

    logger.info('\n配置详情:');
    logger.info(`  - Channel ID: ${ctx.channelId}`);
    logger.info(`  - Filter Keys: ${filterKeys.join(', ')}`);

    logger.info('\n💡 提示: 现在可以上传带元数据的更新');
  } catch (error) {
    logger.error('❌ 配置失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
