/**
 * 指令测试 - 步骤 01: 创建 rollBackToEmbedded 指令
 *
 * 测试内容：
 * - 使用管理 API 创建回滚指令
 * - 验证指令创建成功
 * - 验证指令详情正确
 * - 验证通过渠道查询指令列表
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/06-directive-指令测试/01-create-directive.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Directive:01-CreateDirective');

async function main() {
  logger.info('='.repeat(60));
  logger.info('📜 指令测试 - 步骤 01: 创建 rollBackToEmbedded 指令');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId || !ctx.channelKey) {
      throw new Error('测试上下文不完整，请先运行 00-setup.ts');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 1. 创建 rollBackToEmbedded 指令
    logger.info('\n📝 步骤 1: 创建回滚指令');
    logger.info('-'.repeat(60));
    logger.info(`Channel ID: ${ctx.channelId}`);
    logger.info(`Runtime Version: 1.0.0`);

    const directive =
      await manage.directives.createRollBackToEmbedded.mutate({
        channelId: ctx.channelId,
        runtimeVersion: '1.0.0',
        // expiresAt 不设置，表示永久有效
      });

    logger.info('✅ 指令创建成功');
    logger.info(`  - Directive ID: ${directive.id}`);
    logger.info(`  - Type: ${directive.type}`);
    logger.info(`  - Is Active: ${directive.isActive}`);
    logger.info(`  - Runtime Version: ${directive.runtimeVersion}`);

    // 2. 验证通过 ID 查询指令详情
    logger.info('\n📝 步骤 2: 验证指令详情');
    logger.info('-'.repeat(60));

    const directiveDetail = await manage.directives.byId.query({
      id: directive.id,
    });

    if (!directiveDetail) {
      throw new Error('指令查询失败：返回为空');
    }

    if (directiveDetail.type !== 'rollBackToEmbedded') {
      throw new Error(
        `指令类型错误：期望 rollBackToEmbedded，实际 ${directiveDetail.type}`
      );
    }

    if (!directiveDetail.isActive) {
      throw new Error('指令状态错误：期望 isActive 为 true');
    }

    logger.info('✅ 指令详情验证通过');
    logger.info(`  - ID: ${directiveDetail.id}`);
    logger.info(`  - Type: ${directiveDetail.type}`);
    logger.info(`  - Channel ID: ${directiveDetail.channelId}`);
    logger.info(
      `  - Runtime Version: ${directiveDetail.runtimeVersion}`
    );
    logger.info(`  - Is Active: ${directiveDetail.isActive}`);
    logger.info(`  - Created At: ${directiveDetail.createdAt}`);

    // 3. 验证通过渠道查询指令列表
    logger.info('\n📝 步骤 3: 验证渠道指令列表');
    logger.info('-'.repeat(60));

    const directives = await manage.directives.listByChannel.query({
      channelId: ctx.channelId,
    });

    const foundDirective = directives.find(
      d => d.id === directive.id
    );
    if (!foundDirective) {
      throw new Error('指令未出现在渠道指令列表中');
    }

    logger.info(`✅ 渠道指令列表验证通过`);
    logger.info(`  - 总指令数: ${directives.length}`);
    logger.info(
      `  - 指令列表: ${directives
        .map(d => `${d.type}(${d.isActive ? '激活' : '停用'})`)
        .join(', ')}`
    );

    // 4. 验证通过运行时版本查询激活指令
    logger.info('\n📝 步骤 4: 验证激活指令查询');
    logger.info('-'.repeat(60));

    const activeDirective =
      await manage.directives.activeDirective.query({
        channelId: ctx.channelId,
        runtimeVersion: '1.0.0',
      });

    if (!activeDirective) {
      throw new Error('未找到激活的指令');
    }

    if (activeDirective.id !== directive.id) {
      throw new Error('激活指令 ID 不匹配');
    }

    logger.info('✅ 激活指令查询验证通过');
    logger.info(`  - Active Directive ID: ${activeDirective.id}`);
    logger.info(`  - Type: ${activeDirective.type}`);

    // 保存指令 ID 到上下文
    await saveTestContext({ directiveId: directive.id });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 指令创建测试通过！');
    logger.info('='.repeat(60));

    logger.info('\n📊 测试结果汇总:');
    logger.info('  - ✅ rollBackToEmbedded 指令创建成功');
    logger.info('  - ✅ 指令详情查询正确');
    logger.info('  - ✅ 渠道指令列表包含新指令');
    logger.info('  - ✅ 激活指令查询正确');

    logger.info('\n💡 提示: 现在可以验证客户端收到指令');
  } catch (error) {
    logger.error('❌ 指令创建测试失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
