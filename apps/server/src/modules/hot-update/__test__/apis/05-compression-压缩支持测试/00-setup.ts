/**
 * 压缩支持测试 - 步骤 00: 初始化测试环境
 *
 * 测试内容：
 * - 登录管理员账户
 * - 创建测试组织
 * - 创建测试项目
 * - 创建测试渠道
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/05-compression-压缩支持测试/00-setup.ts
 */

import {
  createTestLogger,
  getManageApi,
  loginAsAdmin,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Compression:00-Setup');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🗜️ 压缩支持测试 - 步骤 00: 初始化测试环境');
  logger.info('='.repeat(60));

  try {
    // 1. 管理员登录
    logger.info('\n📝 步骤 1: 管理员登录');
    logger.info('-'.repeat(60));

    const { accessToken, client } = await loginAsAdmin(logger);

    // 2. 创建测试组织
    logger.info('\n📝 步骤 2: 创建测试组织');
    logger.info('-'.repeat(60));

    const manage = getManageApi(client);

    let organizationId: string;
    try {
      const org = await manage.organizations.create.mutate({
        name: 'Compression Test Org',
        slug: 'compression-test',
        description: '压缩支持测试组织',
      });
      organizationId = org.id;
      logger.info('✅ 测试组织已创建', { id: organizationId });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('已存在')
      ) {
        const org = await manage.organizations.bySlug.query({
          slug: 'compression-test',
        });
        if (!org) throw new Error('组织不存在');
        organizationId = org.id;
        logger.info('ℹ️  使用现有组织', { id: organizationId });
      } else {
        throw error;
      }
    }

    // 3. 创建测试项目
    logger.info('\n📝 步骤 3: 创建测试项目');
    logger.info('-'.repeat(60));

    let projectId: string;
    try {
      const project = await manage.projects.create.mutate({
        organizationId,
        name: 'Compression Test App',
        slug: 'compression-app',
        description: '压缩支持测试应用',
      });
      projectId = project.id;
      logger.info('✅ 测试项目已创建', { id: projectId });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('已存在')
      ) {
        const project = await manage.projects.bySlug.query({
          organizationId,
          slug: 'compression-app',
        });
        if (!project) throw new Error('项目不存在');
        projectId = project.id;
        logger.info('ℹ️  使用现有项目', { id: projectId });
      } else {
        throw error;
      }
    }

    // 4. 创建测试渠道
    logger.info('\n📝 步骤 4: 创建测试渠道');
    logger.info('-'.repeat(60));

    let channelId: string;
    let channelKey: string;
    try {
      const existingChannels =
        await manage.channels.listByProject.query({
          projectId,
        });
      const existingChannel = existingChannels.find(
        c => c.name === 'compression-production'
      );

      if (existingChannel) {
        channelId = existingChannel.id;
        channelKey = existingChannel.channelKey;
        logger.info('ℹ️  使用现有渠道', {
          id: channelId,
          key: channelKey,
        });
      } else {
        const channel = await manage.channels.create.mutate({
          projectId,
          name: 'compression-production',
          description: '压缩支持测试渠道',
        });
        channelId = channel.id;
        channelKey = channel.channelKey;
        logger.info('✅ 测试渠道已创建', {
          id: channelId,
          key: channelKey,
        });
      }
    } catch (error) {
      throw error;
    }

    // 5. 保存测试上下文
    await saveTestContext({
      accessToken,
      organizationId,
      projectId,
      channelId,
      channelKey,
      updateIds: [],
    });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 环境初始化完成！');
    logger.info('='.repeat(60));
    logger.info('\n✅ 测试上下文已保存:');
    logger.info(`  - Organization ID: ${organizationId}`);
    logger.info(`  - Project ID: ${projectId}`);
    logger.info(`  - Channel ID: ${channelId}`);
    logger.info(`  - Channel Key: ${channelKey}`);

    logger.info('\n💡 提示: 现在可以上传资源');
  } catch (error) {
    logger.error('❌ 初始化失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
