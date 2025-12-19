/**
 * 指令测试 - 步骤 03: 停用指令
 *
 * 测试内容：
 * - 停用指令
 * - 验证客户端不再收到指令
 * - 验证客户端恢复收到更新
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/06-directive-指令测试/03-deactivate-directive.ts
 */

import {
  API_URL,
  createAnonymousClient,
  createClient,
  createTestLogger,
  getManageApi,
  getProtocolApi,
  loadTestContext,
} from '../_shared';

const logger = createTestLogger('Directive:03-DeactivateDirective');

async function main() {
  logger.info('='.repeat(60));
  logger.info('📜 指令测试 - 步骤 03: 停用指令');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId || !ctx.directiveId) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 1. 验证指令当前状态
    logger.info('\n📝 步骤 1: 验证指令当前状态');
    logger.info('-'.repeat(60));

    const directiveBefore = await manage.directives.byId.query({
      id: ctx.directiveId,
    });

    if (!directiveBefore) {
      throw new Error('指令不存在');
    }

    logger.info(`Directive ID: ${directiveBefore.id}`);
    logger.info(`Type: ${directiveBefore.type}`);
    logger.info(`Is Active: ${directiveBefore.isActive}`);

    if (!directiveBefore.isActive) {
      logger.warn('⚠️ 指令已处于停用状态');
    } else {
      logger.info('✅ 指令当前为激活状态');
    }

    // 2. 停用指令
    logger.info('\n📝 步骤 2: 停用指令');
    logger.info('-'.repeat(60));

    const deactivatedDirective =
      await manage.directives.deactivate.mutate({
        id: ctx.directiveId,
      });

    if (!deactivatedDirective) {
      throw new Error('停用指令失败：返回为空');
    }

    if (deactivatedDirective.isActive) {
      throw new Error('停用指令失败：isActive 仍为 true');
    }

    logger.info('✅ 指令已停用');
    logger.info(`  - ID: ${deactivatedDirective.id}`);
    logger.info(`  - Is Active: ${deactivatedDirective.isActive}`);

    // 3. 验证激活指令查询返回空
    logger.info('\n📝 步骤 3: 验证激活指令查询');
    logger.info('-'.repeat(60));

    const activeDirective =
      await manage.directives.activeDirective.query({
        channelId: ctx.channelId,
        runtimeVersion: '1.0.0',
      });

    if (activeDirective) {
      throw new Error('停用后不应返回激活指令');
    }

    logger.info('✅ 激活指令查询返回空');

    // 4. 验证客户端不再收到指令
    logger.info('\n📝 步骤 4: 验证客户端响应');
    logger.info('-'.repeat(60));

    const anonymousClient = createAnonymousClient();
    const protocol = getProtocolApi(anonymousClient);

    const checkResult = await protocol.manifest.check.query({
      channelKey: ctx.channelKey!,
      runtimeVersion: '1.0.0',
      platform: 'android',
      deviceId: 'directive-test-deactivate-001',
    });

    logger.info('\n📦 响应结果:');
    logger.info(JSON.stringify(checkResult, null, 2));

    if (checkResult.type === 'rollback') {
      throw new Error('停用后客户端不应收到 rollback 指令');
    }

    logger.info(`✅ 客户端响应类型: ${checkResult.type}`);

    // 停用后应该收到更新（如果有的话）
    if (checkResult.type === 'updateAvailable') {
      logger.info('✅ 客户端恢复收到更新');
      logger.info(`  - Update ID: ${checkResult.manifest.id}`);
    } else if (checkResult.type === 'noUpdate') {
      logger.info('✅ 客户端收到无更新响应（可能已是最新）');
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 停用指令测试通过！');
    logger.info('='.repeat(60));

    logger.info('\n📊 测试结果汇总:');
    logger.info('  - ✅ 指令成功停用');
    logger.info('  - ✅ 激活指令查询返回空');
    logger.info('  - ✅ 客户端不再收到 rollback 指令');
    logger.info(`  - ✅ 客户端响应恢复正常: ${checkResult.type}`);

    logger.info('\n💡 说明:');
    logger.info('  - 停用指令后，指令记录保留但不再生效');
    logger.info('  - 客户端将恢复正常的更新检查流程');

    logger.info('\n💡 提示: 现在可以测试指令过期功能');
  } catch (error) {
    logger.error('❌ 停用指令测试失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
