/**
 * 回滚测试 - 步骤 04: 验证回滚指令
 *
 * 测试内容：
 * - 客户端检查更新时，应该收到 rollBackToEmbedded 指令
 * - 验证回滚指令类型正确
 * - 注意：rollBackToEmbedded 是回滚到应用的原生嵌入版本
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/02-rollback-回滚测试/04-check-directive.ts
 */

import {
  createAnonymousClient,
  createTestLogger,
  loadTestContext,
} from '../_shared';

const logger = createTestLogger('Rollback:04-CheckDirective');

async function main() {
  logger.info('='.repeat(60));
  logger.info('✅ 回滚测试 - 步骤 04: 验证回滚指令');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (
      !ctx.accessToken ||
      !ctx.channelKey ||
      !ctx.rollbackDirectiveId
    ) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    logger.info('\n🔍 模拟客户端检查更新');
    logger.info('-'.repeat(60));
    logger.info(`Channel Key: ${ctx.channelKey}`);
    logger.info(`Directive ID: ${ctx.rollbackDirectiveId}`);

    const client = createAnonymousClient();
    const checkResult =
      await client.hotUpdate.protocol.manifest.check.query({
        channelKey: ctx.channelKey,
        runtimeVersion: '1.0.0',
        platform: 'android',
      });

    logger.info('\n📦 响应结果:');
    logger.info(JSON.stringify(checkResult, null, 2));

    if (!checkResult.type) {
      throw new Error('响应格式错误：缺少 type 字段');
    }

    if (checkResult.type !== 'rollback') {
      throw new Error(
        `期望收到 rollback 指令，实际收到: ${checkResult.type}`
      );
    }

    if (checkResult.type === 'rollback') {
      const { directive } = checkResult;

      if (!directive) {
        throw new Error('rollback 响应缺少 directive 信息');
      }

      if (!directive.type) {
        throw new Error('指令缺少 type 字段');
      }

      if (directive.type !== 'rollBackToEmbedded') {
        throw new Error(
          `期望指令类型为 rollBackToEmbedded，实际收到: ${directive.type}`
        );
      }

      logger.info('\n' + '='.repeat(60));
      logger.info('✅ 回滚指令验证通过！');
      logger.info('='.repeat(60));

      logger.info('\n✅ 验证结果:');
      logger.info(`  - Response Type: ${checkResult.type}`);
      logger.info(`  - Directive Type: ${directive.type}`);
      logger.info(
        `  - Directive Parameters: ${JSON.stringify(
          directive.parameters ?? {}
        )}`
      );
      logger.info(
        `  - Directive Extra: ${JSON.stringify(
          directive.extra ?? {}
        )}`
      );

      logger.info('\n💡 测试结论:');
      logger.info('  - ✅ 回滚指令正确生效');
      logger.info('  - ✅ 指令类型正确 (rollBackToEmbedded)');
      logger.info('  - ✅ 客户端会收到回滚到嵌入版本的通知');
      logger.info('\n⚠️ 说明:');
      logger.info(
        '  - rollBackToEmbedded: 回滚到应用原生包中的嵌入版本'
      );
      logger.info('  - 客户端收到此指令后会清除热更新缓存');
      logger.info('  - 应用将使用原生包中的 Bundle 版本');
    }
  } catch (error) {
    logger.error('❌ 回滚指令验证失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
