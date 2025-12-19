/**
 * 指令测试 - 步骤 02: 验证客户端收到指令
 *
 * 测试内容：
 * - 模拟客户端检查更新
 * - 验证收到 rollback 类型响应
 * - 验证指令内容正确
 * - 验证指令优先级（指令优先于更新）
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/06-directive-指令测试/02-verify-directive.ts
 */

import {
  createAnonymousClient,
  createTestLogger,
  getProtocolApi,
  loadTestContext,
} from '../_shared';

const logger = createTestLogger('Directive:02-VerifyDirective');

async function main() {
  logger.info('='.repeat(60));
  logger.info('📜 指令测试 - 步骤 02: 验证客户端收到指令');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.channelKey || !ctx.directiveId) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    logger.info('\n🔍 测试上下文');
    logger.info('-'.repeat(60));
    logger.info(`Channel Key: ${ctx.channelKey}`);
    logger.info(`Directive ID: ${ctx.directiveId}`);
    logger.info(`Update IDs: ${ctx.updateIds?.join(', ') ?? '(无)'}`);

    // 1. 模拟客户端检查更新（无当前更新）
    logger.info('\n📝 步骤 1: 模拟新客户端检查更新');
    logger.info('-'.repeat(60));

    const client = createAnonymousClient();
    const protocol = getProtocolApi(client);

    const checkResult1 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'android',
      deviceId: 'directive-test-device-001',
    });

    logger.info('\n📦 响应结果:');
    logger.info(JSON.stringify(checkResult1, null, 2));

    // 验证响应类型
    if (checkResult1.type !== 'rollback') {
      throw new Error(
        `期望收到 rollback 响应，实际收到: ${checkResult1.type}`
      );
    }

    logger.info('✅ 响应类型正确: rollback');

    // 验证指令内容
    if (checkResult1.type === 'rollback') {
      const { directive } = checkResult1;

      if (!directive) {
        throw new Error('rollback 响应缺少 directive 字段');
      }

      if (directive.type !== 'rollBackToEmbedded') {
        throw new Error(
          `期望指令类型为 rollBackToEmbedded，实际: ${directive.type}`
        );
      }

      logger.info('✅ 指令类型正确: rollBackToEmbedded');
      logger.info(
        `  - Parameters: ${JSON.stringify(
          directive.parameters ?? {}
        )}`
      );
      logger.info(
        `  - Extra: ${JSON.stringify(directive.extra ?? {})}`
      );
    }

    // 2. 模拟已有更新的客户端检查更新
    logger.info('\n📝 步骤 2: 模拟已有更新的客户端');
    logger.info('-'.repeat(60));
    logger.info(`当前 Update ID: ${ctx.updateIds?.[0] ?? '(无)'}`);

    const checkResult2 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'directive-test-device-002',
      currentUpdateId: ctx.updateIds?.[0],
    });

    logger.info('\n📦 响应结果:');
    logger.info(JSON.stringify(checkResult2, null, 2));

    // 即使有当前更新，指令也应该优先返回
    if (checkResult2.type !== 'rollback') {
      throw new Error(
        `指令应优先于更新返回，期望 rollback，实际: ${checkResult2.type}`
      );
    }

    logger.info('✅ 指令优先级验证通过: 指令优先于更新');

    // 3. 验证不匹配 runtimeVersion 时不返回指令
    logger.info('\n📝 步骤 3: 验证不匹配的 runtimeVersion');
    logger.info('-'.repeat(60));
    logger.info('Runtime Version: 2.0.0 (不匹配)');

    const checkResult3 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '2.0.0', // 指令只针对 1.0.0
      platform: 'android',
      deviceId: 'directive-test-device-003',
    });

    logger.info('\n📦 响应结果:');
    logger.info(JSON.stringify(checkResult3, null, 2));

    // 不匹配的 runtimeVersion 应该返回 noUpdate（因为没有 2.0.0 的更新）
    if (checkResult3.type === 'rollback') {
      throw new Error('不匹配的 runtimeVersion 不应收到指令');
    }

    logger.info('✅ runtimeVersion 过滤正确: 不匹配时不返回指令');
    logger.info(`  - 实际响应类型: ${checkResult3.type}`);

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 客户端指令验证测试通过！');
    logger.info('='.repeat(60));

    logger.info('\n📊 测试结果汇总:');
    logger.info('  - ✅ 客户端收到 rollback 响应');
    logger.info('  - ✅ 指令类型为 rollBackToEmbedded');
    logger.info('  - ✅ 指令优先于更新返回');
    logger.info('  - ✅ runtimeVersion 过滤正确');

    logger.info('\n💡 说明:');
    logger.info(
      '  - rollBackToEmbedded 指令让客户端回滚到应用内嵌版本'
    );
    logger.info('  - 客户端收到此指令后应清除已下载的热更新');
    logger.info('  - 指令按 runtimeVersion 精确匹配');

    logger.info('\n💡 提示: 现在可以测试停用指令');
  } catch (error) {
    logger.error('❌ 客户端指令验证失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
