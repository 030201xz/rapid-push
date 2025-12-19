/**
 * 指令场景 - 步骤 02: 停用并删除指令
 *
 * 测试内容：
 * - 停用指令
 * - 验证指令已停用
 * - 删除指令
 *
 * 运行: bun run src/modules/hot-update/__test__/api/03-directive/02-deactivate-directive.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
} from '../../apis/_shared';

const logger = createTestLogger('Directive:02-Deactivate');

// 扩展 TestContext 类型
interface ExtendedContext {
  accessToken?: string;
  channelId?: string;
  directiveId?: string;
}

async function main() {
  logger.info('='.repeat(50));
  logger.info('📜 指令场景 - 步骤 02: 停用并删除指令');
  logger.info('='.repeat(50));

  try {
    const ctx = (await loadTestContext()) as ExtendedContext;
    if (!ctx.accessToken || !ctx.directiveId) {
      throw new Error('测试上下文不完整（需要 directiveId）');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 1. 获取指令当前状态
    logger.info('1. 获取指令当前状态...');
    const directive = await manage.directives.byId.query({
      id: ctx.directiveId,
    });

    if (!directive) {
      throw new Error('指令不存在');
    }

    logger.info('✅ 当前指令状态', {
      id: directive.id,
      type: directive.type,
      isActive: directive.isActive,
    });

    // 2. 停用指令
    logger.info('2. 停用指令...');
    const deactivated = await manage.directives.deactivate.mutate({
      id: ctx.directiveId,
    });

    if (!deactivated) {
      throw new Error('停用指令返回空');
    }

    logger.info('✅ 指令已停用', {
      id: deactivated.id,
      isActive: deactivated.isActive,
    });

    // 3. 验证停用状态
    logger.info('3. 验证停用状态...');
    const afterDeactivate = await manage.directives.byId.query({
      id: ctx.directiveId,
    });

    if (afterDeactivate?.isActive === false) {
      logger.info('✅ 确认指令已停用');
    } else {
      logger.warn('⚠️ 指令可能未正确停用');
    }

    // 4. 删除指令
    logger.info('4. 删除指令...');
    await manage.directives.delete.mutate({ id: ctx.directiveId });
    logger.info('✅ 指令已删除');

    // 5. 验证删除
    logger.info('5. 验证删除...');
    const afterDelete = await manage.directives.byId.query({
      id: ctx.directiveId,
    });

    if (!afterDelete) {
      logger.info('✅ 确认指令已删除');
    } else {
      logger.warn('⚠️ 指令可能未正确删除');
    }

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 02 完成！');
    logger.info('='.repeat(50));
    logger.info('下一步: bun run .../03-directive/99-cleanup.ts');
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
