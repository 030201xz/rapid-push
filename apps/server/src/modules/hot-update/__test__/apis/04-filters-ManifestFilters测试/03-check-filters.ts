/**
 * Manifest Filters - 步骤 03: 检查过滤器响应头
 *
 * 测试内容：
 * - 请求 manifest 接口
 * - 验证 expo-manifest-filters 响应头
 * - 验证 SFV 格式正确性
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/04-filters/03-check-filters.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  loadTestContext,
} from '../_shared';

const logger = createTestLogger('Filters:03-Check');

/**
 * 解析 SFV (Structured Field Values) 字典格式
 * 格式: key1=value1, key2=value2
 */
function parseSFVDictionary(header: string): Record<string, string> {
  const result: Record<string, string> = {};

  const pairs = header.split(',').map(s => s.trim());
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(s => s.trim());
    if (key && value) {
      // 移除引号
      result[key] = value.replace(/^"|"$/g, '');
    }
  }

  return result;
}

async function main() {
  logger.info('='.repeat(60));
  logger.info('🔍 Manifest Filters - 步骤 03: 检查过滤器响应头');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.testUpdateId || !ctx.testMetadata || !ctx.channelId) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    // 请求 Manifest API
    logger.info('\n🌐 请求 Manifest API');
    logger.info('-'.repeat(60));

    // 使用 tRPC 客户端调用
    const client = createClient(API_URL);
    const protocol = client.hotUpdate.protocol;

    // 注意：我们需要知道渠道的 channelKey 而不是 channelId
    // 从上下文中获取
    if (!ctx.channelKey) {
      throw new Error('缺少 channelKey，请检查 00-setup.ts');
    }

    logger.info('请求参数:', {
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'android',
    });

    const response = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'android',
    });

    logger.info(`响应类型: ${response.type}`);

    if (response.type !== 'updateAvailable') {
      throw new Error(`期望 updateAvailable，得到: ${response.type}`);
    }

    // 检查 manifestFilters 字段
    logger.info('\n📋 检查 Manifest Filters');
    logger.info('-'.repeat(60));

    if (!response.manifestFilters) {
      throw new Error('响应中未找到 manifestFilters 字段');
    }

    logger.info(
      'Manifest Filters (SFV 格式):',
      response.manifestFilters
    );

    // 解析 SFV 格式
    logger.info('\n🔍 解析 SFV 格式');
    logger.info('-'.repeat(60));

    const filters = parseSFVDictionary(response.manifestFilters);
    logger.info('解析结果:', filters);

    // 验证过滤器值
    logger.info('\n✅ 验证过滤器值');
    logger.info('-'.repeat(60));

    const expectedFilters = {
      branch: ctx.testMetadata.branch,
      environment: ctx.testMetadata.environment,
      releaseChannel: ctx.testMetadata.releaseChannel,
    };

    let allMatch = true;
    for (const [key, expected] of Object.entries(expectedFilters)) {
      const actual = filters[key];
      const match = actual === expected;

      logger.info(
        `${match ? '✅' : '❌'} ${key}: ${actual} ${
          match ? '===' : '!=='
        } ${expected}`
      );

      if (!match) allMatch = false;
    }

    if (!allMatch) {
      throw new Error('过滤器值不匹配！');
    }

    // 验证 Manifest 内容
    logger.info('\n📄 检查 Manifest 内容');
    logger.info('-'.repeat(60));

    const manifest = response.manifest;
    logger.info('Manifest ID:', manifest.id);
    logger.info('Runtime Version:', manifest.runtimeVersion);

    if (manifest.id !== ctx.testUpdateId) {
      throw new Error(
        `Manifest ID 不匹配: ${manifest.id} !== ${ctx.testUpdateId}`
      );
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ Manifest Filters 验证通过！');
    logger.info('='.repeat(60));

    logger.info('\n测试结果:');
    logger.info(`  - Update ID: ${manifest.id}`);
    logger.info(`  - Runtime Version: ${manifest.runtimeVersion}`);
    logger.info('  - Filters:', filters);

    logger.info(
      '\n💡 协议符合度提升: Manifest Filters 功能正常工作！'
    );
  } catch (error) {
    logger.error('❌ 检查失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
