/**
 * 指令测试 - 清理测试数据
 *
 * 测试内容：
 * - 删除测试创建的指令
 * - 删除测试 Channel
 * - 删除测试 Project（级联删除 Channel）
 * - 删除测试 Organization（级联删除所有）
 * - 清除测试上下文文件
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/06-directive-指令测试/99-cleanup.ts
 */

import { rmSync } from 'node:fs';
import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
  loginAsAdmin,
  TEST_CONTEXT_FILE,
} from '../_shared';

const logger = createTestLogger('Directive:99-Cleanup');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🧹 指令测试 - 清理测试数据');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();

    logger.info('\n🔍 读取测试上下文...');
    logger.info('-'.repeat(60));
    logger.info(`Organization ID: ${ctx.organizationId ?? '(无)'}`);
    logger.info(`Project ID: ${ctx.projectId ?? '(无)'}`);
    logger.info(`Channel ID: ${ctx.channelId ?? '(无)'}`);
    logger.info(`Directive ID: ${ctx.directiveId ?? '(无)'}`);
    logger.info(`Update IDs: ${ctx.updateIds?.join(', ') ?? '(无)'}`);

    // 尝试登录
    let client;
    try {
      const loginResult = await loginAsAdmin(logger);
      client = loginResult.client;
    } catch {
      logger.warn('⚠️ 无法登录，尝试使用保存的 token');
      if (ctx.accessToken) {
        client = createClient(API_URL, { token: ctx.accessToken });
      } else {
        logger.warn('⚠️ 没有可用的认证信息，跳过 API 清理');
      }
    }

    if (client) {
      const manage = getManageApi(client);

      // 1. 删除指令
      if (ctx.directiveId) {
        logger.info('\n🗑️ 删除测试指令...');
        try {
          await manage.directives.delete.mutate({
            id: ctx.directiveId,
          });
          logger.info(`✅ 指令 ${ctx.directiveId} 已删除`);
        } catch (error) {
          logger.warn(`⚠️ 删除指令失败: ${error}`);
        }
      }

      // 2. 删除 Channel（会级联删除关联的更新和指令）
      if (ctx.channelId) {
        logger.info('\n🗑️ 删除测试 Channel...');
        try {
          await manage.channels.delete.mutate({ id: ctx.channelId });
          logger.info(`✅ Channel ${ctx.channelId} 已删除`);
        } catch (error) {
          logger.warn(`⚠️ 删除 Channel 失败: ${error}`);
        }
      }

      // 3. 删除 Project
      if (ctx.projectId) {
        logger.info('\n🗑️ 删除测试 Project...');
        try {
          await manage.projects.delete.mutate({ id: ctx.projectId });
          logger.info(`✅ Project ${ctx.projectId} 已删除`);
        } catch (error) {
          logger.warn(`⚠️ 删除 Project 失败: ${error}`);
        }
      }

      // 4. 删除 Organization
      if (ctx.organizationId) {
        logger.info('\n🗑️ 删除测试 Organization...');
        try {
          await manage.organizations.delete.mutate({
            id: ctx.organizationId,
          });
          logger.info(`✅ Organization ${ctx.organizationId} 已删除`);
        } catch (error) {
          logger.warn(`⚠️ 删除 Organization 失败: ${error}`);
        }
      }
    }

    // 5. 清除测试上下文文件
    logger.info('\n🧹 清除测试上下文文件...');
    try {
      rmSync(TEST_CONTEXT_FILE, { force: true });
      logger.info('✅ 上下文文件已删除');
    } catch {
      logger.warn('⚠️ 上下文文件删除失败（可能不存在）');
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 清理完成！');
    logger.info('='.repeat(60));

    logger.info('\n📊 清理结果:');
    logger.info('  - 测试指令已清理');
    logger.info('  - 测试渠道已清理');
    logger.info('  - 测试项目已清理');
    logger.info('  - 测试组织已清理');
    logger.info('  - 测试上下文已清理');
  } catch (error) {
    logger.error('❌ 清理失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('清理执行失败:', err);
  process.exit(1);
});
