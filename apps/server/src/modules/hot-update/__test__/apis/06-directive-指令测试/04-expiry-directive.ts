/**
 * 指令测试 - 步骤 04: 测试指令过期功能
 *
 * 测试内容：
 * - 创建带过期时间的指令
 * - 验证未过期时客户端收到指令
 * - 验证过期后客户端不再收到指令
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/06-directive-指令测试/04-expiry-directive.ts
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
} from '../_shared';

const logger = createTestLogger('Directive:04-ExpiryDirective');

/** 等待指定毫秒数 */
const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  logger.info('='.repeat(60));
  logger.info('📜 指令测试 - 步骤 04: 测试指令过期功能');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId || !ctx.channelKey) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 1. 创建带过期时间的指令（5 秒后过期）
    logger.info('\n📝 步骤 1: 创建带过期时间的指令');
    logger.info('-'.repeat(60));

    const expirySeconds = 5;
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    logger.info(`当前时间: ${new Date().toISOString()}`);
    logger.info(`过期时间: ${expiresAt.toISOString()}`);
    logger.info(`过期秒数: ${expirySeconds}s`);

    // 使用 runtimeVersion 2.0.0 避免与之前测试冲突
    const directive =
      await manage.directives.createRollBackToEmbedded.mutate({
        channelId: ctx.channelId,
        runtimeVersion: '2.0.0',
        expiresAt,
      });

    logger.info('✅ 带过期时间的指令已创建');
    logger.info(`  - ID: ${directive.id}`);
    logger.info(`  - Type: ${directive.type}`);
    logger.info(`  - Expires At: ${directive.expiresAt}`);

    // 保存新指令 ID
    await saveTestContext({ directiveId: directive.id });

    // 2. 验证未过期时客户端收到指令
    logger.info('\n📝 步骤 2: 验证未过期时客户端收到指令');
    logger.info('-'.repeat(60));

    const anonymousClient = createAnonymousClient();
    const protocol = getProtocolApi(anonymousClient);

    const checkResult1 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '2.0.0',
      platform: 'android',
      deviceId: 'directive-expiry-test-001',
    });

    logger.info('\n📦 响应结果:');
    logger.info(JSON.stringify(checkResult1, null, 2));

    if (checkResult1.type !== 'rollback') {
      throw new Error(
        `未过期时应收到 rollback，实际: ${checkResult1.type}`
      );
    }

    logger.info('✅ 未过期时客户端正确收到 rollback 指令');

    // 3. 等待指令过期
    logger.info('\n📝 步骤 3: 等待指令过期');
    logger.info('-'.repeat(60));
    logger.info(`等待 ${expirySeconds + 1} 秒...`);

    // 显示倒计时
    for (let i = expirySeconds + 1; i > 0; i--) {
      logger.info(`  ⏳ ${i}s 剩余...`);
      await sleep(1000);
    }

    logger.info('✅ 等待完成');

    // 4. 验证过期后客户端不再收到指令
    logger.info('\n📝 步骤 4: 验证过期后客户端不再收到指令');
    logger.info('-'.repeat(60));

    const checkResult2 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '2.0.0',
      platform: 'android',
      deviceId: 'directive-expiry-test-002',
    });

    logger.info('\n📦 响应结果:');
    logger.info(JSON.stringify(checkResult2, null, 2));

    if (checkResult2.type === 'rollback') {
      throw new Error('指令过期后不应收到 rollback 指令');
    }

    logger.info(`✅ 过期后客户端响应: ${checkResult2.type}`);

    // 5. 验证指令仍存在但不激活
    logger.info('\n📝 步骤 5: 验证指令记录状态');
    logger.info('-'.repeat(60));

    const directiveAfter = await manage.directives.byId.query({
      id: directive.id,
    });

    if (!directiveAfter) {
      logger.info('ℹ️  指令记录已被清理');
    } else {
      logger.info('✅ 指令记录仍存在');
      logger.info(`  - ID: ${directiveAfter.id}`);
      logger.info(`  - Is Active: ${directiveAfter.isActive}`);
      logger.info(`  - Expires At: ${directiveAfter.expiresAt}`);

      // 验证激活指令查询返回空
      const activeDirective =
        await manage.directives.activeDirective.query({
          channelId: ctx.channelId,
          runtimeVersion: '2.0.0',
        });

      if (activeDirective) {
        throw new Error('过期指令不应出现在激活指令查询中');
      }

      logger.info('✅ 激活指令查询正确返回空');
    }

    // 6. 清理：删除测试指令
    logger.info('\n📝 步骤 6: 清理测试指令');
    logger.info('-'.repeat(60));

    await manage.directives.delete.mutate({ id: directive.id });
    logger.info('✅ 测试指令已删除');

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 指令过期功能测试通过！');
    logger.info('='.repeat(60));

    logger.info('\n📊 测试结果汇总:');
    logger.info('  - ✅ 创建带过期时间的指令成功');
    logger.info('  - ✅ 未过期时客户端收到指令');
    logger.info('  - ✅ 过期后客户端不再收到指令');
    logger.info('  - ✅ 过期机制正确生效');

    logger.info('\n💡 说明:');
    logger.info('  - expiresAt 支持设置指令的有效期');
    logger.info('  - 过期后指令自动失效，无需手动停用');
    logger.info('  - 适用于临时性回滚场景');

    logger.info('\n💡 提示: 现在可以运行清理脚本');
  } catch (error) {
    logger.error('❌ 指令过期功能测试失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
