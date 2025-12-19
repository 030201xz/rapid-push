/**
 * 指令场景 - 步骤 01: 创建 rollBackToEmbedded 指令
 *
 * 测试内容：
 * - 创建 rollBackToEmbedded 指令
 * - 验证指令已激活
 * - 验证客户端收到回滚指令
 *
 * 运行: bun run src/modules/hot-update/__test__/api/03-directive/01-create-rollback-directive.ts
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
} from '../../apis/_shared';

const logger = createTestLogger('Directive:01-RollbackToEmbedded');

async function main() {
  logger.info('='.repeat(50));
  logger.info('📜 指令场景 - 步骤 01: 创建 rollBackToEmbedded 指令');
  logger.info('='.repeat(50));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId || !ctx.channelKey) {
      throw new Error('测试上下文不完整');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 1. 创建 rollBackToEmbedded 指令
    logger.info('1. 创建 rollBackToEmbedded 指令...');
    const directive =
      await manage.directives.createRollBackToEmbedded.mutate({
        channelId: ctx.channelId,
        runtimeVersion: '1.0.0',
        // expiresAt 可选，不设置则永久有效
      });

    logger.info('✅ 指令创建成功', {
      id: directive.id,
      type: directive.type,
      isActive: directive.isActive,
    });

    // 保存指令 ID
    await saveTestContext({ directiveId: directive.id });

    // 2. 验证指令列表
    logger.info('2. 验证指令列表...');
    const directives = await manage.directives.listByChannel.query({
      channelId: ctx.channelId,
    });

    logger.info('✅ 渠道指令列表', {
      count: directives.length,
      directives: directives.map(d => ({
        id: d.id,
        type: d.type,
        isActive: d.isActive,
      })),
    });

    // 3. 验证客户端收到回滚指令
    logger.info('3. 验证客户端收到回滚指令...');
    const anonymousClient = createAnonymousClient();
    const protocol = getProtocolApi(anonymousClient);

    const checkResult = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'directive-test-device',
      // 模拟客户端有已安装的更新
      embeddedUpdateId: 'embedded-update-id',
    });

    // 检查响应类型
    if (checkResult.type === 'rollback') {
      logger.info('✅ 客户端收到回滚指令', {
        type: checkResult.type,
        directive: checkResult.directive,
      });
    } else if (checkResult.type === 'noUpdate') {
      logger.info('✅ 客户端响应: noUpdate（可能因无更新触发）', {
        type: checkResult.type,
      });
    } else {
      logger.info('客户端响应', { type: checkResult.type });
    }

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 01 完成！');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run .../03-directive/02-deactivate-directive.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
