/**
 * 回滚测试 - 步骤 03: 创建回滚指令
 *
 * 测试内容：
 * - 创建回滚到嵌入版本的指令(rollBackToEmbedded)
 * - 验证回滚指令创建成功
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/02-rollback-回滚测试/03-create-directive.ts
 */

import {
  API_URL,
  createTestLogger,
  loadTestContext,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Rollback:03-CreateDirective');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🔄 回滚测试 - 步骤 03: 创建回滚指令');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    logger.info('\n🔍 准备回滚数据');
    logger.info('-'.repeat(60));
    logger.info(`Channel ID: ${ctx.channelId}`);
    logger.info(`Runtime Version: 1.0.0`);

    logger.info('\n🔄 创建回滚到嵌入版本指令...');
    const createUrl = `${API_URL}/hotUpdate.manage.directives.createRollBackToEmbedded`;
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelId: ctx.channelId,
        runtimeVersion: '1.0.0',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `创建回滚指令失败: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    const directive = result.result?.data;
    if (!directive) {
      throw new Error('创建失败：未返回回滚指令信息');
    }

    logger.info('\n✅ 回滚指令创建成功');
    logger.info(`Directive ID: ${directive.id}`);

    await saveTestContext({ rollbackDirectiveId: directive.id });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 回滚指令创建完成！');
    logger.info('='.repeat(60));

    logger.info('\n回滚指令详情:');
    logger.info(`  - Directive ID: ${directive.id}`);
    logger.info(`  - Type: ${directive.type}`);
    logger.info(`  - Is Active: ${directive.isActive}`);
    logger.info(`  - Runtime Version: ${directive.runtimeVersion}`);

    logger.info('\n💡 说明:');
    logger.info(
      '  - rollBackToEmbedded: 回滚到嵌入版本（应用原生包）'
    );
    logger.info('  - 客户端收到此指令后会清除热更新并使用原生包');
    logger.info('\n💡 提示: 现在可以验证回滚指令');
  } catch (error) {
    logger.error('❌ 创建回滚指令失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
