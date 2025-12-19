/**
 * 基础工作流 - 步骤 02: 检查更新
 *
 * 测试内容：
 * - 客户端通过 channelKey 检查更新
 * - 验证返回的 Manifest 结构
 * - 验证更新内容正确
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/00-basic-workflow-基础工作流测试/02-check.ts
 */

import {
  createAnonymousClient,
  createTestLogger,
  getProtocolApi,
  loadTestContext,
} from '../_shared';

const logger = createTestLogger('BasicWorkflow:02-Check');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🔍 基础工作流 - 步骤 02: 检查更新');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.channelKey || !ctx.testUpdateId) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    const client = createAnonymousClient();
    const protocol = getProtocolApi(client);

    // 检查更新
    logger.info('\n🌐 请求 Manifest API');
    logger.info('-'.repeat(60));

    const request = {
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'android' as const,
    };

    logger.info('请求参数:', request);

    const response = await protocol.manifest.check.query(request);

    logger.info(`响应类型: ${response.type}`);

    // 验证响应
    logger.info('\n📋 验证响应内容');
    logger.info('-'.repeat(60));

    if (response.type !== 'updateAvailable') {
      throw new Error(`预期返回更新，实际返回: ${response.type}`);
    }

    const { manifest } = response;

    logger.info('✅ 有更新可用');
    logger.info(`  - Manifest ID: ${manifest.id}`);
    logger.info(`  - Runtime Version: ${manifest.runtimeVersion}`);
    logger.info(`  - Created At: ${manifest.createdAt}`);
    logger.info(`  - Metadata:`, manifest.metadata);

    // 验证更新 ID
    if (manifest.id !== ctx.testUpdateId) {
      throw new Error(
        `更新 ID 不匹配! 预期: ${ctx.testUpdateId}, 实际: ${manifest.id}`
      );
    }

    logger.info('\n✅ 更新 ID 匹配');

    // 验证 assets
    logger.info('\n📦 验证资源清单');
    logger.info('-'.repeat(60));

    if (!manifest.launchAsset) {
      throw new Error('缺少 launchAsset');
    }

    logger.info('Launch Asset:', {
      key: manifest.launchAsset.key,
      contentType: manifest.launchAsset.contentType,
      url: manifest.launchAsset.url,
    });

    logger.info(`✅ 资源清单正确 (${manifest.assets.length} 个资源)`);

    // 验证 metadata
    logger.info('\n📝 验证 Metadata');
    logger.info('-'.repeat(60));

    if (!manifest.metadata) {
      throw new Error('缺少 metadata');
    }

    logger.info('Metadata:', manifest.metadata);
    logger.info('✅ Metadata 存在');

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 检查更新测试通过！');
    logger.info('='.repeat(60));

    logger.info('\n测试结果:');
    logger.info(`  - Update ID: ${manifest.id}`);
    logger.info(`  - Runtime Version: ${manifest.runtimeVersion}`);
    logger.info(`  - Assets Count: ${manifest.assets.length}`);
    logger.info(`  - Has Launch Asset: ${!!manifest.launchAsset}`);
    logger.info(`  - Has Metadata: ${!!manifest.metadata}`);

    logger.info('\n💡 基础工作流核心功能验证完成！');
  } catch (error) {
    logger.error('❌ 检查更新失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
